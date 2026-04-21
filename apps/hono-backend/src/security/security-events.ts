import { TalakWeb3Error } from '@talak-web3/errors';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Security Event Pipeline with SIEM Integration
// ---------------------------------------------------------------------------

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  details: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    wallet?: string;
    requestId?: string;
    sessionId?: string;
    environment: string;
  };
}

export type SecurityEventType = 
  | 'auth_success'
  | 'auth_failure'
  | 'auth_locked'
  | 'rate_limit_hit'
  | 'suspicious_activity'
  | 'key_rotation'
  | 'system_error'
  | 'data_breach_attempt'
  | 'privilege_escalation'
  | 'configuration_change'
  | 'security_audit';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventSink {
  name: string;
  send(event: SecurityEvent): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
}

// ---------------------------------------------------------------------------
// Elasticsearch / OpenSearch Sink
// ---------------------------------------------------------------------------

export class ElasticsearchSink implements SecurityEventSink {
  name = 'elasticsearch';
  
  constructor(
    private config: {
      url: string;
      index: string;
      username?: string;
      password?: string;
      apiKey?: string;
    }
  ) {}

  async send(event: SecurityEvent): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `ApiKey ${this.config.apiKey}`;
      } else if (this.config.username && this.config.password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`;
      }

      const response = await fetch(`${this.config.url}/${this.config.index}/_doc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          '@timestamp': new Date(event.timestamp).toISOString(),
          ...event,
        }),
      });

      if (!response.ok) {
        throw new Error(`Elasticsearch indexing failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('[SECURITY_EVENTS] Failed to send event to Elasticsearch:', err);
      throw err;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `ApiKey ${this.config.apiKey}`;
      } else if (this.config.username && this.config.password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`;
      }

      const response = await fetch(`${this.config.url}/_cluster/health`, { headers });
      if (response.ok) {
        const health = await response.json();
        return { healthy: health.status === 'green' || health.status === 'yellow' };
      }
      return { healthy: false, message: 'Elasticsearch health check failed' };
    } catch (err) {
      return { healthy: false, message: `Elasticsearch connection failed: ${err}` };
    }
  }
}

// ---------------------------------------------------------------------------
// Splunk Sink
// ---------------------------------------------------------------------------

export class SplunkSink implements SecurityEventSink {
  name = 'splunk';
  
  constructor(
    private config: {
      url: string;
      token: string;
      index?: string;
      source?: string;
      sourcetype?: string;
    }
  ) {}

  async send(event: SecurityEvent): Promise<void> {
    try {
      const payload = {
        time: Math.floor(event.timestamp / 1000),
        index: this.config.index || 'security_events',
        source: this.config.source || 'talak-web3',
        sourcetype: this.config.sourcetype || 'json',
        event: event,
      };

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Splunk indexing failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('[SECURITY_EVENTS] Failed to send event to Splunk:', err);
      throw err;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.config.url}/services/server/control`, {
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
        },
      });

      return { healthy: response.ok };
    } catch (err) {
      return { healthy: false, message: `Splunk connection failed: ${err}` };
    }
  }
}

// ---------------------------------------------------------------------------
// Generic HTTP/SIEM Sink
// ---------------------------------------------------------------------------

export class HttpSiemSink implements SecurityEventSink {
  name = 'http-siem';
  
  constructor(
    private config: {
      url: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ) {}

  async send(event: SecurityEvent): Promise<void> {
    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout ?? 10000),
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`SIEM HTTP endpoint failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('[SECURITY_EVENTS] Failed to send event to SIEM:', err);
      throw err;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const response = await fetch(this.config.url, {
        method: 'HEAD',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000),
      });

      return { healthy: response.ok };
    } catch (err) {
      return { healthy: false, message: `SIEM HTTP endpoint failed: ${err}` };
    }
  }
}

// ---------------------------------------------------------------------------
// Security Event Manager
// ---------------------------------------------------------------------------

export class SecurityEventManager {
  private sinks: SecurityEventSink[] = [];
  private eventBuffer: SecurityEvent[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;

  constructor(options: {
    bufferSize?: number;
    flushInterval?: number;
  } = {}) {
    this.bufferSize = options.bufferSize ?? 100;
    this.flushInterval = options.flushInterval ?? 5000; // 5 seconds
    
    // Start flush timer
    this.startFlushTimer();
  }

  addSink(sink: SecurityEventSink): void {
    this.sinks.push(sink);
  }

  removeSink(name: string): void {
    this.sinks = this.sinks.filter(sink => sink.name !== name);
  }

  async emitEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      ...event,
    };

    this.eventBuffer.push(fullEvent);

