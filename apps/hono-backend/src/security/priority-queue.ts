import { TalakWeb3Error } from "@talak-web3/errors";
import type { MiddlewareHandler, Context } from "hono";

export enum RequestPriority {
  CRITICAL = 100,
  HIGH = 75,
  NORMAL = 50,
  LOW = 25,
  BACKGROUND = 0,
}

export interface PriorityQueueConfig {
  concurrency: {
    [key in RequestPriority]?: number;
  };

  defaultConcurrency: number;

  maxQueueSize: number;

  timeout: number;
}

export interface PriorityRequest {
  priority: RequestPriority;
  timestamp: number;
  context: Context;
  resolve: () => void;
  reject: (error: Error) => void;
}

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
        [RequestPriority.BACKGROUND]: 5,
      },
      defaultConcurrency: 10,
      maxQueueSize: 1000,
      timeout: 30000,
      ...config,
    };

    Object.values(RequestPriority).forEach((priority) => {
      if (typeof priority === "number") {
        this.queues.set(priority, []);
        this.activeCount.set(priority, 0);
      }
    });
  }

  private getRequestPriority(context: Context): RequestPriority {
    const path = context.req.path;

    if (path.startsWith("/auth/")) {
      if (path.endsWith("/login") || path.endsWith("/nonce")) {
        return RequestPriority.CRITICAL;
      }
      return RequestPriority.HIGH;
    }

    if (path.startsWith("/rpc/")) {
      return RequestPriority.HIGH;
    }

    if (path === "/health" || path === "/metrics") {
      return RequestPriority.BACKGROUND;
    }

    return RequestPriority.NORMAL;
  }

  async enqueue(context: Context): Promise<void> {
    const priority = this.getRequestPriority(context);
    const concurrency = this.config.concurrency[priority] ?? this.config.defaultConcurrency;
    const active = this.activeCount.get(priority) ?? 0;

    if (active < concurrency) {
      this.activeCount.set(priority, active + 1);
      return;
    }

    const queue = this.queues.get(priority) ?? [];
    if (queue.length >= this.config.maxQueueSize) {
      throw new TalakWeb3Error("Service temporarily unavailable", {
        code: "RATE_LIMIT",
        status: 429,
      });
    }

    return new Promise((resolve, reject) => {
      const request: PriorityRequest = {
        priority,
        timestamp: Date.now(),
        context,
        resolve: () => {
          this.activeCount.set(priority, (this.activeCount.get(priority) ?? 0) + 1);
          resolve();
        },
        reject,
      };

      queue.push(request);
      this.queues.set(priority, queue);

      setTimeout(() => {
        const index = queue.indexOf(request);
        if (index > -1) {
          queue.splice(index, 1);
          this.queues.set(priority, queue);
          reject(
            new TalakWeb3Error("Request timeout in queue", {
              code: "QUEUE_TIMEOUT",
              status: 408,
            }),
          );
        }
      }, this.config.timeout);
    });
  }

  release(context: Context): void {
    const priority = this.getRequestPriority(context);
    const active = this.activeCount.get(priority) ?? 0;

    if (active > 0) {
      this.activeCount.set(priority, active - 1);
    }

    this.processNext(priority);
  }

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

  createMiddleware(): MiddlewareHandler {
    return async (context, next) => {
      try {
        await this.enqueue(context);

        await next();
      } finally {
        this.release(context);
      }
    };
  }

  getStats() {
    const stats: {
      [key: string]: {
        queued: number;
        active: number;
        concurrency: number;
      };
    } = {};

    Object.values(RequestPriority).forEach((priority) => {
      if (typeof priority === "number") {
        const name = RequestPriority[priority];
        stats[name] = {
          queued: this.queues.get(priority)?.length ?? 0,
          active: this.activeCount.get(priority) ?? 0,
          concurrency: this.config.concurrency[priority] ?? this.config.defaultConcurrency,
        };
      }
    });

    return stats;
  }
}
