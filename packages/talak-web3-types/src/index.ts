export type ChainId = number;

export type Hex = `0x${string}`;

export type Address = Hex;

export type UnixMs = number;

export interface Logger {

  info(message: string, ...args: unknown[]): void;

  warn(message: string, ...args: unknown[]): void;

  error(message: string, ...args: unknown[]): void;

  debug(message: string, ...args: unknown[]): void;

}

export interface NonceStore {
  create(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  consume(address: string, nonce: string): Promise<boolean>;
}

export interface RefreshSession {
  id: string;
  address: string;
  chainId: number;
  hash: string;
  expiresAt: number;
  revoked: boolean;
}

export interface RefreshStore {
  create(address: string, chainId: number, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  revoke(token: string): Promise<void>;
  lookup(token: string): Promise<RefreshSession | null>;
}

export interface RevocationStore {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

export interface RpcOptions {

  retries?: number;

  timeout?: number;

  failover?: boolean;

}

export interface IRpc {

  request<T = unknown>(method: string, params?: unknown[], options?: RpcOptions): Promise<T>;

  pauseHealthChecks(): void;

  resumeHealthChecks(intervalMs?: number): void;

  stop(): void;

}

export interface RpcCache {

  get<T = unknown>(key: string): T | undefined;

  set<T = unknown>(key: string, value: T, ttlMs?: number): void;

  delete(key: string): void;

  clear(): void;

}

export interface IAuth {

  coldStart(): Promise<void>;

  validateJwt(token: string): Promise<boolean>;

}

export interface TalakWeb3Auth extends IAuth {

  loginWithSiwe(message: string, signature: string): Promise<{ accessToken: string; refreshToken: string }>;

  createSession(address: string, chainId: number): Promise<string>;

  verifySession(token: string): Promise<{ address: string; chainId: number }>;

  revokeSession(token: string): Promise<void>;

  generateNonce(): string;

}

export type TalakWeb3EventsMap = {

  'plugin-load': { name: string };

  'rpc-error': { endpoint: string; error: Error; attempt: number };

  'chain-changed': number;

  'chain-switch': number;

  'account-changed': string | null;

  'tx:gasless-start': { to: string; data: string };

  'tx:gasless-success': { hash: string };

  'tx:gasless-error': { error: unknown };

  'storage:query-start': { sql: string; params: unknown[] };

  'storage:query-end': { sql: string; results: unknown[] };

  'identity:profile-create': { did: string };

  'identity:profile-created': { id: string };

  'ai:run-start': { input: unknown };

  'ai:run-end': { output: unknown };

}

export interface IHookRegistry<Events extends Record<string, unknown> = TalakWeb3EventsMap> {

  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void;

  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;

  emit<K extends keyof Events>(event: K, data: Events[K]): void;

  clear(): void;

}

export interface IMiddlewareChain<T = unknown, R = unknown> {

  use(handler: MiddlewareHandler<T, R>): void;

  execute(req: T, ctx: TalakWeb3Context, finalHandler: () => Promise<R>): Promise<R>;

}

export interface TalakWeb3BaseConfig {

  readonly chains: ReadonlyArray<{

    readonly id: number;

    readonly name: string;

    readonly rpcUrls: readonly string[];

    readonly nativeCurrency: {

      readonly name: string;

      readonly symbol: string;

      readonly decimals: number;

    };

    readonly testnet: boolean;

    readonly blockExplorers?: ReadonlyArray<{ readonly name: string; readonly url: string }>;

  }>;

  readonly debug: boolean;

  readonly allowedOrigins?: readonly string[];

  readonly rpc: { readonly retries: number; readonly timeout: number };

  readonly plugins?: ReadonlyArray<unknown>;

  readonly auth?: {
    readonly domain?: string;
    readonly uri?: string;
    readonly version?: string;
    readonly nonceStore?: NonceStore;
    readonly refreshStore?: RefreshStore;
    readonly revocationStore?: RevocationStore;
    readonly accessTtlSeconds?: number;
    readonly refreshTtlSeconds?: number;
  };

  readonly ai?: { readonly apiKey: string; readonly baseUrl?: string; readonly model?: string };

  readonly ceramic?: { readonly nodeUrl: string; readonly seed?: string };

  readonly tableland?: { readonly privateKey?: string; readonly network?: string };

}

export interface TalakWeb3Plugin {

  name: string;

  version: string;

  dependencies?: string[];

  setup(ctx: TalakWeb3Context): void | Promise<void>;

  onBeforeRequest?(req: unknown): Promise<void>;

  onAfterResponse?(res: unknown): Promise<void>;

  onChainChanged?(chainId: number): void;

  onAccountChanged?(address: string | null): void;

  teardown?(): void | Promise<void>;

}

export type MiddlewareHandler<T = unknown, R = unknown> = (

  req: T,

  next: () => Promise<R>,

  ctx: TalakWeb3Context,

) => Promise<R>;

export interface TalakWeb3Middleware {

  name: string;

  onRequest?: MiddlewareHandler;

  onResponse?: MiddlewareHandler;

}

export interface TalakWeb3Context {

  readonly config: TalakWeb3BaseConfig;

  readonly hooks: IHookRegistry<TalakWeb3EventsMap>;

  readonly plugins: Map<string, TalakWeb3Plugin>;

  readonly rpc: IRpc;

  readonly auth: TalakWeb3Auth;

  readonly cache: RpcCache;

  readonly logger: Logger;

  readonly requestChain: IMiddlewareChain<unknown, unknown>;

  readonly responseChain: IMiddlewareChain<unknown, unknown>;

  adapters?: Record<string, unknown>;

}

export interface TalakWeb3Instance {

  readonly config: TalakWeb3BaseConfig;

  readonly hooks: IHookRegistry<TalakWeb3EventsMap>;

  readonly context: TalakWeb3Context;

  init(): Promise<void>;

  destroy(): Promise<void>;

}

export type ToolDefinition = {
  name: string;
  description?: string;

  parameters: Record<string, unknown>;
  handler: (input: unknown) => Promise<unknown>;
};

export type AgentRunInput = {
  prompt: string;
  tools?: ToolDefinition[];
};

export type AgentRunOutput = {
  text: string;
  toolCalls?: Array<{ tool: string; input: unknown; output?: unknown }>;
};

export interface AiAgent {
  run(input: AgentRunInput): Promise<AgentRunOutput>;

  runStream?(input: AgentRunInput): AsyncIterable<{ type: 'text-delta'; delta: string } | { type: 'done'; output: AgentRunOutput }>;
}

export type AnalyticsEvent = {
  name: string;
  tsMs: number;
  properties?: Record<string, unknown>;
};

export interface AnalyticsSink {
  ingest(events: AnalyticsEvent[]): Promise<void>;
}

export type Role = "member" | "admin" | "owner";

export type Organization = {
  id: string;
  name: string;
};

export interface OrgGate {
  hasRole(input: { orgId: string; address: string; role: Role }): Promise<boolean>;
}
