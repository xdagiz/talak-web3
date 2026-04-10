/**
 * Test context helpers
 */

import type { TestContext } from '../types.js';

/**
 * Create a test context with cleanup support
 */
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
      // Run cleanup in reverse order
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

/**
 * Setup test context with automatic cleanup
 * Use this in before/after hooks
 */
export function setupTestContext(): TestContext {
  const context = createTestContext();
  
  // Register cleanup on process exit (for Node.js)
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

/**
 * Generate a unique test ID
 */
function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an isolated test environment
 * Each test gets its own Redis database, etc.
 */
export async function createIsolatedTestEnvironment(): Promise<{
  context: TestContext;
  redisDb: number;
}> {
  const context = createTestContext();
  
  // Use a random Redis DB number (0-15)
  const redisDb = Math.floor(Math.random() * 16);
  
  return {
    context,
    redisDb,
  };
}
