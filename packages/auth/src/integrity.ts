import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

import { TalakWeb3Error, AUTH_ERROR_CODES } from "@talak-web3/errors";

export interface DependencyCheck {
  packageName: string;
  expectedHash: string;
  entryPoint: "main" | "module" | "browser";
}

const EXPECTED_HASHES: DependencyCheck[] = [
  {
    packageName: "jose",
    expectedHash: process.env["JOSE_INTEGRITY_HASH"] || "sha256:skip",
    entryPoint: "main",
  },
  {
    packageName: "viem",
    expectedHash: process.env["VIEM_INTEGRITY_HASH"] || "sha256:skip",
    entryPoint: "main",
  },
  {
    packageName: "ioredis",
    expectedHash: process.env["IOREDIS_INTEGRITY_HASH"] || "sha256:skip",
    entryPoint: "main",
  },
];

export function verifyDependencyIntegrity(
  opts: {
    dependencies?: DependencyCheck[];
    failClosed?: boolean;
  } = {},
): void {
  const dependencies = opts.dependencies ?? EXPECTED_HASHES;
  const failClosed = opts.failClosed ?? true;
  const isProduction = process.env["NODE_ENV"] === "production";

  const failures: string[] = [];

  for (const dep of dependencies) {
    if (dep.expectedHash === "sha256:skip") {
      if (isProduction && failClosed) {
        failures.push(
          `${dep.packageName}: integrity hash is sha256:skip — set ${dep.packageName.toUpperCase()}_INTEGRITY_HASH to a real sha256:hex hash`,
        );
      } else {
        console.warn(`[AUTH] Skipping integrity check for ${dep.packageName} (development mode)`);
      }
      continue;
    }

    try {
      const pkgPath = resolvePackageEntryPoint(dep.packageName, dep.entryPoint);
      const content = readFileSync(pkgPath, "utf8");
      const actualHash = `sha256:${createHash("sha256").update(content).digest("hex")}`;

      if (actualHash !== dep.expectedHash) {
        failures.push(
          `${dep.packageName}: hash mismatch\n  expected: ${dep.expectedHash}\n  actual:   ${actualHash}`,
        );
      }
    } catch (err) {
      failures.push(
        `${dep.packageName}: failed to verify - ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (failures.length > 0) {
    const errorMessage = [
      "[CRITICAL] Dependency integrity check failed:",
      "Possible supply chain compromise detected.",
      "",
      ...failures.map((f) => `  - ${f}`),
      "",
      "System will now exit to prevent running with tampered dependencies.",
    ].join("\n");

    console.error(errorMessage);

    if (failClosed) {
      process.exit(1);
    } else {
      throw new TalakWeb3Error("Dependency integrity check failed", {
        code: AUTH_ERROR_CODES.DEPENDENCY_INTEGRITY_FAILURE,
        status: 500,
        data: { failures },
      });
    }
  }
}

export function verifyLockfileIntegrity(): void {
  const lockfilePath = join(process.cwd(), "pnpm-lock.yaml");

  if (!existsSync(lockfilePath)) {
    console.error("[AUTH] CRITICAL: pnpm-lock.yaml not found");
    console.error("[AUTH] Run: pnpm install --frozen-lockfile");
    process.exit(1);
  }

  const expectedLockfileHash = process.env["PNPM_LOCKFILE_HASH"];

  if (!expectedLockfileHash || expectedLockfileHash === "sha256:skip") {
    console.warn(
      "[AUTH] Lockfile integrity NOT verified — set PNPM_LOCKFILE_HASH to a real sha256:hex hash to enable verification",
    );
    return;
  }

  const content = readFileSync(lockfilePath, "utf8");
  const actualHash = `sha256:${createHash("sha256").update(content).digest("hex")}`;

  if (actualHash !== expectedLockfileHash) {
    console.error("[AUTH] CRITICAL: pnpm-lock.yaml hash mismatch");
    console.error("[AUTH] Expected:", expectedLockfileHash);
    console.error("[AUTH] Actual:", actualHash);
    console.error("[AUTH] Run: pnpm install --frozen-lockfile");
    process.exit(1);
  }

  console.log("[AUTH] Lockfile integrity verified");
}

function resolvePackageEntryPoint(
  packageName: string,
  entryPoint: "main" | "module" | "browser",
): string {
  try {
    const pkgJsonPath = require.resolve(`${packageName}/package.json`);
    const pkgJsonContent = readFileSync(pkgJsonPath, "utf8");
    const pkgJson = JSON.parse(pkgJsonContent);

    let relativePath: string;
    if (entryPoint === "module" && pkgJson.module) {
      relativePath = pkgJson.module;
    } else if (entryPoint === "browser" && pkgJson.browser) {
      relativePath =
        typeof pkgJson.browser === "string"
          ? pkgJson.browser
          : pkgJson.browser["."] || pkgJson.main;
    } else {
      relativePath = pkgJson.main || "index.js";
    }

    const pkgDir = dirname(pkgJsonPath);
    const fullPath = join(pkgDir, relativePath);

    if (!existsSync(fullPath)) {
      throw new Error(`Entry point not found: ${fullPath}`);
    }

    return fullPath;
  } catch (err) {
    throw new Error(
      `Failed to resolve ${packageName} entry point: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

export function generateDependencyHashes(dependencies: string[]): Record<string, string> {
  const hashes: Record<string, string> = {};

  for (const packageName of dependencies) {
    try {
      const pkgPath = resolvePackageEntryPoint(packageName, "main");
      const content = readFileSync(pkgPath, "utf8");
      const hash = `sha256:${createHash("sha256").update(content).digest("hex")}`;
      hashes[packageName] = hash;
    } catch (err) {
      console.warn(`[AUTH] Failed to generate hash for ${packageName}:`, err);
    }
  }

  return hashes;
}

export class PeriodicIntegrityChecker {
  private intervalMs: number;
  private dependencies: DependencyCheck[];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    opts: {
      intervalMs?: number;
      dependencies?: DependencyCheck[];
    } = {},
  ) {
    this.intervalMs = opts.intervalMs ?? 5 * 60 * 1000;
    this.dependencies = opts.dependencies ?? EXPECTED_HASHES;
  }

  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      try {
        verifyDependencyIntegrity({ dependencies: this.dependencies });
      } catch (err) {
        console.error("[AUTH] Periodic integrity check failed:", err);
      }
    }, this.intervalMs);

    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
