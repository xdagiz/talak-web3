import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTalakWeb3 } from '../index.js';
import { validateRpcRequest } from '../../talak-web3-rpc/src/validation.js';
import { RedisRateLimiter } from '../../talak-web3-rate-limit/src/index.js';
import { TalakWeb3Error } from '@talak-web3/errors';

describe('Security Hardening Audit', () => {
  describe('RPC Input Validation (Strict Zod)', () => {
    it('should reject RPC method with disallowed characters', () => {
      const payload = { jsonrpc: '2.0', id: 1, method: 'eth_call; DROP TABLE users', params: [] };
      expect(() => validateRpcRequest(payload)).toThrow('Method contains disallowed characters');
    });

    it('should reject RPC payloads exceeding 1MB', () => {
      const largeParams = new Array(10000).fill('a'.repeat(200));
      const payload = { jsonrpc: '2.0', id: 1, method: 'eth_call', params: largeParams };
      expect(() => validateRpcRequest(payload)).toThrow('RPC payload size exceeds 1MB limit');
    });

    it('should reject RPC with more than 20 parameters', () => {
      const payload = { jsonrpc: '2.0', id: 1, method: 'eth_call', params: new Array(21).fill(0) };
      expect(() => validateRpcRequest(payload)).toThrow('Maximum 20 parameters allowed');
    });

    it('should reject deeply nested RPC parameters (depth-limited)', () => {
      const deepParams = { a: { b: { c: { d: { e: { f: 1 } } } } } };
      const payload = { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [deepParams] };
      expect(() => validateRpcRequest(payload)).toThrow('RPC parameters too deeply nested (max depth 5)');
    });
  });

  describe('Distributed Rate Limiting (Redis-based)', () => {
    let mockRedis: any;
    let limiter: RedisRateLimiter;

    beforeEach(() => {
      mockRedis = {
        eval: vi.fn().mockResolvedValue([1, 9, Date.now() + 60000]),
        del: vi.fn(),
      };
      limiter = new RedisRateLimiter(mockRedis, { capacity: 10, windowMs: 60000 });
    });

    it('should use Redis for atomic sliding window checks', async () => {
      const res = await limiter.check('test-ip');
      expect(mockRedis.eval).toHaveBeenCalled();
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(9);
    });

    it('should handle rate limit exhaustion correctly', async () => {
      mockRedis.eval.mockResolvedValue([0, 0, Date.now() + 60000]);
      const res = await limiter.check('blocked-ip');
      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
    });
  });

  describe('JWT Hardening (Asymmetric RS256)', () => {
    it('should throw if asymmetric keys are missing in production mode', async () => {

      const originalKey = process.env['JWT_PRIVATE_KEY'];
      delete process.env['JWT_PRIVATE_KEY'];

      try {
        const instance = createTalakWeb3({
          chains: [],
          rpc: { retries: 3, timeout: 5000 },
          debug: false
        });
        await expect(instance.init()).rejects.toThrow('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required');
      } finally {
        process.env['JWT_PRIVATE_KEY'] = originalKey;
      }
    });
  });
});
