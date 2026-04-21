import type { Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  constraints?: Record<string, unknown>;
}

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

export interface PolicyRule {
  id: string;
  description: string;
  condition: (context: PolicyContext) => boolean | Promise<boolean>;
  effect: 'allow' | 'deny';
  priority: number;
}

export class PolicyEngine {
  private rules: PolicyRule[] = [];
  private ruleCache = new Map<string, PolicyRule>();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {

    this.addRule({
      id: 'chain-access',
      description: 'Control access to specific chains',
      condition: (ctx) => {
        if (!ctx.chainId) return true;

        const configuredChains = process.env.SUPPORTED_CHAINS?.split(',').map(Number) || [];
        return configuredChains.includes(ctx.chainId);
      },
      effect: 'allow',
      priority: 100
    });

    this.addRule({
      id: 'rpc-rate-limit',
      description: 'Enforce RPC rate limits',
      condition: async (ctx) => {
        if (ctx.action !== 'rpc.call') return true;

        return true;
      },
      effect: 'allow',
      priority: 90
    });

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

    this.addRule({
      id: 'role-based-access',
      description: 'Role-based access control',
      condition: (ctx) => {
        if (!ctx.user) return true;

        if (ctx.user.roles.includes('admin')) return true;

        const userAllowedActions = new Set(['rpc.call', 'auth.logout', 'auth.verify']);
        return userAllowedActions.has(ctx.action);
      },
      effect: 'allow',
      priority: 70
    });

    this.addRule({
      id: 'time-restrictions',
      description: 'Time-based access restrictions',
      condition: (ctx) => {
        const now = new Date(ctx.timestamp);
        const hour = now.getHours();

        if (ctx.action === 'system.maintenance' && (hour >= 9 && hour < 17)) {
          return false;
        }

        return true;
      },
      effect: 'deny',
      priority: 60
    });
  }

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.ruleCache.set(rule.id, rule);

    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    this.ruleCache.delete(ruleId);
  }

  async evaluate(context: PolicyContext): Promise<PolicyDecision> {

    let decision: PolicyDecision = { allowed: false, reason: 'No matching policy' };

    for (const rule of this.rules) {
      try {
        const matches = await rule.condition(context);

        if (matches) {
          decision = {
            allowed: rule.effect === 'allow',
            reason: `Rule ${rule.id}: ${rule.description}`,
            constraints: { ruleId: rule.id }
          };

          break;
        }
      } catch (error) {
        console.warn(`Policy rule ${rule.id} evaluation failed:`, error);

      }
    }

    return decision;
  }

  createMiddleware() {
    return async (c: Context, next: () => Promise<void>) => {

      const policyContext = this.extractPolicyContext(c);

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

  private extractPolicyContext(c: Context): PolicyContext {
    const user = c.get('user');
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

  private getActionFromRequest(c: Context): string {
    const method = c.req.method;
    const path = c.req.path;

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

  private extractChainId(c: Context): number | undefined {
    if (c.req.path.startsWith('/rpc/')) {
      const chainIdStr = c.req.param('chainId');
      return parseInt(chainIdStr, 10);
    }
    return undefined;
  }

  getPolicies(): PolicyRule[] {
    return [...this.rules];
  }

  async reloadPolicies(policies: PolicyRule[]): Promise<void> {
    this.rules = [];
    this.ruleCache.clear();

    policies.forEach(rule => this.addRule(rule));
    this.initializeDefaultRules();
  }
}