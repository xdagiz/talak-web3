import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedRpc } from '../index';
import type { TalakWeb3Context } from '@talak-web3/types';

describe('UnifiedRpc', () => {
  let mockContext: TalakWeb3Context;

  beforeEach(() => {
    mockContext = {
      config: { rpc: { retries: 2, timeout: 5000 } },
      hooks: { emit: vi.fn() },
      plugins: new Map(),
      rpc: {},
      auth: {},
      cache: { get: vi.fn(), set: vi.fn() } as any,
      logger: console,
      requestChain: { use: vi.fn(), execute: vi.fn() },
      responseChain: { use: vi.fn(), execute: vi.fn() },
    } as any;

    global.fetch = vi.fn();
  });

  it('should retry and failover on error', async () => {
    const endpoints: any[] = [
      { url: 'https://rpc1.com', priority: 1 },
      { url: 'https://rpc2.com', priority: 2 },
    ];
    const rpc = new UnifiedRpc(mockContext, endpoints);

    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x123' }),
      });

    const result = await rpc.request('eth_blockNumber');

    expect(result).toBe('0x123');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(mockContext.hooks.emit).toHaveBeenCalledWith('rpc-error', expect.any(Object));
    expect((endpoints[0] as any).health?.status).toBe('down');
  });

  it('should throw error after max retries', async () => {
    const endpoints = [{ url: 'https://rpc1.com' }];
    const rpc = new UnifiedRpc(mockContext, endpoints);

    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(rpc.request('eth_blockNumber', [], { retries: 2 }))
      .rejects.toThrow('RPC request failed after 3 attempts');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should perform health checks', async () => {
    const endpoints: any[] = [{ url: 'https://rpc1.com' }];
    const rpc = new UnifiedRpc(mockContext, endpoints);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x1' }),
    });

    await rpc.checkAllHealth();

    expect((endpoints[0] as any).health?.status).toBe('up');
    expect((endpoints[0] as any).health?.latency).toBeLessThan(Infinity);
  });
});
