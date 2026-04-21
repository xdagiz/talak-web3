import { register, Counter, Histogram, Gauge, Registry } from 'prom-client';

export class PrometheusMetrics {
  private registry: Registry;

  private authSuccessCounter: Counter<string>;
  private authFailureCounter: Counter<string>;
  private authDurationHistogram: Histogram<string>;
  private authActiveSessionsGauge: Gauge<string>;

  private rateLimitHitCounter: Counter<string>;
  private rateLimitPenaltyCounter: Counter<string>;
  private rateLimitActiveBucketsGauge: Gauge<string>;

  private securityEventCounter: Counter<string>;
  private suspiciousActivityCounter: Counter<string>;
  private securityRiskScoreGauge: Gauge<string>;

  private redisConnectionGauge: Gauge<string>;
  private jwtSigningDurationHistogram: Histogram<string>;
  private jwtVerificationDurationHistogram: Histogram<string>;

  private rpcRequestCounter: Counter<string>;
  private rpcErrorCounter: Counter<string>;
  private rpcDurationHistogram: Histogram<string>;

  constructor() {
    this.registry = new Registry();

    this.initAuthMetrics();
    this.initRateLimitMetrics();
    this.initSecurityMetrics();
    this.initSystemMetrics();
    this.initRpcMetrics();
  }

