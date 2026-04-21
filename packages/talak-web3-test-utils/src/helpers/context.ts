import type { TestContext } from '../types.js';

export function createTestContext(): TestContext {
  const cleanupFns: (() => Promise<void> | void)[] = [];

  return {
    testId: generateTestId(),
    startTime: Date.now(),
    cleanup: cleanupFns,
    addCleanup(fn: () => Promise<void> | void): void {
      cleanupFns.push(fn);
    },
    async runCleanup(): Promise<void> {

      for (let i = cleanupFns.length - 1; i >= 0; i--) {
        try {
          const fn = cleanupFns[i];
          if (fn) await fn();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
      cleanupFns.length = 0;
    },
  };
}

export function setupTestContext(): TestContext {
  const context = createTestContext();

  if (typeof process !== 'undefined') {
    const cleanupHandler = async () => {
      await context.runCleanup();
    };

    process.on('beforeExit', cleanupHandler);
    process.on('SIGINT', async () => {
      await cleanupHandler();
      process.exit(0);
    });

    context.addCleanup(() => {
      process.off('beforeExit', cleanupHandler);
    });
  }

  return context;
}

function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function createIsolatedTestEnvironment(): Promise<{
  context: TestContext;
  redisDb: number;
}> {
  const context = createTestContext();

  const redisDb = Math.floor(Math.random() * 16);

  return {
    context,
    redisDb,
  };
}
