import type { MiddlewareHandler, Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';

/**
 * Request priority levels
 * Higher numbers = higher priority
 */
export enum RequestPriority {
  CRITICAL = 100,    // Authentication, security-critical operations
  HIGH = 75,         // RPC calls, user operations
  NORMAL = 50,       // Regular API requests
  LOW = 25,          // Background tasks, non-critical operations
  BACKGROUND = 0     // Metrics, health checks
}

/**
 * Priority queue configuration
 */
export interface PriorityQueueConfig {
  /** Maximum concurrent requests per priority level */
  concurrency: {
    [key in RequestPriority]?: number;
  };
  
  /** Default concurrency for unconfigured priorities */
  defaultConcurrency: number;
  
  /** Maximum queue size before rejecting requests */
  maxQueueSize: number;
  
  /** Timeout for queue operations (ms) */
  timeout: number;
}

/**
 * Request metadata for priority handling
 */
export interface PriorityRequest {
  priority: RequestPriority;
  timestamp: number;
  context: Context;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Distributed priority queue for request handling
 */
export class PriorityRequestQueue {
  private queues: Map<RequestPriority, PriorityRequest[]> = new Map();
  private activeCount: Map<RequestPriority, number> = new Map();
  private config: PriorityQueueConfig;
  
  constructor(config: Partial<PriorityQueueConfig> = {}) {
    this.config = {
      concurrency: {
        [RequestPriority.CRITICAL]: 100,
        [RequestPriority.HIGH]: 50,
        [RequestPriority.NORMAL]: 25,
        [RequestPriority.LOW]: 10,
        [RequestPriority.BACKGROUND]: 5
      },
      defaultConcurrency: 10,
      maxQueueSize: 1000,
      timeout: 30000,
      ...config
    };
    
    // Initialize queues and counters
    Object.values(RequestPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.queues.set(priority, []);
        this.activeCount.set(priority, 0);
      }
    });
  }
  
  /**
   * Determine request priority based on path and method
   */
  private getRequestPriority(context: Context): RequestPriority {
    const path = context.req.path;
    const method = context.req.method;
    
    // Authentication endpoints are critical
    if (path.startsWith('/auth/')) {
      if (path.endsWith('/login') || path.endsWith('/nonce')) {
        return RequestPriority.CRITICAL;
      }
      return RequestPriority.HIGH;
    }
    
    // RPC endpoints are high priority
    if (path.startsWith('/rpc/')) {
      return RequestPriority.HIGH;
    }
    
    // Health checks are background
    if (path === '/health' || path === '/metrics') {
      return RequestPriority.BACKGROUND;
    }
    
    // Default to normal priority
    return RequestPriority.NORMAL;
  }
  
  /**
   * Enqueue a request and wait for processing slot
   */
  async enqueue(context: Context): Promise<void> {
    const priority = this.getRequestPriority(context);
    const concurrency = this.config.concurrency[priority] ?? this.config.defaultConcurrency;
    const active = this.activeCount.get(priority) ?? 0;
    
    // Immediate processing if under concurrency limit
    if (active < concurrency) {
      this.activeCount.set(priority, active + 1);
      return;
    }
    
    // Check queue size limit
    const queue = this.queues.get(priority) ?? [];
    if (queue.length >= this.config.maxQueueSize) {
      throw new TalakWeb3Error('Service temporarily unavailable', {
        code: 'RATE_LIMIT',
        status: 429
      });
    }
    
    // Enqueue the request
    return new Promise((resolve, reject) => {
      const request: PriorityRequest = {
        priority,
        timestamp: Date.now(),
        context,
        resolve: () => {
          this.activeCount.set(priority, (this.activeCount.get(priority) ?? 0) + 1);
          resolve();
        },
        reject
      };
      
      queue.push(request);
      this.queues.set(priority, queue);
      
      // Set timeout for queue waiting
      setTimeout(() => {
        const index = queue.indexOf(request);
        if (index > -1) {
          queue.splice(index, 1);
          this.queues.set(priority, queue);
          reject(new TalakWeb3Error('Request timeout in queue', {
            code: 'QUEUE_TIMEOUT',
            status: 408
          }));
        }
      }, this.config.timeout);
    });
  }
  
  /**
   * Release a processing slot and dequeue next request
   */
  release(context: Context): void {
    const priority = this.getRequestPriority(context);
    const active = this.activeCount.get(priority) ?? 0;
    
    if (active > 0) {
      this.activeCount.set(priority, active - 1);
    }
    
    // Check if we can process next request in queue
    this.processNext(priority);
  }
  
  /**
   * Process the next request in queue for given priority
   */
  private processNext(priority: RequestPriority): void {
    const concurrency = this.config.concurrency[priority] ?? this.config.defaultConcurrency;
    const active = this.activeCount.get(priority) ?? 0;
    const queue = this.queues.get(priority) ?? [];
    
    if (active < concurrency && queue.length > 0) {
      const nextRequest = queue.shift();
      this.queues.set(priority, queue);
      
      if (nextRequest) {
        nextRequest.resolve();
      }
    }
  }
  
  /**
   * Create middleware for priority-based request handling
   */
  createMiddleware(): MiddlewareHandler {
    return async (context, next) => {
      try {
        // Enqueue request
        await this.enqueue(context);
        
        // Process request
        await next();
        
      } finally {
        // Release slot
        this.release(context);
      }
    };
  }
  
  /**
   * Get queue statistics
   */
  getStats() {
    const stats: {
      [key: string]: {
        queued: number;
        active: number;
        concurrency: number;
      };
    } = {};
    
    Object.values(RequestPriority).forEach(priority => {
      if (typeof priority === 'number') {
        const name = RequestPriority[priority];
        stats[name] = {
          queued: this.queues.get(priority)?.length ?? 0,
          active: this.activeCount.get(priority) ?? 0,
          concurrency: this.config.concurrency[priority] ?? this.config.defaultConcurrency
        };
      }
    });
    
    return stats;
  }
}