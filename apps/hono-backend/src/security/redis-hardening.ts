import type { RedisClientType } from 'redis';
import { TalakWeb3Error } from '@talak-web3/errors';

export interface RedisHardeningConfig {

  auth: {
    enabled: boolean;
    password?: string;
  };

  tls: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
    caPath?: string;
  };

  connectionLimits: {
    maxConnections: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableOfflineQueue: boolean;
  };

  security: {
    disableCommands: string[];
    protectedMode: boolean;
    requireClientCert: boolean;
  };

  databases: {
    nonceDb: number;
    sessionDb: number;
    rateLimitDb: number;
    auditDb: number;
  };
}

export const DEFAULT_REDIS_HARDENING: RedisHardeningConfig = {
  auth: {
    enabled: true,
  },
  tls: {
    enabled: true,
  },
  connectionLimits: {
    maxConnections: 100,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
  },
  security: {
    disableCommands: ['FLUSHDB', 'FLUSHALL', 'CONFIG', 'DEBUG', 'EVAL', 'SCRIPT'],
    protectedMode: true,
    requireClientCert: false,
  },
  databases: {
    nonceDb: 0,
    sessionDb: 1,
    rateLimitDb: 2,
    auditDb: 3,
  },
};

export function createHardenedRedisClient(
  redisUrl: string,
  config: Partial<RedisHardeningConfig> = {}
): RedisClientType {
  const finalConfig = { ...DEFAULT_REDIS_HARDENING, ...config };

  if (!finalConfig.auth.enabled) {
    console.warn('[SECURITY] Redis AUTH is disabled - this is not recommended for production');
  }

  if (!finalConfig.tls.enabled) {
    console.warn('[SECURITY] Redis TLS is disabled - traffic will be unencrypted');
  }

  const url = new URL(redisUrl);
  const isSecure = url.protocol === 'rediss:' || finalConfig.tls.enabled;

  const clientOptions: any = {
    url: isSecure ? `rediss://${url.host}` : redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > 5) {
          console.error('[CRITICAL] Redis connection failed after 5 retries. Exiting.');
          process.exit(1);
        }
        return Math.min(retries * 500, 2000);
      },
      connectTimeout: 10000,
      lazyConnect: true,

      ...(finalConfig.tls.enabled && {
        tls: {
          rejectUnauthorized: true,
          ...(finalConfig.tls.certPath && { cert: require('fs').readFileSync(finalConfig.tls.certPath) }),
          ...(finalConfig.tls.keyPath && { key: require('fs').readFileSync(finalConfig.tls.keyPath) }),
          ...(finalConfig.tls.caPath && { ca: require('fs').readFileSync(finalConfig.tls.caPath) }),
        },
      }),
    },

    ...(finalConfig.connectionLimits.maxConnections && {
      maxConnections: finalConfig.connectionLimits.maxConnections,
    }),

    retry: {
      maxRetriesPerRequest: finalConfig.connectionLimits.maxRetriesPerRequest,
      retryDelayOnFailover: finalConfig.connectionLimits.retryDelayOnFailover,
    },

    offlineQueue: finalConfig.connectionLimits.enableOfflineQueue,
  };

  if (finalConfig.auth.enabled) {
    const password = finalConfig.auth.password || url.password || process.env['REDIS_PASSWORD'];
    if (!password) {
      throw new TalakWeb3Error(
        'Redis AUTH is enabled but no password provided',
        { code: 'REDIS_AUTH_MISSING', status: 500 }
      );
    }
    clientOptions.password = password;
  }

  return clientOptions as RedisClientType;
}

export class RedisSecurityAuditor {
  constructor(private redis: RedisClientType) {}