  private initAuthMetrics(): void {
    this.authSuccessCounter = new Counter({
      name: 'talak_auth_success_total',
      help: 'Total number of successful authentication attempts',
      labelNames: ['environment', 'method'],
      registers: [this.registry],
    });

    this.authFailureCounter = new Counter({
      name: 'talak_auth_failure_total',
      help: 'Total number of failed authentication attempts',
      labelNames: ['environment', 'method', 'reason'],
      registers: [this.registry],
    });

    this.authDurationHistogram = new Histogram({
      name: 'talak_auth_duration_seconds',
      help: 'Duration of authentication operations in seconds',
      labelNames: ['environment', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.authActiveSessionsGauge = new Gauge({
      name: 'talak_auth_active_sessions',
      help: 'Number of currently active authentication sessions',
      labelNames: ['environment'],
      registers: [this.registry],
    });
  }

  private initRateLimitMetrics(): void {
    this.rateLimitHitCounter = new Counter({
      name: 'talak_rate_limit_hit_total',
      help: 'Total number of rate limit violations',
      labelNames: ['environment', 'type', 'reason'],
      registers: [this.registry],
    });

    this.rateLimitPenaltyCounter = new Counter({
      name: 'talak_rate_limit_penalty_total',
      help: 'Total number of rate limit penalties applied',
      labelNames: ['environment', 'type', 'severity'],
      registers: [this.registry],
    });

    this.rateLimitActiveBucketsGauge = new Gauge({
      name: 'talak_rate_limit_active_buckets',
      help: 'Number of active rate limit buckets',
      labelNames: ['environment', 'type'],
      registers: [this.registry],
    });
  }

  private initSecurityMetrics(): void {
    this.securityEventCounter = new Counter({
      name: 'talak_security_event_total',
      help: 'Total number of security events',
      labelNames: ['environment', 'type', 'severity'],
      registers: [this.registry],
    });

    this.suspiciousActivityCounter = new Counter({
      name: 'talak_suspicious_activity_total',
      help: 'Total number of suspicious activities detected',
      labelNames: ['environment', 'pattern', 'risk_level'],
      registers: [this.registry],
    });

    this.securityRiskScoreGauge = new Gauge({
      name: 'talak_security_risk_score',
      help: 'Current security risk score (0-1)',
      labelNames: ['environment', 'source'],
      registers: [this.registry],
    });
  }

  private initSystemMetrics(): void {
    this.redisConnectionGauge = new Gauge({
      name: 'talak_redis_connection_status',
      help: 'Redis connection status (1=connected, 0=disconnected)',
      labelNames: ['environment', 'instance'],
      registers: [this.registry],
    });

    this.jwtSigningDurationHistogram = new Histogram({
      name: 'talak_jwt_signing_duration_seconds',
      help: 'Duration of JWT signing operations in seconds',
      labelNames: ['environment', 'key_id'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
      registers: [this.registry],
    });

    this.jwtVerificationDurationHistogram = new Histogram({
      name: 'talak_jwt_verification_duration_seconds',
      help: 'Duration of JWT verification operations in seconds',
      labelNames: ['environment', 'key_id'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
      registers: [this.registry],
    });
  }

  private initRpcMetrics(): void {
    this.rpcRequestCounter = new Counter({
      name: 'talak_rpc_request_total',
      help: 'Total number of RPC requests',
      labelNames: ['environment', 'chain_id', 'method', 'status'],
      registers: [this.registry],
    });

    this.rpcErrorCounter = new Counter({
      name: 'talak_rpc_error_total',
      help: 'Total number of RPC errors',
      labelNames: ['environment', 'chain_id', 'method', 'error_type'],
      registers: [this.registry],
    });

    this.rpcDurationHistogram = new Histogram({
      name: 'talak_rpc_duration_seconds',
      help: 'Duration of RPC requests in seconds',
      labelNames: ['environment', 'chain_id', 'method'],
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50],
      registers: [this.registry],
    });
  }

  recordAuthSuccess(method: string, duration: number): void {
    const labels = { environment: this.getEnvironment(), method };
    this.authSuccessCounter.inc(labels);
    this.authDurationHistogram.observe(labels, duration / 1000);
  }

  recordAuthFailure(method: string, reason: string, duration: number): void {
    const labels = { environment: this.getEnvironment(), method, reason };
    this.authFailureCounter.inc(labels);
    this.authDurationHistogram.observe(labels, duration / 1000);
  }

  setActiveSessions(count: number): void {
    this.authActiveSessionsGauge.set({ environment: this.getEnvironment() }, count);
  }

  recordRateLimitHit(type: string, reason: string): void {
    this.rateLimitHitCounter.inc({ environment: this.getEnvironment(), type, reason });
  }

  recordRateLimitPenalty(type: string, severity: string): void {
    this.rateLimitPenaltyCounter.inc({ environment: this.getEnvironment(), type, severity });
  }

  setActiveRateLimitBuckets(type: string, count: number): void {
    this.rateLimitActiveBucketsGauge.set({ environment: this.getEnvironment(), type }, count);
  }

  recordSecurityEvent(type: string, severity: string): void {
    this.securityEventCounter.inc({ environment: this.getEnvironment(), type, severity });
  }

  recordSuspiciousActivity(pattern: string, riskLevel: string): void {
    this.suspiciousActivityCounter.inc({ environment: this.getEnvironment(), pattern, riskLevel });
  }

  setRiskScore(source: string, score: number): void {
    this.securityRiskScoreGauge.set({ environment: this.getEnvironment(), source }, score);
  }

  setRedisConnectionStatus(instance: string, connected: boolean): void {
    this.redisConnectionGauge.set({ environment: this.getEnvironment(), instance }, connected ? 1 : 0);
  }

  recordJwtSigning(keyId: string, duration: number): void {
    this.jwtSigningDurationHistogram.observe({ environment: this.getEnvironment(), key_id: keyId }, duration / 1000);
  }

  recordJwtVerification(keyId: string, duration: number): void {
    this.jwtVerificationDurationHistogram.observe({ environment: this.getEnvironment(), key_id: keyId }, duration / 1000);
  }

  recordRpcRequest(chainId: string, method: string, status: string, duration: number): void {
    const labels = { environment: this.getEnvironment(), chain_id: chainId, method, status };
    this.rpcRequestCounter.inc(labels);
    this.rpcDurationHistogram.observe(labels, duration / 1000);
  }

  recordRpcError(chainId: string, method: string, errorType: string): void {
    this.rpcErrorCounter.inc({ environment: this.getEnvironment(), chain_id: chainId, method, error_type: errorType });
  }

  getMetrics(): string {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  private getEnvironment(): string {
    return process.env['NODE_ENV'] ?? 'development';
  }

  reset(): void {
    this.registry.clear();
  }
}

export function createMetricsMiddleware(metrics: PrometheusMetrics) {
  return async (c: any, next: any) => {
    const start = Date.now();

    await next();

    const duration = Date.now() - start;
    const path = c.req.path;
    const method = c.req.method;
    const status = c.res.status;

    if (path.startsWith('/auth/')) {
      if (status >= 200 && status < 300) {
        metrics.recordAuthSuccess(method, duration);
      } else {
        metrics.recordAuthFailure(method, `http_${status}`, duration);
      }
    } else if (path.startsWith('/rpc/')) {
      const chainId = c.req.param('chainId') || 'unknown';
      const rpcMethod = c.get('rpcMethod') || 'unknown';

      if (status >= 200 && status < 300) {
        metrics.recordRpcRequest(chainId, rpcMethod, 'success', duration);
      } else {
        metrics.recordRpcError(chainId, rpcMethod, `http_${status}`);
      }
    }
  };
}

export class MetricsHealthChecker {
  constructor(private metrics: PrometheusMetrics) {}

  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: Record<string, any>;
  }> {
    const issues: string[] = [];
    const metricsData: Record<string, any> = {};

    try {

      const registry = this.metrics.getRegistry();
      const metricNames = registry.getMetricsAsJSON().map((m: any) => m.name);

      metricsData.total_metrics = metricNames.length;
      metricsData.metric_names = metricNames;

      const criticalMetrics = [
        'talak_auth_success_total',
        'talak_auth_failure_total',
        'talak_rate_limit_hit_total',
        'talak_security_event_total',
        'talak_redis_connection_status',
      ];

      const missingMetrics = criticalMetrics.filter(name => !metricNames.includes(name));
      if (missingMetrics.length > 0) {
        issues.push(`Missing critical metrics: ${missingMetrics.join(', ')}`);
      }

      const redisMetric = registry.getSingleMetric('talak_redis_connection_status');
      if (redisMetric) {
        const redisStatus = await redisMetric.get();
        if (redisStatus.values && redisStatus.values.length > 0) {
          const isConnected = redisStatus.values[0].value === 1;
          metricsData.redis_connected = isConnected;
          if (!isConnected) {
            issues.push('Redis connection is down');
          }
        }
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics: metricsData,
      };
    } catch (err) {
      issues.push(`Metrics health check failed: ${err}`);
      return {
        healthy: false,
        issues,
        metrics: metricsData,
      };
    }
  }
}

export const prometheusMetrics = new PrometheusMetrics();
