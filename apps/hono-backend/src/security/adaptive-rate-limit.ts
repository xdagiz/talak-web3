import type { MiddlewareHandler } from 'hono';
import type { RedisClientType } from 'redis';
import { TalakWeb3Error } from '@talak-web3/errors';

export interface AdaptiveRateLimitConfig {

  baseLimits: {
    global: { capacity: number; refillPerSecond: number };
    auth: { capacity: number; refillPerSecond: number };
    rpc: { capacity: number; refillPerSecond: number };
    nonce: { capacity: number; refillPerSecond: number };
  };

  penalties: {
    authFailure: { ipPenalty: number; walletPenalty: number };
    rateLimitHit: { multiplier: number };
    suspiciousActivity: { ipPenalty: number; walletPenalty: number };
  };

  correlation: {
    enableIpWalletCorrelation: boolean;
    maxWalletsPerIp: number;
    maxIpsPerWallet: number;
    correlationWindowMs: number;
  };

  burstProtection: {
    enabled: boolean;
    maxBurstSize: number;
    burstDecayRate: number;
  };
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveRateLimitConfig = {
  baseLimits: {
    global: { capacity: 1000, refillPerSecond: 16.67 },
    auth: { capacity: 20, refillPerSecond: 0.33 },
    rpc: { capacity: 100, refillPerSecond: 1.67 },
    nonce: { capacity: 10, refillPerSecond: 0.17 },
  },
  penalties: {
    authFailure: { ipPenalty: 5, walletPenalty: 3 },
    rateLimitHit: { multiplier: 1.5 },
    suspiciousActivity: { ipPenalty: 10, walletPenalty: 8 },
  },
  correlation: {
    enableIpWalletCorrelation: true,
    maxWalletsPerIp: 10,
    maxIpsPerWallet: 5,
    correlationWindowMs: 5 * 60 * 1000,
  },
  burstProtection: {
    enabled: true,
    maxBurstSize: 50,
    burstDecayRate: 0.1,
  },
};

export class AdaptiveRateLimiter {
  constructor(
    private redis: RedisClientType,
    private config: AdaptiveRateLimitConfig = DEFAULT_ADAPTIVE_CONFIG
  ) {}

  async checkRateLimit(params: {
    type: keyof AdaptiveRateLimitConfig['baseLimits'];
    ip: string;
    wallet?: string;
    cost?: number;
    userAgent?: string;
  }): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime?: number;
    penalties?: string[];
    riskScore?: number;
  }> {
    const { type, ip, wallet, cost = 1, userAgent } = params;
    const penalties: string[] = [];
    let totalRiskScore = 0;

    const globalResult = await this.checkTokenBucket(
      `rl:global:ip:${ip}`,
      this.config.baseLimits.global,
      cost
    );
    if (!globalResult.allowed) {
      penalties.push('global_ip_limit');
      totalRiskScore += 0.3;
    }

    const typeResult = await this.checkTokenBucket(
      `rl:${type}:ip:${ip}`,
      this.config.baseLimits[type],
      cost
    );
    if (!typeResult.allowed) {
      penalties.push(`${type}_ip_limit`);
      totalRiskScore += 0.4;
    }

    let walletResult = { allowed: true, remaining: 0 };
    if (wallet) {
      walletResult = await this.checkTokenBucket(
        `rl:${type}:wallet:${wallet}`,
        this.config.baseLimits[type],
        cost
      );
      if (!walletResult.allowed) {
        penalties.push(`${type}_wallet_limit`);
        totalRiskScore += 0.5;
      }

      if (this.config.correlation.enableIpWalletCorrelation) {
        const correlationResult = await this.checkIpWalletCorrelation(ip, wallet);
        if (!correlationResult.allowed) {
          penalties.push('ip_wallet_correlation');
          totalRiskScore += 0.6;
        }
      }
    }

    if (this.config.burstProtection.enabled) {
      const burstResult = await this.checkBurstProtection(ip, cost);
      if (!burstResult.allowed) {
        penalties.push('burst_protection');
        totalRiskScore += 0.7;
      }
    }

    const suspiciousResult = await this.checkSuspiciousPatterns(ip, wallet, userAgent);
    if (suspiciousResult.isSuspicious) {
      penalties.push('suspicious_pattern');
      totalRiskScore += suspiciousResult.riskScore;
    }

    if (totalRiskScore > 0.8) {
      await this.applyAdaptivePenalty(ip, wallet, 'high_risk', totalRiskScore);
    }

    const allowed = globalResult.allowed && typeResult.allowed && walletResult.allowed;
    const remaining = Math.min(globalResult.remaining, typeResult.remaining, walletResult.remaining);

    return {
      allowed,
      remaining,
      penalties: penalties.length > 0 ? penalties : undefined,
      riskScore: totalRiskScore > 0 ? totalRiskScore : undefined,
    };
  }

