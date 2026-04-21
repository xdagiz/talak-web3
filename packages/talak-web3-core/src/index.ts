import { validateConfig } from '@talak-web3/config';
import { HookRegistry } from '@talak-web3/hooks';
import type { TalakWeb3BaseConfig, TalakWeb3Context, TalakWeb3EventsMap, TalakWeb3Instance, TalakWeb3Plugin, Logger, RpcCache } from '@talak-web3/types';
import { TalakWeb3Error } from '@talak-web3/errors';
import { MiddlewareChain } from './middleware.js';
import { UnifiedRpc } from '@talak-web3/rpc';
import { SecurityInvariant, securityMiddleware } from './security.js';
import { TalakWeb3Auth, type NonceStore, type RefreshStore, type RevocationStore } from '@talak-web3/auth';

class ConsoleLogger implements Logger {
  private readonly structured: boolean;

  constructor(structured = process.env['LOG_FORMAT'] === 'json') {
    this.structured = structured;
  }

  private formatMessage(level: string, message: string, args: unknown[]): string | object {
    if (this.structured) {
      return JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        args: args.length > 0 ? args : undefined,
      });
    }
    return message;
  }

  info(message: string, ...args: unknown[]): void {
    const output = this.formatMessage('info', message, args);
    if (this.structured) {
      console.log(output);
    } else {
      console.info('[talak-web3]', message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    const output = this.formatMessage('warn', message, args);
    if (this.structured) {
      console.warn(output);
    } else {
      console.warn('[talak-web3]', message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    const output = this.formatMessage('error', message, args);
    if (this.structured) {
      console.error(output);
    } else {
      console.error('[talak-web3]', message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env['NODE_ENV'] !== 'production') {
      const output = this.formatMessage('debug', message, args);
      if (this.structured) {
        console.debug(output);
      } else {
        console.debug('[talak-web3]', message, ...args);
      }
    }
  }
}

class TtlCache implements RpcCache {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize: number;
  private insertionOrder: string[] = [];

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return undefined; }
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlMs = 60_000): void {

    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      this.evictOldest();
    }

    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });

    if (!this.insertionOrder.includes(key)) {
      this.insertionOrder.push(key);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
    const idx = this.insertionOrder.indexOf(key);
    if (idx > -1) this.insertionOrder.splice(idx, 1);
  }

  clear(): void {
    this.store.clear();
    this.insertionOrder = [];
  }

  private evictOldest(): void {

    const oldestKey = this.insertionOrder.shift();
    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }
}

export type { TalakWeb3Instance } from '@talak-web3/types';

