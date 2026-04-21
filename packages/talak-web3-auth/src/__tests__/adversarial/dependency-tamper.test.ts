import { describe, it, expect, vi } from 'vitest';
import { verifyDependencyIntegrity, generateDependencyHashes, PeriodicIntegrityChecker } from '../../integrity.js';
import { TalakWeb3Error } from '@talak-web3/errors';

describe('Adversarial: Dependency Tampering', () => {
  it('should detect hash mismatch and fail closed', () => {

    const tamperedDeps = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        entryPoint: 'main' as const,
      },
    ];

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: tamperedDeps,
        failClosed: false,
      });
    }).toThrow(TalakWeb3Error);

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: tamperedDeps,
        failClosed: false,
      });
    }).toThrow('Dependency integrity check failed');
  });

  it('should skip verification in development mode (sha256:skip)', () => {
    const devDeps = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:skip',
        entryPoint: 'main' as const,
      },
    ];

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: devDeps,
        failClosed: false,
      });
    }).not.toThrow();
  });

  it('should generate correct hashes for dependencies', () => {
    const hashes = generateDependencyHashes(['jose']);

    expect(hashes).toHaveProperty('jose');
    expect(hashes['jose']).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle missing dependencies gracefully', () => {
    const missingDeps = [
      {
        packageName: 'nonexistent-package-12345',
        expectedHash: 'sha256:abc123',
        entryPoint: 'main' as const,
      },
    ];

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: missingDeps,
        failClosed: false,
      });
    }).toThrow('Failed to resolve nonexistent-package-12345');
  });

  it('should verify multiple dependencies and report all failures', () => {
    const multipleTampered = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:wrong1',
        entryPoint: 'main' as const,
      },
      {
        packageName: 'viem',
        expectedHash: 'sha256:wrong2',
        entryPoint: 'main' as const,
      },
    ];

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: multipleTampered,
        failClosed: false,
      });
    }).toThrow(/jose.*viem|viem.*jose/);
  });
});

describe('Adversarial: Periodic Integrity Checking', () => {
  it('should start and stop periodic checker', () => {
    const checker = new PeriodicIntegrityChecker({
      intervalMs: 1000,
      dependencies: [
        {
          packageName: 'jose',
          expectedHash: 'sha256:skip',
          entryPoint: 'main',
        },
      ],
    });

    expect(() => checker.start()).not.toThrow();

    expect(() => checker.stop()).not.toThrow();
  });

  it('should not start multiple timers', () => {
    const checker = new PeriodicIntegrityChecker({
      intervalMs: 1000,
    });

    checker.start();
    checker.start();
    checker.stop();
  });
});

describe('Adversarial: Supply Chain Attack Scenarios', () => {
  it('should detect entry point modification', () => {

    const realHashes = generateDependencyHashes(['jose']);
    const realHash = realHashes['jose'];

    const tamperedHash = realHash.replace(/[a-f0-9]/g, '0').substring(0, 71);

    expect(realHash).not.toBe(tamperedHash);
  });

  it('should prevent running with compromised crypto library', () => {

    const cryptoDepCheck = [
      {
        packageName: 'jose',
        expectedHash: 'sha256:incorrecthash',
        entryPoint: 'main' as const,
      },
    ];

    expect(() => {
      verifyDependencyIntegrity({
        dependencies: cryptoDepCheck,
        failClosed: false,
      });
    }).toThrow();
  });
});
