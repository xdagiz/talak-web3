import type { RedisClientType } from 'redis';
import { TalakWeb3Error } from '@talak-web3/errors';

export interface CircuitBreakerConfig {
  /** Redis client for distributed coordination */
  redis: RedisClientType;
  
  /** Failure threshold before opening circuit (e.g., 5 failures) */
  failureThreshold: number;
  
  /** Success threshold before closing circuit (e.g., 3 successes) */
  successThreshold: number;
  
  /** Half-open timeout in milliseconds (e.g., 30000) */
  halfOpenTimeout: number;
  
  /** Window size for failure counting in milliseconds (e.g., 60000) */
  windowSize: number;
  
  /** Latency threshold for adaptive failure detection in milliseconds */
  latencyThreshold?: number;
  
  /** Minimum requests before considering latency metrics */
  minRequestsForLatency?: number;
}

export interface CircuitState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailure?: number;
  lastSuccess?: number;
  openedAt?: number;
  latencyStats?: {
    average: number;
    count: number;
    lastUpdated: number;
  };
}

export class DistributedCircuitBreaker {
  private config: CircuitBreakerConfig;
  
  constructor(config: CircuitBreakerConfig) {
    this.config = {
      latencyThreshold: 2000,
      minRequestsForLatency: 10,
      ...config
    };
  }
  
  private getKey(providerId: string): string {
    return `circuit:${providerId}`;
  }
  
  private getLatencyKey(providerId: string): string {
    return `circuit:${providerId}:latency`;
  }
  
  async execute<T>(
    providerId: string,
    operation: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    const state = await this.getState(providerId);
    
    // Check circuit state
    if (state.state === 'open') {
      const now = Date.now();
      if (state.openedAt && now - state.openedAt < this.config.halfOpenTimeout) {
        throw new TalakWeb3Error('Circuit breaker open', {
          code: 'CIRCUIT_OPEN',
          status: 503,
          details: { providerId, openedAt: state.openedAt }
        });
      }
      
      // Transition to half-open
      await this.setState(providerId, {
        state: 'half-open',
        failures: 0,
        successes: 0,
        openedAt: undefined
      });
    }
    
    const startTime = Date.now();
    
    try {
      // Execute with timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
      ]);
      