  async applyAuthFailurePenalty(ip: string, wallet?: string): Promise<void> {
    await Promise.all([
      this.applyPenalty(`rl:auth:ip:${ip}`, this.config.penalties.authFailure.ipPenalty),
      wallet ? this.applyPenalty(`rl:auth:wallet:${wallet}`, this.config.penalties.authFailure.walletPenalty) : Promise.resolve(),
    ]);

    await this.trackFailurePattern(ip, wallet, 'auth_failure');
  }

  async applyRateLimitPenalty(ip: string, wallet?: string, limitType: string = 'global'): Promise<void> {
    const penalty = Math.floor(cost * this.config.penalties.rateLimitHit.multiplier);
    await this.applyPenalty(`rl:${limitType}:ip:${ip}`, penalty);

    if (wallet) {
      await this.applyPenalty(`rl:${limitType}:wallet:${wallet}`, Math.floor(penalty * 0.7));
    }
  }

  private async checkIpWalletCorrelation(ip: string, wallet: string): Promise<{ allowed: boolean }> {
    const window = this.config.correlation.correlationWindowMs;
    const now = Date.now();

    const ipWalletsKey = `correlation:ip:${ip}:wallets`;
    const walletIpsKey = `correlation:wallet:${wallet}:ips`;

    const [ipWallets, walletIps] = await Promise.all([
      this.getRecentItems(ipWalletsKey, now, window),
      this.getRecentItems(walletIpsKey, now, window),
    ]);

    if (ipWallets.size >= this.config.correlation.maxWalletsPerIp) {
      return { allowed: false };
    }

    if (walletIps.size >= this.config.correlation.maxIpsPerWallet) {
      return { allowed: false };
    }

    await Promise.all([
      this.recordItem(ipWalletsKey, wallet, now),
      this.recordItem(walletIpsKey, ip, now),
    ]);

    return { allowed: true };
  }

  private async checkBurstProtection(ip: string, cost: number): Promise<{ allowed: boolean }> {
    const burstKey = `burst:ip:${ip}`;
    const now = Date.now();
    const window = 60000;

    const requests = await this.getRecentItems(burstKey, now, window);
    const totalRequests = Array.from(requests).reduce((sum, timestamp) => sum + 1, 0);

    if (totalRequests + cost > this.config.burstProtection.maxBurstSize) {
      return { allowed: false };
    }

    await this.recordItem(burstKey, `req_${now}_${Math.random()}`, now);

    return { allowed: true };
  }

  private async checkSuspiciousPatterns(ip: string, wallet?: string, userAgent?: string): Promise<{
    isSuspicious: boolean;
    riskScore: number;
    patterns: string[];
  }> {
    const patterns: string[] = let riskScore = 0;
    const now = Date.now();

    const rapidKey = `patterns:rapid:${ip}`;
    const recentRequests = await this.getRecentItems(rapidKey, now, 10000);
    if (recentRequests.size > 20) {
      patterns.push('rapid_requests');
      riskScore += 0.3;
    }

    if (userAgent) {
      const uaKey = `patterns:ua:${ip}`;
      const userAgents = await this.getRecentItems(uaKey, now, 300000);
      if (userAgents.size > 5) {
        patterns.push('multiple_user_agents');
        riskScore += 0.2;
      }
      await this.recordItem(uaKey, this.hashUserAgent(userAgent), now);
    }

    if (wallet) {
      const walletHoppingKey = `patterns:hop:${ip}`;
      const wallets = await this.getRecentItems(walletHoppingKey, now, 600000);
      if (wallets.size > 8) {
        patterns.push('wallet_hopping');
        riskScore += 0.4;
      }
      await this.recordItem(walletHoppingKey, wallet, now);
    }

    return {
      isSuspicious: patterns.length > 0,
      riskScore,
      patterns,
    };
  }

  private async getRecentItems(key: string, now: number, windowMs: number): Promise<Set<string>> {
    const minScore = now - windowMs;
    try {
      const items = await this.redis.zRange(key, minScore, now, { BY: 'SCORE' });
      return new Set(items);
    } catch {
      return new Set();
    }
  }

