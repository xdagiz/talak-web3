export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 100, backoff = 2, onRetry } = options;

  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        onRetry?.(lastError, attempt + 1);
        await sleep(currentDelay);
        currentDelay *= backoff;
      }
    }
  }

  throw lastError!;
}

export async function parallel<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number = 5
): Promise<void> {
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item);
    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}
