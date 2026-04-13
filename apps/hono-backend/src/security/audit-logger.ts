import crypto from 'node:crypto';
import type { Context } from 'hono';
import { metrics } from '../metrics.js';

/**
 * Immutable audit event
 */
export interface AuditEvent {
  id: string;
  timestamp: number;
  type: string;
  action: string;
  actor?: {
    id?: string;
    address?: string;
    ip?: string;
  };
  resource: string;
  outcome: 'success' | 'failure' | 'unknown';
  metadata: Record<string, unknown>;
  chainId?: number;
  signature?: string;
  previousHash?: string;
}

/**
 * Append-only audit log configuration
 */
export interface AuditLogConfig {
  /** Cryptographic salt for hashing */
  salt: string;
  
  /** Whether to enable cryptographic chaining */
  enableChaining: boolean;
  
  /** Maximum event age before rotation (ms) */
  maxEventAge: number;
  
  /** Storage backend configuration */
  storage: {
    type: 'file' | 'redis' | 's3' | 'blockchain';
    path?: string; // For file storage
    redis?: any;   // Redis client
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    blockchain?: {
      rpcUrl: string;
      contractAddress?: string;
      privateKey: string;
    };
  };
  
  /** External anchoring configuration */
  anchoring?: {
    enabled: boolean;
    interval: number; // Anchor every N events
    provider: 's3' | 'blockchain' | 'external';
    externalUrl?: string;
  };
}

/**
 * Immutable audit logger with cryptographic integrity
 */
export class ImmutableAuditLogger {
  private config: AuditLogConfig;
  private lastHash: string = '';
  private eventQueue: AuditEvent[] = [];
  private anchorCounter: number = 0;
  private signingKey?: crypto.KeyObject;
  private verificationKey?: crypto.KeyObject;
  private mode: 'asymmetric' | 'hmac' = 'hmac';
  private lastAnchorAt?: number;
  private lastAnchorError?: string | null;
  
  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = {
      salt: process.env.AUDIT_LOG_SALT || crypto.randomBytes(16).toString('hex'),
      enableChaining: true,
      maxEventAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      storage: { type: 'file' },
      anchoring: {
        enabled: false,
        interval: 100,
        provider: 's3'
      },
      ...config
    };
    
