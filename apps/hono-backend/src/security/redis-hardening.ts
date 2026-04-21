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

  persistence: {
    appendOnly: boolean;
    appendFsync: 'always' | 'everysec' | 'no';
    saveSeconds: number[];
    saveChanges: number[];
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
  persistence: {

    appendOnly: true,
    appendFsync: 'everysec',

    saveSeconds: [60, 300],
    saveChanges: [100, 1000],
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
        issues.push('CRITICAL: Redis AUTH is not enabled - unauthenticated access detected');
        recommendations.push('Enable Redis AUTH with requirepass in redis.conf');
      } catch (err: any) {
        if (!err.message?.includes('NOAUTH')) {
          issues.push('Redis connection error');
        }

      }

      const info = await this.redis.info('server');
      const tlsPort = info.includes('tcp_port_tls:');
      if (!tlsPort) {
        issues.push('WARNING: Redis TLS port not detected');
        recommendations.push('Enable TLS with tls-port in redis.conf');
      }

      try {
        const aclList = await this.redis.aclList();
        if (aclList.length < 2) {
          issues.push('WARNING: No custom ACL users configured');
          recommendations.push('Configure ACL users with least-privilege access');
        }
      } catch {
        issues.push('WARNING: ACL commands not available (Redis < 6.0)');
      }

      const configMode = await this.redis.configGet('protected-mode');
      if (configMode['protected-mode'] === 'no') {
        issues.push('CRITICAL: Redis protected mode is disabled');
      }

      try {
        const defaultUser = await this.redis.aclGetUser('default');
        if (defaultUser && defaultUser.passwords && defaultUser.passwords.length === 0) {
          issues.push('CRITICAL: Default Redis user has no password');
        }
      } catch {

      }

      const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
      if (versionMatch && versionMatch[1]) {
        const version = versionMatch[1];
        const [major] = version.split('.').map(Number);
        if (major && major < 6) {
          issues.push(`Redis version ${version} is outdated`);
          recommendations.push('Upgrade to Redis 6.0+ for better security features');
        }
      }

      const memoryInfo = await this.redis.info('memory');
      if (!memoryInfo.includes('maxmemory:')) {
        issues.push('WARNING: Redis maxmemory not set');
        recommendations.push('Set maxmemory limit to prevent DoS attacks');
      }

      const configPolicy = await this.redis.configGet('maxmemory-policy');
      if (configPolicy['maxmemory-policy'] !== 'noeviction') {
        issues.push(`WARNING: Redis eviction policy is ${configPolicy['maxmemory-policy']} instead of noeviction`);
        recommendations.push('Set maxmemory-policy to noeviction for critical auth data');
      }

      const aofConfig = await this.redis.configGet('appendonly');
      if (aofConfig['appendonly'] !== 'yes') {
        issues.push('WARNING: Redis AOF persistence is disabled - nonce data may be lost on restart');
        recommendations.push('Enable AOF with "appendonly yes" in redis.conf for nonce durability');
      }

      const fsyncConfig = await this.redis.configGet('appendfsync');
      if (fsyncConfig['appendfsync'] === 'no') {
        issues.push('WARNING: Redis AOF fsync is disabled - may lose data on crash');
        recommendations.push('Set appendfsync to "everysec" for balance of performance and durability');
      }

      return {
        status: issues.some(i => i.includes('CRITICAL')) ? 'critical' : issues.length > 0 ? 'warning' : 'secure',
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

      const evictionPolicy = await this.redis.configGet('maxmemory-policy');
      if (evictionPolicy['maxmemory-policy'] !== 'noeviction') {
        console.warn('[REDIS] maxmemory-policy is not set to noeviction - critical auth data may be evicted');
      }

      console.log('[REDIS] Security hardening applied successfully');
      console.log('[REDIS] NOTE: Command renaming must be configured in redis.conf, not at runtime');
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

    const dbNumber = this.config[db];
    if (dbNumber === undefined) {
      throw new TalakWeb3Error(`Invalid database selection: ${db}`, {
        code: 'REDIS_INVALID_DB',
        status: 500,
      });
    }

    await this.redis.select(dbNumber);

    try {
      return await callback();
    } finally {
      await this.redis.select(originalDb);
    }
  }
}
