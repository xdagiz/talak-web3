type RequestStateStore = WeakMap<object, unknown>;

interface RequestStateStorage {
  run<T>(store: RequestStateStore, fn: () => T): T;
  getStore(): RequestStateStore | undefined;
}

const SHARED_FALLBACK_STORE: RequestStateStore = new WeakMap();

const PASS_THROUGH_STORAGE: RequestStateStorage = {
  run<T>(_store: RequestStateStore, fn: () => T): T {
    return fn();
  },
  getStore(): RequestStateStore | undefined {
    return SHARED_FALLBACK_STORE;
  },
};

const NODE_ASYNC_HOOKS = "node:async_hooks";

let storagePromise: Promise<RequestStateStorage> | null = null;
let loadedStorage: RequestStateStorage | null = null;

async function loadStorage(): Promise<RequestStateStorage> {
  const isNode =
    typeof process !== "undefined" && typeof process.versions?.node === "string";
  if (!isNode) return PASS_THROUGH_STORAGE;
  try {
    const mod = (await import(
      /* @vite-ignore */ NODE_ASYNC_HOOKS
    )) as typeof import("node:async_hooks");
    return new mod.AsyncLocalStorage<RequestStateStore>();
  } catch {
    return PASS_THROUGH_STORAGE;
  }
}

async function getStorage(): Promise<RequestStateStorage> {
  if (!storagePromise) {
    storagePromise = loadStorage();
  }
  return storagePromise;
}

function noRequestStateError(): Error {
  return new Error(
    "No request state found. Call runWithRequestState or runWithRequestStateAsync first.",
  );
}

function getCurrentStore(): RequestStateStore {
  const storage = loadedStorage;
  if (!storage) throw noRequestStateError();
  const store = storage.getStore();
  if (!store) throw noRequestStateError();
  return store;
}

/**
 * Enters a new request scope and runs `fn` inside it. Async because loading
 * the storage provider (Node `async_hooks`) is a lazy dynamic import.
 */
export async function runWithRequestState<T>(fn: () => T): Promise<T> {
  const storage = await getStorage();
  loadedStorage = storage;
  return storage.run(new WeakMap(), fn);
}

/** Async variant of {@link runWithRequestState} for async handlers. */
export async function runWithRequestStateAsync<T>(fn: () => Promise<T>): Promise<T> {
  const storage = await getStorage();
  loadedStorage = storage;
  return storage.run(new WeakMap(), fn);
}

export interface RequestState<T> {
  get(): T;
  set(value: T): void;
}

export function defineRequestState<T>(initFn: () => T): RequestState<T> {
  const ref = Object.freeze({});

  return {
    get() {
      const store = getCurrentStore();
      if (!store.has(ref)) {
        store.set(ref, initFn());
      }
      return store.get(ref) as T;
    },
    set(value) {
      getCurrentStore().set(ref, value);
    },
  };
}