      const latency = Date.now() - startTime;
      await this.recordSuccess(providerId, latency);
      
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      await this.recordFailure(providerId, error, latency);
      throw error;
    }
  }
  
  private async getState(providerId: string): Promise<CircuitState> {
    try {
      const key = this.getKey(providerId);
      const data = await this.config.redis.get(key);
      
      if (!data) {
        return {
          state: 'closed',
          failures: 0,
          successes: 0
        };
      }
      
      return JSON.parse(data);
    } catch {
      // If Redis fails, fall back to closed state
      return {
        state: 'closed',
        failures: 0,
        successes: 0
      };
    }
  }
  
  private async setState(providerId: string, state: CircuitState): Promise<void> {
    try {
      const key = this.getKey(providerId);
      await this.config.redis.set(key, JSON.stringify(state), {
        PX: this.config.windowSize * 2 // Keep state for double the window size
      });
    } catch (error) {
      // Log but don't fail on Redis errors
      console.warn('Failed to update circuit state:', error);
    }
  }
  
  private async recordSuccess(providerId: string, latency: number): Promise<void> {
    const state = await this.getState(providerId);
    
    // Update latency statistics
    await this.updateLatencyStats(providerId, latency);
    
    if (state.state === 'half-open') {
      state.successes++;
      
      if (state.successes >= this.config.successThreshold) {
        // Close the circuit
        state.state = 'closed';
        state.failures = 0;
        state.successes = 0;
      }
    } else {
      // Reset failure count on success
      state.failures = Math.max(0, state.failures - 1);
    }
    
    state.lastSuccess = Date.now();
    await this.setState(providerId, state);
  }
  
  private async recordFailure(providerId: string, error: unknown, latency: number): Promise<void> {
    const state = await this.getState(providerId);
    
    // Check if failure is due to latency threshold
    const isLatencyFailure = this.config.latencyThreshold && 
                             latency > this.config.latencyThreshold;
    
    // Check if we should use adaptive thresholds based on latency statistics
    const shouldUseAdaptiveThreshold = await this.shouldUseAdaptiveThreshold(providerId);
    let failureWeight = 1;
    
    if (shouldUseAdaptiveThreshold && isLatencyFailure) {
      // Adaptive failure weighting based on how far above threshold
      const excessLatency = latency - this.config.latencyThreshold!;
      failureWeight = Math.min(3, 1 + (excessLatency / this.config.latencyThreshold!));
    }
    
    // Only count as failure if it's a real error or latency breach
    const shouldCountFailure = !(error instanceof TalakWeb3Error && error.code === 'CIRCUIT_OPEN') || 
                              isLatencyFailure;
    
    if (shouldCountFailure) {
      state.failures += failureWeight;
      state.lastFailure = Date.now();
      
      // Use adaptive threshold if we have enough latency data
      const effectiveThreshold = shouldUseAdaptiveThreshold ? 
        this.calculateAdaptiveThreshold(providerId, state) : 
        this.config.failureThreshold;
      
      // Check if we should open the circuit
      if (state.state === 'closed' && state.failures >= effectiveThreshold) {
        state.state = 'open';
        state.openedAt = Date.now();
      } else if (state.state === 'half-open') {
        // Single failure in half-open state opens the circuit
        state.state = 'open';
        state.openedAt = Date.now();
      }
    }
    
    await this.setState(providerId, state);
  }
  
  private async updateLatencyStats(providerId: string, latency: number): Promise<void> {
    if (!this.config.latencyThreshold) return;
    
    try {
      const key = this.getLatencyKey(providerId);
      const existing = await this.config.redis.get(key);
      
      let stats: CircuitState['latencyStats'] = {
        average: latency,
        count: 1,
        lastUpdated: Date.now()
      };
      
      if (existing) {
        const parsed = JSON.parse(existing);
        const total = parsed.average * parsed.count + latency;
        const newCount = parsed.count + 1;
        
        stats = {
          average: total / newCount,
          count: newCount,
          lastUpdated: Date.now()
        };
        
        // Reset stats if they're too old or we have enough samples
        if (newCount > 1000 || Date.now() - parsed.lastUpdated > 3600000) {
          stats = {
            average: latency,
            count: 1,
            lastUpdated: Date.now()
          };
        }
      }
      
      await this.config.redis.set(key, JSON.stringify(stats), {
        PX: 7200000 // 2 hours
      });
    } catch (error) {
      // Silently fail on latency stats updates
    }
  }
  
  async getStats(providerId: string): Promise<CircuitState> {
    return this.getState(providerId);
  }
  
  async reset(providerId: string): Promise<void> {
    await this.setState(providerId, {
      state: 'closed',
      failures: 0,
      successes: 0
    });
    
    // Also reset latency stats
    try {
      await this.config.redis.del(this.getLatencyKey(providerId));
    } catch {
      // Ignore errors
    }
  }

  private async shouldUseAdaptiveThreshold(providerId: string): Promise<boolean> {
    if (!this.config.latencyThreshold || !this.config.minRequestsForLatency) {
      return false;
    }
    
    try {
      const key = this.getLatencyKey(providerId);
      const data = await this.config.redis.get(key);
      
      if (!data) return false;
      
      const stats = JSON.parse(data) as CircuitState['latencyStats'];
      return stats.count >= this.config.minRequestsForLatency;
    } catch {
      return false;
    }
  }

  private async calculateAdaptiveThreshold(providerId: string, state: CircuitState): Promise<number> {
    try {
      const key = this.getLatencyKey(providerId);
      const data = await this.config.redis.get(key);
      
      if (!data) return this.config.failureThreshold;
      
      const stats = JSON.parse(data) as CircuitState['latencyStats'];
      
      // Calculate adaptive threshold based on latency deviation
      const baseThreshold = this.config.failureThreshold;
      const latencyRatio = stats.average / this.config.latencyThreshold!;
      
      // More sensitive to failures when latency is high
      if (latencyRatio > 1.5) {
        return Math.max(1, Math.floor(baseThreshold * 0.5));
      } else if (latencyRatio > 1.2) {
        return Math.max(2, Math.floor(baseThreshold * 0.7));
      } else if (latencyRatio > 1.0) {
        return Math.max(3, Math.floor(baseThreshold * 0.9));
      }
      
      // Less sensitive to failures when latency is good
      return Math.min(baseThreshold * 1.5, baseThreshold + 2);
    } catch {
      return this.config.failureThreshold;
    }
  }
  
  async isAvailable(providerId: string): Promise<boolean> {
    const state = await this.getState(providerId);
    
    if (state.state === 'open') {
      const now = Date.now();
      return !(state.openedAt && now - state.openedAt < this.config.halfOpenTimeout);
    }
    
    return true;
  }
}