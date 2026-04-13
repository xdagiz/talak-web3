import type { Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';

/**
 * Security policy decision point
 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  constraints?: Record<string, unknown>;
}

/**
 * Policy evaluation context
 */
export interface PolicyContext {
  user?: {
    id: string;
    address: string;
    roles: string[];
  };
  action: string;
  resource: string;
  chainId?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Policy rule definition
 */
export interface PolicyRule {
  id: string;
  description: string;
  condition: (context: PolicyContext) => boolean | Promise<boolean>;
  effect: 'allow' | 'deny';
  priority: number;
}

/**
 * Global security policy engine
 */
export class PolicyEngine {
  private rules: PolicyRule[] = [];
  private ruleCache = new Map<string, PolicyRule>();
  
  constructor() {
    this.initializeDefaultRules();
  }
  
  /**
   * Initialize default security policies
   */
  private initializeDefaultRules(): void {
    // Chain access control
    this.addRule({
      id: 'chain-access',
      description: 'Control access to specific chains',
      condition: (ctx) => {
        if (!ctx.chainId) return true; // No chain restriction
        
        // Default: allow all configured chains
        const configuredChains = process.env.SUPPORTED_CHAINS?.split(',').map(Number) || [];
        return configuredChains.includes(ctx.chainId);
      },
      effect: 'allow',
      priority: 100
    });
    
    // Rate limiting policies
    this.addRule({
      id: 'rpc-rate-limit',
      description: 'Enforce RPC rate limits',
      condition: async (ctx) => {
        if (ctx.action !== 'rpc.call') return true;
        
        // Implement global rate limiting logic here
        // This would integrate with Redis for distributed rate limiting
        return true; // Placeholder
      },
      effect: 'allow',
      priority: 90
    });
    
    // Authentication requirements
    this.addRule({
      id: 'auth-required',
      description: 'Require authentication for sensitive operations',
      condition: (ctx) => {
        const publicActions = new Set(['auth.nonce', 'auth.login', 'health.check']);
        if (publicActions.has(ctx.action)) return true;
        
        return !!ctx.user;
      },
      effect: 'deny',
      priority: 80
    });
    
    // Role-based access control
    this.addRule({
      id: 'role-based-access',
      description: 'Role-based access control',
      condition: (ctx) => {
        if (!ctx.user) return true;
        
        // Admin role can perform any action
        if (ctx.user.roles.includes('admin')) return true;
        
        // User role restrictions
        const userAllowedActions = new Set(['rpc.call', 'auth.logout', 'auth.verify']);
        return userAllowedActions.has(ctx.action);
      },
      effect: 'allow',
      priority: 70
    });
    
    // Time-based restrictions
    this.addRule({
      id: 'time-restrictions',
      description: 'Time-based access restrictions',
      condition: (ctx) => {
        const now = new Date(ctx.timestamp);
        const hour = now.getHours();
        
        // Restrict maintenance operations to off-hours
        if (ctx.action === 'system.maintenance' && (hour >= 9 && hour < 17)) {
          return false; // Business hours
        }
        
        return true;
      },
      effect: 'deny',
      priority: 60
    });
  }
  
  /**
   * Add a policy rule
   */
  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.ruleCache.set(rule.id, rule);
    
    // Sort rules by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Remove a policy rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    this.ruleCache.delete(ruleId);
  }
  
  /**
   * Evaluate policies for a given context
   */
  async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    // Default decision (deny by default)
    let decision: PolicyDecision = { allowed: false, reason: 'No matching policy' };
    
    // Evaluate rules in priority order
    for (const rule of this.rules) {
      try {
        const matches = await rule.condition(context);
        
        if (matches) {
          decision = {
            allowed: rule.effect === 'allow',
            reason: `Rule ${rule.id}: ${rule.description}`,
            constraints: { ruleId: rule.id }
          };
          
          // Highest priority matching rule wins
          break;
        }
      } catch (error) {
        console.warn(`Policy rule ${rule.id} evaluation failed:`, error);
        // Continue to next rule
      }
    }
    
    return decision;
  }
  
  /**
   * Create middleware for policy enforcement
   */
  createMiddleware() {
    return async (c: Context, next: () => Promise<void>) => {
      // Extract policy context from request
      const policyContext = this.extractPolicyContext(c);
      
      // Evaluate policies
      const decision = await this.evaluate(policyContext);
      
      if (!decision.allowed) {
        throw new TalakWeb3Error(decision.reason || 'Access denied', {
          code: 'ACCESS_DENIED',
          status: 403,
          details: decision.constraints
        });
      }
      
      await next();
    };
  }
  
  /**
   * Extract policy context from Hono context
   */
  private extractPolicyContext(c: Context): PolicyContext {
    const user = c.get('user'); // Assuming user is set by auth middleware
    const action = this.getActionFromRequest(c);
    const resource = c.req.path;
    const chainId = this.extractChainId(c);
    
    return {
      user,
      action,
      resource,
      chainId,
      timestamp: Date.now(),
      metadata: {
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent')
      }
    };
  }
  
  /**
   * Derive action from request context
   */
  private getActionFromRequest(c: Context): string {
    const method = c.req.method;
    const path = c.req.path;
    
    // Map routes to actions
    if (path.startsWith('/auth/nonce')) return 'auth.nonce';
    if (path.startsWith('/auth/login')) return 'auth.login';
    if (path.startsWith('/auth/logout')) return 'auth.logout';
    if (path.startsWith('/auth/verify')) return 'auth.verify';
    if (path.startsWith('/auth/refresh')) return 'auth.refresh';
    if (path.startsWith('/rpc/')) return 'rpc.call';
    if (path === '/health') return 'health.check';
    if (path === '/metrics') return 'metrics.read';
    
    return `${method.toLowerCase()}:${path}`;
  }
  
  /**
   * Extract chain ID from request
   */
  private extractChainId(c: Context): number | undefined {
    if (c.req.path.startsWith('/rpc/')) {
      const chainIdStr = c.req.param('chainId');
      return parseInt(chainIdStr, 10);
    }
    return undefined;
  }
  
  /**
   * Get all active policies
   */
  getPolicies(): PolicyRule[] {
    return [...this.rules];
  }
  
  /**
   * Reload policies from external source
   */
  async reloadPolicies(policies: PolicyRule[]): Promise<void> {
    this.rules = [];
    this.ruleCache.clear();
    
    policies.forEach(rule => this.addRule(rule));
    this.initializeDefaultRules(); // Ensure default rules are always present
  }
}