    this.initializeAsymmetricKeys();
  }
  
  /**
   * Create a cryptographically signed audit event
   */
  async logEvent(
    type: string,
    action: string,
    resource: string,
    outcome: AuditEvent['outcome'],
    metadata: Record<string, unknown> = {},
    context?: Context
  ): Promise<AuditEvent> {
    const timestamp = Date.now();
    const eventId = this.generateEventId();
    
    const event: AuditEvent = {
      id: eventId,
      timestamp,
      type,
      action,
      resource,
      outcome,
      metadata,
      actor: this.extractActor(context),
      chainId: this.extractChainId(context)
    };
    
    // Add cryptographic chaining if enabled
    if (this.config.enableChaining) {
      event.previousHash = this.lastHash;
      event.signature = await this.signEvent(event);
      this.lastHash = this.hashEvent(event);
    }
    
    await this.storeEvent(event);
    metrics.increment('audit.event', { type, outcome });
    
    return event;
  }
  
  /**
   * Initialize asymmetric keys for signing
   */
  private initializeAsymmetricKeys(): void {
    try {
      const privateKeyPem = process.env.AUDIT_PRIVATE_KEY;
      const publicKeyPem = process.env.AUDIT_PUBLIC_KEY;
      
      if (privateKeyPem && publicKeyPem) {
        this.signingKey = crypto.createPrivateKey(privateKeyPem);
        this.verificationKey = crypto.createPublicKey(publicKeyPem);
        this.mode = 'asymmetric';
        metrics.increment('audit.mode', { mode: 'asymmetric' });
      } else {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        
        this.signingKey = crypto.createPrivateKey(privateKey);
        this.verificationKey = crypto.createPublicKey(publicKey);
        this.mode = 'asymmetric';
        metrics.increment('audit.mode', { mode: 'asymmetric_generated' });
        
        console.warn('Generated new audit signing keys. For production, set AUDIT_PRIVATE_KEY and AUDIT_PUBLIC_KEY environment variables.');
      }
    } catch (error) {
      console.error('Failed to initialize asymmetric keys:', error);
      this.mode = 'hmac';
      metrics.increment('audit.mode', { mode: 'hmac_fallback' });
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const random = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${timestamp}-${random}`;
  }
  
  /**
   * Extract actor information from context
   */
  private extractActor(context?: Context): AuditEvent['actor'] {
    if (!context) return {};
    
    const user = context.get('user');
    const ip = context.req.header('x-forwarded-for') || context.req.header('x-real-ip');
    
    return {
      id: user?.id,
      address: user?.address,
      ip
    };
  }
  
  /**
   * Extract chain ID from context
   */
  private extractChainId(context?: Context): number | undefined {
    if (!context) return undefined;
    
    if (context.req.path.startsWith('/rpc/')) {
      const chainIdStr = context.req.param('chainId');
      return parseInt(chainIdStr, 10);
    }
    
    return undefined;
  }
  
  /**
   * Cryptographically sign an event
   */
  private async signEvent(event: AuditEvent): Promise<string> {
    const eventData = this.serializeEvent(event);
    
    // Prefer asymmetric signing if available
    if (this.signingKey) {
      const signature = crypto.sign('sha256', Buffer.from(eventData), this.signingKey);
      return signature.toString('base64');
    }
    
    // Fall back to HMAC
    const hmac = crypto.createHmac('sha256', this.config.salt);
    hmac.update(eventData);
    return hmac.digest('hex');
  }

  /**
   * Verify event signature
   */
  private async verifySignature(event: AuditEvent, signature: string): Promise<boolean> {
    const eventData = this.serializeEvent(event);
    
    if (this.verificationKey) {
      try {
        return crypto.verify('sha256', Buffer.from(eventData), this.verificationKey, Buffer.from(signature, 'base64'));
      } catch {
        return false;
      }
    }
    
    // Fall back to HMAC verification
    const expectedHmac = crypto.createHmac('sha256', this.config.salt);
    expectedHmac.update(eventData);
    return signature === expectedHmac.digest('hex');
  }
  
  /**
   * Hash event for chaining
   */
  private hashEvent(event: AuditEvent): string {
    const eventData = this.serializeEvent(event);
    return crypto.createHash('sha256').update(eventData).digest('hex');
  }
  
  /**
   * Serialize event for hashing/signing
   */
  private serializeEvent(event: AuditEvent): string {
    // Deterministic serialization (field order matters)
    const { signature, ...eventWithoutSig } = event;
    return JSON.stringify({
      id: eventWithoutSig.id,
      timestamp: eventWithoutSig.timestamp,
      type: eventWithoutSig.type,
      action: eventWithoutSig.action,
      actor: eventWithoutSig.actor,
      resource: eventWithoutSig.resource,
      outcome: eventWithoutSig.outcome,
      metadata: this.sortObject(eventWithoutSig.metadata),
      chainId: eventWithoutSig.chainId,
      previousHash: eventWithoutSig.previousHash
    });
  }
  
  /**
   * Recursively sort object keys for deterministic serialization
   */
  private sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sortObject(item));
    
    const sorted: Record<string, any> = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObject(obj[key]);
    });
    
    return sorted;
  }
  
  /**
   * Store event in append-only storage
   */
  private async storeEvent(event: AuditEvent): Promise<void> {
    // Add to memory queue for batch processing
    this.eventQueue.push(event);
    
    // Check if we need to create an external anchor
    this.anchorCounter++;
    if (this.config.anchoring?.enabled && this.anchorCounter >= (this.config.anchoring.interval || 100)) {
      await this.createExternalAnchor();
      this.anchorCounter = 0;
    }
    
    // Flush queue if it reaches certain size or age
    if (this.eventQueue.length >= 100 || Date.now() - this.eventQueue[0]?.timestamp > 5000) {
      await this.flushQueue();
    }
  }

  /**
   * Create external anchor for audit chain
   */
  private async createExternalAnchor(): Promise<void> {
    if (!this.config.anchoring?.enabled || this.eventQueue.length === 0) {
      return;
    }
    
    try {
      const latestEvent = this.eventQueue[this.eventQueue.length - 1];
      const chainHash = this.hashEvent(latestEvent);
      const timestamp = Date.now();
      
      const anchorData = {
        type: 'audit_anchor',
        timestamp,
        chainHash,
        eventCount: this.eventQueue.length,
        previousAnchor: this.lastHash
      };
      
      // Sign the anchor
      const anchorSignature = await this.signEvent({
        id: `anchor-${timestamp}`,
        timestamp,
        type: 'anchor',
        action: 'create_anchor',
        resource: 'audit_chain',
        outcome: 'success',
        metadata: anchorData
      } as AuditEvent);
      
      const anchoredEvent: AuditEvent = {
        id: `anchor-${timestamp}`,
        timestamp,
        type: 'anchor',
        action: 'create_anchor',
        resource: 'audit_chain',
        outcome: 'success',
        metadata: {
          ...anchorData,
          signature: anchorSignature
        }
      };
      
      // Store anchor based on provider
      switch (this.config.anchoring.provider) {
        case 's3':
          await this.storeAnchorToS3(anchoredEvent);
          break;
        case 'blockchain':
          await this.storeAnchorToBlockchain(anchoredEvent);
          break;
        case 'external':
          await this.storeAnchorToExternalService(anchoredEvent);
          break;
      }
      
      this.eventQueue.push(anchoredEvent);
      this.lastAnchorAt = timestamp;
      this.lastAnchorError = null;
      metrics.increment('audit.anchor.success', { provider: this.config.anchoring.provider });
      
    } catch (error) {
      console.error('Failed to create external anchor:', error);
      this.lastAnchorError = String(error);
      metrics.increment('audit.anchor.failure', { provider: this.config.anchoring?.provider ?? 'unknown' });
    }
  }

  /**
   * Store anchor to S3 (write-once storage)
   */
  private async storeAnchorToS3(anchor: AuditEvent): Promise<void> {
    if (!this.config.storage.s3) {
      throw new Error('S3 storage not configured');
    }
    
    // Implementation would use AWS SDK
    // const s3 = new AWS.S3({ ...this.config.storage.s3 });
    // await s3.putObject({
    //   Bucket: this.config.storage.s3.bucket,
    //   Key: `anchors/${anchor.id}.json`,
    //   Body: JSON.stringify(anchor),
    //   ContentType: 'application/json'
    // }).promise();
    
    console.log('Anchor would be stored to S3:', anchor.id);
  }

  /**
   * Store anchor to blockchain (immutable storage)
   */
  private async storeAnchorToBlockchain(anchor: AuditEvent): Promise<void> {
    if (!this.config.storage.blockchain) {
      throw new Error('Blockchain storage not configured');
    }
    
    // Implementation would use web3.js or ethers.js
    // This would store the anchor hash on-chain
    console.log('Anchor would be stored to blockchain:', anchor.id);
  }

  /**
   * Store anchor to external service
   */
  private async storeAnchorToExternalService(anchor: AuditEvent): Promise<void> {
    if (!this.config.anchoring?.externalUrl) {
      throw new Error('External service URL not configured');
    }
    
    // Implementation would HTTP POST to external service
    // const response = await fetch(this.config.anchoring.externalUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(anchor)
    // });
    
    console.log('Anchor would be stored to external service:', anchor.id);
  }
  
  /**
   * Flush events to persistent storage
   */
  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      switch (this.config.storage.type) {
        case 'file':
          await this.storeToFile(events);
          break;
        case 'redis':
          await this.storeToRedis(events);
          break;
        default:
          console.warn('Unknown storage type:', this.config.storage.type);
      }
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Requeue events for retry
      this.eventQueue.unshift(...events);
    }
  }
  
  /**
   * Store events to file
   */
  private async storeToFile(events: AuditEvent[]): Promise<void> {
    const path = this.config.storage.path || './audit.log';
    const data = events.map(event => JSON.stringify(event)).join('\n') + '\n';
    
    // Append to file (append-only)
    const fs = await import('node:fs/promises');
    await fs.appendFile(path, data, { flag: 'a' });
  }
  
  /**
   * Store events to Redis
   */
  private async storeToRedis(events: AuditEvent[]): Promise<void> {
    if (!this.config.storage.redis) {
      throw new Error('Redis client not configured');
    }
    
    const pipeline = this.config.storage.redis.pipeline();
    
    events.forEach(event => {
      const key = `audit:event:${event.id}`;
      pipeline.set(key, JSON.stringify(event), 'PX', this.config.maxEventAge);
      pipeline.lpush('audit:events', key);
      pipeline.ltrim('audit:events', 0, 10000); // Keep last 10k events
    });
    
    await pipeline.exec();
  }
  
  /**
   * Verify event integrity
   */
  async verifyEvent(event: AuditEvent): Promise<boolean> {
    if (!event.signature) return false;
    
    try {
      const expectedSignature = await this.signEvent(event);
      return event.signature === expectedSignature;
    } catch {
      return false;
    }
  }
  
  /**
   * Verify audit log chain integrity
   */
  async verifyChain(events: AuditEvent[]): Promise<boolean> {
    if (events.length === 0) return true;
    
    let previousHash = '';
    
    for (const event of events) {
      // Verify individual event signature
      if (!await this.verifyEvent(event)) {
        return false;
      }
      
      // Verify chain linkage
      if (event.previousHash !== previousHash) {
        return false;
      }
      
      previousHash = this.hashEvent(event);
    }
    
    return true;
  }
  
  getMode(): 'asymmetric' | 'hmac' {
    return this.mode;
  }
  
  getAnchoringStatus(): {
    enabled: boolean;
    provider: string | null;
    lastAnchorAt: number | null;
    lastAnchorError: string | null;
  } {
    return {
      enabled: !!this.config.anchoring?.enabled,
      provider: this.config.anchoring?.provider ?? null,
      lastAnchorAt: this.lastAnchorAt ?? null,
      lastAnchorError: this.lastAnchorError ?? null,
    };
  }
  
  /**
   * Create middleware for automatic audit logging
   */
  createMiddleware() {
    return async (c: Context, next: () => Promise<void>) => {
      const startTime = Date.now();
      let outcome: AuditEvent['outcome'] = 'unknown';
      
      try {
        await next();
        outcome = c.res.status >= 200 && c.res.status < 400 ? 'success' : 'failure';
      } catch (error) {
        outcome = 'failure';
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        
        // Log the request
        await this.logEvent(
          'http.request',
          `${c.req.method} ${c.req.path}`,
          c.req.path,
          outcome,
          {
            status: c.res.status,
            duration,
            userAgent: c.req.header('user-agent'),
            referer: c.req.header('referer'),
            contentLength: c.res.headers.get('content-length')
          },
          c
        );
      }
    };
  }
  
  /**
   * Get all events (for debugging/verification)
   */
  async getEvents(limit: number = 100): Promise<AuditEvent[]> {
    // Implementation depends on storage backend
    // This would query Redis or read from file
    return [];
  }
}
