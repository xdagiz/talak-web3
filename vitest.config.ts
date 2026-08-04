import path from "path";

import { defineConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

export interface CoverageThresholds {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

const DEFAULT_THRESHOLDS: CoverageThresholds = {
  lines: 85,
  functions: 85,
  branches: 80,
  statements: 85,
};

export interface PackageTestConfigOptions {
  thresholds?: CoverageThresholds | null;
}

export function packageTestConfig(opts: PackageTestConfigOptions = {}): UserConfig {
  const thresholds = opts.thresholds === undefined ? DEFAULT_THRESHOLDS : opts.thresholds;

  return {
    ssr: {
      resolve: {
        conditions: ["dev-source"],
      },
    },
    test: {
      environment: "node",
      globals: true,
      include: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
      css: false,
      testTimeout: 30000,
      retry: 1,
      pool: "threads",
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html", "lcov"],
        reportsDirectory: "./coverage",
        include: [
          "src/**/*.{ts,tsx}",
          "!src/**/*.d.ts",
          "!src/**/__tests__/**",
          "!src/**/*.test.ts",
          "!src/**/*.spec.ts",
        ],
        ...(thresholds ? { thresholds } : {}),
      },
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname),
  ssr: {
    resolve: {
      conditions: ["dev-source"],
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "packages/*/src/**/*.{test,spec}.{ts,tsx}",
      "packages/*/src/**/__tests__/**/*.{ts,tsx}",
      "packages/talak-web3/src/**/*.{test,spec}.{ts,tsx}",
      "packages/talak-web3/src/**/__tests__/**/*.{ts,tsx}",
      "apps/*/src/**/*.{test,spec}.{ts,tsx}",
      "apps/*/e2e/**/*.{ts,tsx}",
      "scripts/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "packages/*/src/**/*.{ts,tsx}",
        "packages/talak-web3/src/**/*.{ts,tsx}",
        "!packages/*/src/**/*.d.ts",
        "!packages/*/src/**/__tests__/**",
        "!packages/*/src/**/*.test.ts",
        "!packages/*/src/**/*.spec.ts",
      ],
      thresholds: {
        "packages/auth/": {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95,
        },

        "packages/core/": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "packages/rpc/": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        "packages/config/": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        "packages/errors/": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        "packages/": {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85,
        },
      },
    },
    testTimeout: 30000,
    retry: 1,
    pool: "threads",
  },
});