export function createTalakWeb3(input: unknown = {}): TalakWeb3Instance {
  const normalizedInput = normalizeConfigInput(input);
  SecurityInvariant.checkSecrets(normalizedInput);
  const config = validateConfig(normalizedInput) as any as TalakWeb3BaseConfig;
  const logger = new ConsoleLogger();
  const hooks = new HookRegistry<TalakWeb3EventsMap>();
  const plugins = new Map<string, TalakWeb3Plugin>();
  const requestChain = new MiddlewareChain();
  const responseChain = new MiddlewareChain();

  const cache = new TtlCache();

  let auth: TalakWeb3Auth;

  if (config.auth instanceof TalakWeb3Auth) {
    auth = config.auth;
  } else {
    const authConfig = config.auth ?? {};
    const authOptions: any = {};

    if (authConfig.nonceStore) authOptions.nonceStore = authConfig.nonceStore;
    if (authConfig.refreshStore) authOptions.refreshStore = authConfig.refreshStore;
    if (authConfig.revocationStore) authOptions.revocationStore = authConfig.revocationStore;
    if (authConfig.accessTtlSeconds !== undefined) authOptions.accessTtlSeconds = authConfig.accessTtlSeconds;
    if (authConfig.refreshTtlSeconds !== undefined) authOptions.refreshTtlSeconds = authConfig.refreshTtlSeconds;
    if (authConfig.domain) authOptions.expectedDomain = authConfig.domain;

    auth = new TalakWeb3Auth(authOptions);
  }

  const endpoints = config.chains.flatMap((c, priority) =>
    c.rpcUrls.map(url => ({ url, priority })),
  );

  const contextShape: Omit<TalakWeb3Context, 'rpc'> = {
    config,
    hooks,
    plugins,
    auth,
    cache,
    logger,
    requestChain,
    responseChain,
  };

  const bootstrapContext: TalakWeb3Context = {
    ...contextShape,
    rpc: {
      request: async () => {
        throw new TalakWeb3Error('RPC not initialized', { code: 'RPC_NOT_READY', status: 500 });
      },
      pauseHealthChecks: () => {
        throw new TalakWeb3Error('RPC not initialized', { code: 'RPC_NOT_READY', status: 500 });
      },
      resumeHealthChecks: () => {
        throw new TalakWeb3Error('RPC not initialized', { code: 'RPC_NOT_READY', status: 500 });
      },
      stop: () => {

      },
    },
  };
  const rpc = new UnifiedRpc(bootstrapContext, endpoints);

  const context: TalakWeb3Context = {
    ...contextShape,
    rpc,
  };

  rpc.ctx = context;
  requestChain.use(securityMiddleware);

  const instance: TalakWeb3Instance = {
    config: context.config,
    hooks,
    context,

    async init() {
      await auth.coldStart();

      for (const plugin of config.plugins ?? []) {
        if (!isTalakWeb3Plugin(plugin)) {
          throw new TalakWeb3Error('Invalid plugin config: expected TalakWeb3Plugin object', {
            code: 'PLUGIN_INVALID',
            status: 400,
          });
        }
        if (plugins.has(plugin.name)) {
          throw new TalakWeb3Error(`Plugin "${plugin.name}" already registered`, {
            code: 'PLUGIN_DUPLICATE',
            status: 400,
          });
        }
        await plugin.setup(context);
        plugins.set(plugin.name, plugin);
        hooks.emit('plugin-load', { name: plugin.name });
        logger.info(`Plugin loaded: ${plugin.name}@${plugin.version}`);
      }
    },

    async destroy() {
      for (const plugin of plugins.values()) {
        if (plugin.teardown) {
          await plugin.teardown();
        }
      }
      plugins.clear();
      hooks.clear();
    },
  };

  return instance;
}

export function talakWeb3(input: unknown = {}): TalakWeb3Instance {
  return createTalakWeb3(input);
}

export function __resetTalakWeb3(): void {

}

function isTalakWeb3Plugin(input: unknown): input is TalakWeb3Plugin {
  if (!input || typeof input !== 'object') return false;
  const rec = input as Record<string, unknown>;
  return (
    typeof rec['name'] === 'string' &&
    typeof rec['version'] === 'string' &&
    typeof rec['setup'] === 'function'
  );
}

function normalizeConfigInput(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const rec = input as Record<string, unknown>;
  const rawChains = Array.isArray(rec['chains']) ? rec['chains'] : undefined;
  if (!rawChains) return input;

  const chainCurrencyMap: Record<number, { symbol: string; name: string }> = {
    1: { symbol: 'ETH', name: 'Ether' },
    137: { symbol: 'POL', name: 'Polygon' },
    10: { symbol: 'ETH', name: 'Ether' },
    42161: { symbol: 'ETH', name: 'Ether' },
    56: { symbol: 'BNB', name: 'BNB' },
    43114: { symbol: 'AVAX', name: 'Avalanche' },
  };

  const chains = rawChains.map((chain, i) => {
    if (!chain || typeof chain !== 'object') return chain;
    const c = chain as Record<string, unknown>;
    const id = typeof c['id'] === 'number' ? c['id'] : i + 1;
    const currency = chainCurrencyMap[id] ?? { symbol: 'ETH', name: 'Ether' };
    return {
      ...c,
      name: typeof c['name'] === 'string' && c['name'].length > 0 ? c['name'] : `Chain ${id}`,
      nativeCurrency: typeof c['nativeCurrency'] === 'object' && c['nativeCurrency'] !== null
        ? c['nativeCurrency']
        : { name: currency.name, symbol: currency.symbol, decimals: 18 },
    };
  });

  return { ...rec, chains };
}
