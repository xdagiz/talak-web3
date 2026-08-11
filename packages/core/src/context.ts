import type { TalakWeb3Context, TalakWeb3Instance } from "@talak-web3/types";

import { randomHex } from "./random.js";

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

/** @internal Context factory — not part of the public API. */
export class ContextFactory {
  static create(
    instance: TalakWeb3Instance,
    meta: { ip?: string; userAgent?: string } = {},
  ): RequestContext {
    const requestId = randomHex(16);
    const timestamp = Date.now();

    const context: RequestContext = {
      ...instance.context,
      requestId,
      timestamp,
      ...(meta.ip !== undefined && { ip: meta.ip }),
      ...(meta.userAgent !== undefined && { userAgent: meta.userAgent }),
      authState: {
        isAuthenticated: false,
      },
    };

    return context;
  }
}
