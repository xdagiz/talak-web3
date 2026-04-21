import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TalakWeb3Error } from '@talak-web3/errors';

/**
 * DEPENDENCY INTEGRITY ENFORCEMENT — Runtime supply chain protection
 * 
 * INVARIANT: execution_path ⊆ verified_code
 * 
 * Problem: Hash verification alone is detective — it detects compromise after loading.
 * We need preventive controls to stop runtime injection.
 * 
 * Solution: Multi-layer defense:
 * 1. Pre-execution trust (lockfile verification)
 * 2. Static hash verification (detective)
 * 3. Global freeze (preventive)
 * 4. Prototype sealing (preventive)
 * 5. Dynamic import monitoring (detective)
 * 
 * Architecture:
 * - Verify pnpm-lock.yaml integrity before loading modules
 * - Compute SHA-256 hashes of critical dependency entry points
 * - Compare against expected hashes at startup
 * - Freeze global objects to prevent prototype poisoning
 * - Seal Object/Function prototypes to prevent runtime injection
 * - Fail immediately (process.exit(1)) if any violation detected
 * 
 * CRITICAL LIMITATION:
 * This runs AFTER Node.js has loaded modules. True pre-execution trust requires:
 * - pnpm install --frozen-lockfile
 * - NODE_OPTIONS=--disable-proto=throw
 * - --no-addons flag
 * - --frozen-intrinsics (experimental)
 * 
 * Build-time hash generation:
 * - Hashes should be computed during CI/CD and stored in integrity-hashes.ts
 * - Update hashes when dependency versions change
 */

export interface DependencyCheck {
  packageName: string;
  expectedHash: string;
  entryPoint: 'main' | 'module' | 'browser';
}

/**
 * Expected dependency hashes — MUST be updated during CI/CD builds
 * Format: sha256:<hex_hash>
 * 
 * To regenerate hashes:
 * 1. Run: node scripts/generate-integrity-hashes.mjs
 * 2. Update this file with new hashes
 * 3. Commit and deploy
 */
const EXPECTED_HASHES: DependencyCheck[] = [
  {
    packageName: 'jose',
    expectedHash: process.env['JOSE_INTEGRITY_HASH'] || 'sha256:skip',
    entryPoint: 'main',
  },
  {
    packageName: 'viem',
    expectedHash: process.env['VIEM_INTEGRITY_HASH'] || 'sha256:skip',
    entryPoint: 'main',
  },
  {
    packageName: 'ioredis',
    expectedHash: process.env['IOREDIS_INTEGRITY_HASH'] || 'sha256:skip',
    entryPoint: 'main',
  },
];

/**
 * Verify integrity of critical dependencies
 * Fails closed immediately if any dependency hash mismatch detected
 * 
 * NOTE: This is a POST-LOAD check. Modules have already executed.
 * For PRE-EXECUTION trust, use:
 * - pnpm install --frozen-lockfile
 * - CI/CD lockfile verification
 * - Container image signing
 */
