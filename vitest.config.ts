import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'packages/*/src/**/*.{test,spec}.ts',
      'packages/*/src/**/__tests__/**/*.ts',
      'apps/*/src/**/*.{test,spec}.ts',
      'apps/*/e2e/**/*.ts',
      'scripts/**/*.{test,spec}.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts'
    ],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'packages/*/src/**/*.ts',
        '!packages/*/src/**/*.d.ts',
        '!packages/*/src/**/__tests__/**',
        '!packages/*/src/**/*.test.ts',
        '!packages/*/src/**/*.spec.ts'
      ],
      thresholds: {

        'packages/talak-web3-auth/': {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95
        },

        'packages/talak-web3-core/': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90
        },
        'packages/talak-web3-rpc/': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },
        'packages/talak-web3-config/': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },
        'packages/talak-web3-errors/': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },
        'packages/talak-web3-middleware/': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },

        'packages/': {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        }
      },
    },

    testTimeout: 30000,

    retry: 1,

    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    alias: {
        '@talak-web3/core': path.resolve(__dirname, './packages/talak-web3-core/src/index.ts'),
        '@talak-web3/config': path.resolve(__dirname, './packages/talak-web3-config/src/index.ts'),
        '@talak-web3/hooks': path.resolve(__dirname, './packages/talak-web3-hooks/src/index.tsx'),
        '@talak-web3/types': path.resolve(__dirname, './packages/talak-web3-types/src/index.ts'),
        '@talak-web3/errors': path.resolve(__dirname, './packages/talak-web3-errors/src/index.ts'),
        '@talak-web3/utils': path.resolve(__dirname, './packages/talak-web3-utils/src/index.ts'),
        '@talak-web3/rpc': path.resolve(__dirname, './packages/talak-web3-rpc/src/index.ts'),
        '@talak-web3/adapters': path.resolve(__dirname, './packages/talak-web3-adapters/src/index.ts'),
        '@talak-web3/tx': path.resolve(__dirname, './packages/talak-web3-tx/src/index.ts'),
        '@talak-web3/auth': path.resolve(__dirname, './packages/talak-web3-auth/src/index.ts'),
        '@talak-web3/ai': path.resolve(__dirname, './packages/talak-web3-ai/src/index.ts'),
      },
  },
});