  private async recordItem(key: string, value: string, timestamp: number): Promise<void> {
    try {
      await this.redis.zAdd(key, { score: timestamp, value });
      await this.redis.expire(key, 3600);
    } catch (err) {
      console.error('[RATE_LIMIT] Failed to record item:', err);
    }
  }

  private async trackFailurePattern(ip: string, wallet: string | undefined, type: string): Promise<void> {
    const patternKey = `patterns:failures:${type}`;
    const now = Date.now();

    await this.redis.zAdd(patternKey, { score: now, value: `${ip}:${wallet || 'anonymous'}:${now}` });
    await this.redis.expire(patternKey, 86400);
  }

  private async applyAdaptivePenalty(ip: string, wallet: string | undefined, type: string, riskScore: number): Promise<void> {
    const penaltyMultiplier = Math.ceil(riskScore * 10);
    const penalty = penaltyMultiplier * 5;

    await Promise.all([
      this.applyPenalty(`rl:adaptive:ip:${ip}`, penalty),
      wallet ? this.applyPenalty(`rl:adaptive:wallet:${wallet}`, Math.floor(penalty * 0.7)) : Promise.resolve(),
    ]);
  }

  private async applyPenalty(key: string, cost: number): Promise<void> {
    try {
      const now = Date.now();
      const windowMs = 60000;

      for (let i = 0; i < cost; i++) {
        await this.redis.zAdd(key, { score: now, value: `penalty_${now}_${i}_${Math.random()}` });
      }
      await this.redis.expire(key, windowMs);
    } catch (err) {
      console.error('[RATE_LIMIT] Failed to apply penalty:', err);
    }
  }

  private async checkTokenBucket(
    key: string,
    config: { capacity: number; refillPerSecond: number },
    cost: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const windowMs = (config.capacity / config.refillPerSecond) * 1000;
    const now = Date.now();

    const lua = `
      local key = KEYS[1]
      local windowMs = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local cost = tonumber(ARGV[4])
      local windowStart = now - windowMs

      -- Remove old entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

      local currentCount = redis.call('ZCARD', key)
      local allowed = 0
      local remaining = capacity - currentCount

      if (currentCount + cost) <= capacity then
        allowed = 1
        for i=1,cost do
          redis.call('ZADD', key, now, now .. ":" .. i .. ":" .. math.random())
        end
        remaining = capacity - (currentCount + cost)
      end

      redis.call('PEXPIRE', key, windowMs)

      return { allowed, remaining }
    `;

    try {
      const res = await this.redis.eval(lua, {
        keys: [key],
        arguments: [String(windowMs), String(config.capacity), String(now), String(cost)],
      }) as unknown;

      if (!Array.isArray(res) || res.length < 2) {
        return { allowed: false, remaining: 0 };
      }

      const allowed = Number(res[0]) === 1;
      const remaining = Math.max(0, Number(res[1]));
      return { allowed, remaining };
    } catch (err) {
      console.error('[RATE_LIMIT] Token bucket check failed:', err);
      return { allowed: false, remaining: 0 };
    }
  }

  private hashUserAgent(userAgent: string): string {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 16);
  }
}

export function createAdaptiveRateLimitMiddleware(
  rateLimiter: AdaptiveRateLimiter,
  options: {
    type: keyof AdaptiveRateLimitConfig['baseLimits'];
    extractWallet?: (c: any) => string | undefined;
  }
): MiddlewareHandler {
  return async (c, next) => {
    const ip = getIp(c);
    const wallet = options.extractWallet?.(c);
    const userAgent = c.req.header('user-agent');

    const result = await rateLimiter.checkRateLimit({
      type: options.type,
      ip,
      wallet,
      userAgent,
    });

    if (!result.allowed) {

      console.warn('[RATE_LIMIT] Rate limit exceeded', {
        ip,
        wallet,
        type: options.type,
        penalties: result.penalties,
        riskScore: result.riskScore,
      });

      await rateLimiter.applyRateLimitPenalty(ip, wallet, options.type);

      c.header('Retry-After', '60');
      return c.json({
        error: 'Rate limit exceeded',
        penalties: result.penalties,
        riskScore: result.riskScore,
      }, 429);
    }

    c.header('X-RateLimit-Remaining', String(result.remaining));
    if (result.resetTime) {
      c.header('X-RateLimit-Reset', String(result.resetTime));
    }

    await next();
  };
}

function getIp(c: any): string {
  return (c.req.header('x-forwarded-for') ?? c.req.raw.headers.get('cf-connecting-ip') ?? 'unknown').split(',')[0]?.trim() ?? 'unknown';
}
