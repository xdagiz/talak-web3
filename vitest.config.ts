import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  root: path.resolve(__dirname),
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
    alias: {
      "@talak-web3/core": path.resolve(__dirname, "./packages/core/src/index.ts"),
      "@talak-web3/config": path.resolve(__dirname, "./packages/config/src/index.ts"),
      "@talak-web3/hooks": path.resolve(__dirname, "./packages/hooks/src/index.ts"),
      "@talak-web3/client": path.resolve(__dirname, "./packages/client/src/index.ts"),
      "@talak-web3/types": path.resolve(__dirname, "./packages/types/src/index.ts"),
      "@talak-web3/errors": path.resolve(__dirname, "./packages/errors/src/index.ts"),
      "@talak-web3/rate-limit": path.resolve(__dirname, "./packages/rate-limit/src/index.ts"),
      "@talak-web3/utils": path.resolve(__dirname, "./packages/utils/src/index.ts"),
      "@talak-web3/rpc": path.resolve(__dirname, "./packages/rpc/src/index.ts"),
      "@talak-web3/adapters": path.resolve(__dirname, "./packages/adapters/src/index.ts"),
      "@talak-web3/tx": path.resolve(__dirname, "./packages/tx/src/index.ts"),
      "@talak-web3/auth": path.resolve(__dirname, "./packages/auth/src/index.ts"),
      "@talak-web3/ai": path.resolve(__dirname, "./packages/ai/src/index.ts"),
      "@talak-web3/realtime": path.resolve(__dirname, "./packages/realtime/src/index.ts"),
      "@talak-web3/templates": path.resolve(__dirname, "./packages/templates/src/index.ts"),
    },
  },
});
