import type { TalakWeb3Context, TalakWeb3Instance } from '@talak-web3/types';
import { randomBytes } from 'node:crypto';

export interface RequestContext extends TalakWeb3Context {
  readonly requestId: string;
  readonly timestamp: number;
  readonly ip?: string;
  readonly userAgent?: string;
  authState?: {
    address?: string;
    chainId?: number;
    isAuthenticated: boolean;
  };
}

export class ContextFactory {

  static create(
    instance: TalakWeb3Instance,
    meta: { ip?: string; userAgent?: string } = {}
  ): RequestContext {
    const requestId = randomBytes(16).toString('hex');
    const timestamp = Date.now();

    const context: RequestContext = {
      ...instance.context,
      requestId,
      timestamp,
      ip: meta.ip,
      userAgent: meta.userAgent,
      authState: {
        isAuthenticated: false,
      },

    };

    return context;
  }
}