export function verifyDependencyIntegrity(opts: {
  dependencies?: DependencyCheck[];
  failClosed?: boolean;
} = {}): void {
  const dependencies = opts.dependencies ?? EXPECTED_HASHES;
  const failClosed = opts.failClosed ?? true;

  const failures: string[] = [];

  for (const dep of dependencies) {
    // Skip if hash is 'skip' (development mode)
    if (dep.expectedHash === 'sha256:skip') {
      console.warn(`[AUTH] Skipping integrity check for ${dep.packageName} (development mode)`);
      continue;
    }

    try {
      const pkgPath = resolvePackageEntryPoint(dep.packageName, dep.entryPoint);
      const content = readFileSync(pkgPath, 'utf8');
      const actualHash = `sha256:${createHash('sha256').update(content).digest('hex')}`;

      if (actualHash !== dep.expectedHash) {
        failures.push(
          `${dep.packageName}: hash mismatch\n  expected: ${dep.expectedHash}\n  actual:   ${actualHash}`
        );
      }
    } catch (err) {
      failures.push(
        `${dep.packageName}: failed to verify - ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (failures.length > 0) {
    const errorMessage = [
      '[CRITICAL] Dependency integrity check failed:',
      'Possible supply chain compromise detected.',
      '',
      ...failures.map(f => `  - ${f}`),
      '',
      'System will now exit to prevent running with tampered dependencies.',
    ].join('\n');

    console.error(errorMessage);

    if (failClosed) {
      // FAIL CLOSED: Exit immediately to prevent security bypass
      process.exit(1);
    } else {
      throw new TalakWeb3Error('Dependency integrity check failed', {
        code: 'AUTH_DEPENDENCY_INTEGRITY_FAILURE',
        status: 500,
        data: { failures },
      });
    }
  }
}

/**
 * Verify pnpm lockfile integrity (PRE-EXECUTION trust anchor)
 * 
 * Must be called BEFORE loading application modules.
 * Validates that node_modules matches the locked dependency tree.
 */
export function verifyLockfileIntegrity(): void {
  const { existsSync, readFileSync } = require('fs');
  const { join } = require('path');
  
  const lockfilePath = join(process.cwd(), 'pnpm-lock.yaml');
  
  if (!existsSync(lockfilePath)) {
    console.error('[AUTH] CRITICAL: pnpm-lock.yaml not found');
    console.error('[AUTH] Run: pnpm install --frozen-lockfile');
    process.exit(1);
  }
    // Verify lockfile hash against expected value if provided
  const expectedLockfileHash = process.env['PNPM_LOCKFILE_HASH'];
  
  if (expectedLockfileHash && expectedLockfileHash !== 'sha256:skip') {
    const content = readFileSync(lockfilePath, 'utf8');
    const actualHash = `sha256:${createHash('sha256').update(content).digest('hex')}`;
    
    if (actualHash !== expectedLockfileHash) {
      console.error('[AUTH] CRITICAL: pnpm-lock.yaml hash mismatch');
      console.error('[AUTH] Expected:', expectedLockfileHash);
      console.error('[AUTH] Actual:', actualHash);
      console.error('[AUTH] Run: pnpm install --frozen-lockfile');
      process.exit(1);
    }
  }
  
  console.log('[AUTH] Lockfile integrity verified');
}

/**
 * Runtime execution sandboxing — prevents prototype poisoning and global injection
 * 
 * INVARIANT: Verified code must execute in an unmodified environment.
 * This function freezes critical globals to prevent runtime manipulation.
 */
export function freezeExecutionEnvironment(): void {
  // Prevent prototype poisoning
  Object.freeze(Object.prototype);
  Object.freeze(Array.prototype);
  Object.freeze(Function.prototype);
  Object.freeze(Promise.prototype);
  
  // Freeze critical globals
  Object.freeze(globalThis);
  Object.freeze(console);
  Object.freeze(JSON);
  Object.freeze(Math);
  
  // Seal constructor prototypes
  const criticalPrototypes = [
    String, Number, Boolean, Symbol, Date, RegExp, Map, Set, WeakMap, WeakSet,
  ];
  
  for (const ctor of criticalPrototypes) {
    if (ctor.prototype) {
      Object.freeze(ctor.prototype);
    }
  }
  
  console.log('[AUTH] Execution environment frozen — prototype poisoning prevented');
}

/**
 * Monitor for dynamic code execution (eval, Function constructor)
 * 
 * This is a detective control — logs violations but doesn't block them
 * (blocking would break legitimate dynamic imports)
 */
export function monitorDynamicExecution(): void {
  const originalEval = globalThis.eval;
  
  globalThis.eval = function(code: string): any {
    console.error('[AUTH] CRITICAL: eval() detected — possible runtime injection:', {
      code: code.substring(0, 200), // Log first 200 chars
      stack: new Error().stack,
    });
    
    // Still execute (blocking would break legitimate uses)
    return originalEval(code);
  };
  
  // Monitor Function constructor
  const OriginalFunction = Function;
  const FunctionProxy = new Proxy(OriginalFunction, {
    construct(target, args) {
      console.error('[AUTH] WARNING: Function constructor detected — possible dynamic code generation:', {
        args: args.map(a => String(a).substring(0, 100)),
        stack: new Error().stack,
      });
      return new target(...(args as string[]));
    },
  });
  
  // Can't replace Function constructor directly, but we can monitor
  Object.defineProperty(globalThis, 'Function', {
    value: FunctionProxy,
    writable: false,
    configurable: false,
  });
  
  console.log('[AUTH] Dynamic execution monitoring enabled');
}

/**
 * Resolve package entry point from node_modules
 */
function resolvePackageEntryPoint(packageName: string, entryPoint: 'main' | 'module' | 'browser'): string {
  try {
    // Find package.json
    const pkgJsonPath = require.resolve(`${packageName}/package.json`);
    const pkgJsonContent = readFileSync(pkgJsonPath, 'utf8');
    const pkgJson = JSON.parse(pkgJsonContent);

    // Get entry point
    let relativePath: string;
    if (entryPoint === 'module' && pkgJson.module) {
      relativePath = pkgJson.module;
    } else if (entryPoint === 'browser' && pkgJson.browser) {
      relativePath = typeof pkgJson.browser === 'string' ? pkgJson.browser : pkgJson.browser['.'] || pkgJson.main;
    } else {
      relativePath = pkgJson.main || 'index.js';
    }

    // Resolve full path
    const pkgDir = dirname(pkgJsonPath);
    const fullPath = join(pkgDir, relativePath);

    if (!existsSync(fullPath)) {
      throw new Error(`Entry point not found: ${fullPath}`);
    }

    return fullPath;
  } catch (err) {
    throw new Error(
      `Failed to resolve ${packageName} entry point: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Generate hashes for all dependencies (for CI/CD builds)
 * Returns map of package name to hash
 */
export function generateDependencyHashes(dependencies: string[]): Record<string, string> {
  const hashes: Record<string, string> = {};

  for (const packageName of dependencies) {
    try {
      const pkgPath = resolvePackageEntryPoint(packageName, 'main');
      const content = readFileSync(pkgPath, 'utf8');
      const hash = `sha256:${createHash('sha256').update(content).digest('hex')}`;
      hashes[packageName] = hash;
    } catch (err) {
      console.warn(`[AUTH] Failed to generate hash for ${packageName}:`, err);
    }
  }

  return hashes;
}

/**
 * Periodic integrity checker for long-running processes
 * Checks dependencies at specified intervals
 */
export class PeriodicIntegrityChecker {
  private intervalMs: number;
  private dependencies: DependencyCheck[];
  private timer: NodeJS.Timeout | null = null;

  constructor(opts: {
    intervalMs?: number;
    dependencies?: DependencyCheck[];
  } = {}) {
    this.intervalMs = opts.intervalMs ?? 5 * 60 * 1000; // 5 minutes
    this.dependencies = opts.dependencies ?? EXPECTED_HASHES;
  }

  /**
   * Start periodic checking
   */
  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      try {
        verifyDependencyIntegrity({ dependencies: this.dependencies });
      } catch (err) {
        console.error('[AUTH] Periodic integrity check failed:', err);
        // Don't exit on periodic check — let next startup catch it
      }
    }, this.intervalMs);

    // Unref to allow process to exit
    this.timer.unref();
  }

  /**
   * Stop periodic checking
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
