import { describe, expect, it } from 'vitest';
import { talakWeb3, __resetTalakWeb3 } from '@talak-web3/core';
import { UnifiedRpc } from '../index';

describe('UnifiedRpc middleware integration', () => {
  it('executes request middleware before performing the RPC call', async () => {
    __resetTalakWeb3();

    const b3 = talakWeb3({
      chains: [{
        id: 1,
        name: 'Test',
        rpcUrls: ['http://localhost:0'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        testnet: true,
      }],
      debug: false,
    });

    const ctx = b3.context;

    let seen = false;
    ctx.requestChain.use(async (req: any, next: () => Promise<any>) => {
      const rec = req as { method: string };
      if (rec.method === 'eth_chainId') seen = true;
      return next();
    });

    const rpc = new UnifiedRpc(ctx, []);
    (rpc as any).fetchWithRetry = async () => '0x1';

    const result = await rpc.request('eth_chainId');
    expect(result).toBe('0x1');
    expect(seen).toBe(true);
  });
});