    // Flush immediately for critical events
    if (event.severity === 'critical') {
      await this.flushEvents();
    } else if (this.eventBuffer.length >= this.bufferSize) {
      await this.flushEvents();
    }
  }

  async emitAuthSuccess(metadata: SecurityEvent['metadata'], details?: Record<string, any>): Promise<void> {
    await this.emitEvent({
      type: 'auth_success',
      severity: 'low',
      source: 'auth-service',
      details: details ?? {},
      metadata,
    });
  }

  async emitAuthFailure(metadata: SecurityEvent['metadata'], reason: string, details?: Record<string, any>): Promise<void> {
    await this.emitEvent({
      type: 'auth_failure',
      severity: 'medium',
      source: 'auth-service',
      details: { reason, ...details },
      metadata,
    });
  }

  async emitRateLimitHit(metadata: SecurityEvent['metadata'], limitType: string, penalties?: string[]): Promise<void> {
    await this.emitEvent({
      type: 'rate_limit_hit',
      severity: 'medium',
      source: 'rate-limiter',
      details: { limitType, penalties },
      metadata,
    });
  }

  async emitSuspiciousActivity(metadata: SecurityEvent['metadata'], patterns: string[], riskScore: number): Promise<void> {
    await this.emitEvent({
      type: 'suspicious_activity',
      severity: riskScore > 0.7 ? 'high' : 'medium',
      source: 'rate-limiter',
      details: { patterns, riskScore },
      metadata,
    });
  }

  async emitSystemError(metadata: SecurityEvent['metadata'], error: Error, context?: Record<string, any>): Promise<void> {
    await this.emitEvent({
      type: 'system_error',
      severity: 'high',
      source: 'system',
      details: {
        error: error.message,
        stack: error.stack,
        context,
      },
      metadata,
    });
  }

  async emitKeyRotation(metadata: SecurityEvent['metadata'], oldKeyId: string, newKeyId: string): Promise<void> {
    await this.emitEvent({
      type: 'key_rotation',
      severity: 'high',
      source: 'key-management',
      details: { oldKeyId, newKeyId },
      metadata,
    });
  }

  async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    const promises = events.map(event => this.sendToSinks(event));
    await Promise.allSettled(promises);
  }

  private async sendToSinks(event: SecurityEvent): Promise<void> {
    const promises = this.sinks.map(sink => 
      sink.send(event).catch(err => 
        console.error(`[SECURITY_EVENTS] Sink ${sink.name} failed:`, err)
      )
    );
    await Promise.allSettled(promises);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch(err => 
        console.error('[SECURITY_EVENTS] Flush timer failed:', err)
      );
    }, this.flushInterval);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${randomBytes(6).toString('hex')}`;
  }

  async healthCheck(): Promise<{ healthy: boolean; sinks: Record<string, { healthy: boolean; message?: string }> }> {
    const results: Record<string, { healthy: boolean; message?: string }> = {};
    
    for (const sink of this.sinks) {
      try {
        results[sink.name] = await sink.healthCheck();
      } catch (err) {
        results[sink.name] = { healthy: false, message: `Health check failed: ${err}` };
      }
    }

    const healthy = Object.values(results).every(result => result.healthy);
    return { healthy, sinks: results };
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushEvents();
  }
}

// ---------------------------------------------------------------------------
// Security Event Detector
// ---------------------------------------------------------------------------

export class SecurityEventDetector {
  constructor(private eventManager: SecurityEventManager) {}

  detectAuthFailures(metadata: SecurityEvent['metadata'], recentFailures: number): void {
    if (recentFailures >= 5) {
      this.eventManager.emitSuspiciousActivity(metadata, ['repeated_auth_failures'], 0.8);
    }
  }

  detectRateLimitAbuse(metadata: SecurityEvent['metadata'], hitsInMinute: number): void {
    if (hitsInMinute >= 20) {
      this.eventManager.emitSuspiciousActivity(metadata, ['rate_limit_abuse'], 0.9);
    }
  }

  detectUnusualAccessPatterns(metadata: SecurityEvent['metadata'], patterns: {
    multipleUserAgents: boolean;
    rapidRequests: boolean;
    walletHopping: boolean;
  }): void {
    const activePatterns = Object.entries(patterns)
      .filter(([, active]) => active)
      .map(([pattern]) => pattern);

    if (activePatterns.length >= 2) {
      this.eventManager.emitSuspiciousActivity(metadata, activePatterns, 0.7);
    }
  }

  detectPotentialAttack(metadata: SecurityEvent['metadata'], attackVectors: string[]): void {
    this.eventManager.emitSuspiciousActivity(metadata, attackVectors, 0.9);
  }
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

export function createSecurityEventManager(sinks: SecurityEventSink[] = []): SecurityEventManager {
  const manager = new SecurityEventManager();
  sinks.forEach(sink => manager.addSink(sink));
  return manager;
}

export function createElasticsearchSink(config: SecurityEventSinkConfig): SecurityEventSink {
  if (config.type === 'elasticsearch') {
    return new ElasticsearchSink(config);
  }
  throw new Error('Invalid configuration for Elasticsearch sink');
}

export function createSplunkSink(config: SecurityEventSinkConfig): SecurityEventSink {
  if (config.type === 'splunk') {
    return new SplunkSink(config);
  }
  throw new Error('Invalid configuration for Splunk sink');
}

export function createHttpSiemSink(config: SecurityEventSinkConfig): SecurityEventSink {
  if (config.type === 'http') {
    return new HttpSiemSink(config);
  }
  throw new Error('Invalid configuration for HTTP SIEM sink');
}

export type SecurityEventSinkConfig = (
  | { type: 'elasticsearch'; url: string; index: string; username?: string; password?: string; apiKey?: string }
  | { type: 'splunk'; url: string; token: string; index?: string; source?: string; sourcetype?: string }
  | { type: 'http'; url: string; headers?: Record<string, string>; timeout?: number }
);