  async auditSecurity(): Promise<{
    status: 'secure' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {

      try {
        await this.redis.ping();
        issues.push('Redis AUTH is not properly configured');
        recommendations.push('Enable Redis AUTH with a strong password');
      } catch (err: any) {
        if (err.message?.includes('NOAUTH')) {

        } else {
          issues.push('Redis connection error');
          recommendations.push('Check Redis server configuration');
        }
      }

      const info = await this.redis.info('server');
      if (info.includes('redis_version:')) {

        const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          const version = versionMatch[1];
          const [major] = version.split('.').map(Number);
          if (major < 6) {
            issues.push(`Redis version ${version} is outdated`);
            recommendations.push('Upgrade to Redis 6.0+ for better security features');
          }
        }
      }

      const memoryInfo = await this.redis.info('memory');
      if (!memoryInfo.includes('maxmemory:')) {
        issues.push('Redis maxmemory not set');
        recommendations.push('Set maxmemory limit to prevent DoS attacks');
      }

      const configPolicy = await this.redis.configGet('maxmemory-policy');
      if (configPolicy['maxmemory-policy'] !== 'noeviction') {
        issues.push(`Redis eviction policy is ${configPolicy['maxmemory-policy']} instead of noeviction`);
        recommendations.push('Set maxmemory-policy to noeviction for critical auth data');
      }

      const configMode = await this.redis.configGet('protected-mode');
      if (configMode['protected-mode'] === 'no') {
        issues.push('Redis protected mode is disabled');
        recommendations.push('Enable Redis protected mode');
      }

      return {
        status: issues.length === 0 ? 'secure' : issues.length > 2 ? 'critical' : 'warning',
        issues,
        recommendations,
      };
    } catch (err) {
      return {
        status: 'critical',
        issues: ['Failed to audit Redis security'],
        recommendations: ['Check Redis connectivity and permissions'],
      };
    }
  }

  async applySecurityHardening(): Promise<void> {
    try {

      const commandsToDisable = [
        'FLUSHDB', 'FLUSHALL', 'CONFIG', 'DEBUG', 'EVAL', 'SCRIPT'
      ];

      for (const cmd of commandsToDisable) {
        try {
          await this.redis.configSet(`rename-command-${cmd}`, `_${cmd}_disabled`);
        } catch (err) {

          console.warn(`[REDIS] Could not disable command ${cmd}:`, err);
        }
      }

      const protectedMode = await this.redis.configGet('protected-mode');
      if (protectedMode['protected-mode'] === 'no') {
        await this.redis.configSet('protected-mode', 'yes');
        console.log('[REDIS] Enabled protected mode');
      }

      const maxmemory = await this.redis.configGet('maxmemory');
      if (maxmemory['maxmemory'] === '0') {

        await this.redis.configSet('maxmemory', '1073741824');
        console.log('[REDIS] Set maxmemory to 1GB');
      }

      console.log('[REDIS] Security hardening applied successfully');
    } catch (err) {
      console.error('[REDIS] Failed to apply security hardening:', err);
      throw new TalakWeb3Error('Redis security hardening failed', {
        code: 'REDIS_HARDENING_FAILED',
        status: 500,
        cause: err,
      });
    }
  }
}

export class RedisDatabaseSelector {
  constructor(
    private redis: RedisClientType,
    private config: RedisHardeningConfig['databases']
  ) {}

  async selectNonceDb(): Promise<void> {
    await this.redis.select(this.config.nonceDb);
  }

  async selectSessionDb(): Promise<void> {
    await this.redis.select(this.config.sessionDb);
  }

  async selectRateLimitDb(): Promise<void> {
    await this.redis.select(this.config.rateLimitDb);
  }

  async selectAuditDb(): Promise<void> {
    await this.redis.select(this.config.auditDb);
  }

  async inDatabase<T>(
    db: keyof RedisHardeningConfig['databases'],
    callback: () => Promise<T>
  ): Promise<T> {
    const originalDb = await this.redis.info('server').then(info => {
      const match = info.match(/db(\d+):/);
      return match ? parseInt(match[1]) : 0;
    });

    await this.redis.select(this.config[db]);

    try {
      return await callback();
    } finally {
      await this.redis.select(originalDb);
    }
  }
}
