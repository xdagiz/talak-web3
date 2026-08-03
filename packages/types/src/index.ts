/** Numeric chain ID (EIP-155). */
export type ChainId = number;

/** 0x-prefixed hex string. */
export type Hex = `0x${string}`;

/** EVM address (0x-prefixed, 20 bytes). */
export type Address = Hex;

/** Unix timestamp in milliseconds. */
export type UnixMs = number;

/** Minimal logging interface. */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/** Store for SIWE nonce creation and single-use consumption. */
export interface NonceStore {
  create(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  consume(address: string, nonce: string): Promise<boolean>;
}

/** A refresh-session record stored by the refresh store. */
export interface RefreshSession {
  id: string;
  address: string;
  chainId: number;
  hash: string;
  expiresAt: number;
  revoked: boolean;
}

/** Persistent store for refresh-token CRUD and rotation. */
export interface RefreshStore {
  create(
    address: string,
    chainId: number,
    ttlMs: number,
  ): Promise<{ token: string; session: RefreshSession }>;
  rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  revoke(token: string): Promise<void>;
  lookup(token: string): Promise<RefreshSession | null>;
}

/** Store for tracking revoked JWTs (jti) and global invalidation timestamps. */
export interface RevocationStore {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
  setGlobalInvalidationTime(ts: number): Promise<void>;
  getGlobalInvalidationTime(): Promise<number>;
}

/** JSON-RPC endpoint with health metadata. */
export interface RpcEndpoint {
  url: string;
  chainId: number;
  providerId?: string;
  weight?: number;
  priority?: number;
  health?: {
    status: "up" | "down";
    latency: number;
    lastChecked: number;
  };
}

/** Options for individual JSON-RPC requests. */
export interface RpcOptions {
  retries?: number;
  timeout?: number;
  failover?: boolean;
}

/** JSON-RPC client interface. */
export interface IRpc {
  request<T = unknown>(
    chainId: number,
    method: string,
    params?: unknown[],
    options?: RpcOptions,
  ): Promise<T>;
  getProvider(chainId: number): Promise<RpcEndpoint | undefined>;
  pauseHealthChecks(): void;
  resumeHealthChecks(intervalMs?: number): void;
  stop(): void;
}

/** LRU-like RPC response cache. */
export interface RpcCache {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
}

/** Auth provider interface for JWT validation. */
export interface IAuth {
  coldStart(): Promise<void>;
  validateJwt(token: string): Promise<boolean>;
}

/** JWT session payload. */
export interface SessionPayload {
  address: string;
  chainId: number;
  contextHash?: string;
  ipSubnet?: string;
}

/** JSON Web Key (RS256). */
export interface JsonWebKey {
  kty: "RSA";
  use: "sig";
  alg: "RS256";
  kid: string;
  n: string;
  e: string;
  x5t?: string;
  x5c?: string[];
  "x5t#S256"?: string;
}

/** JWKS endpoint response. */
export interface JwksResponse {
  keys: JsonWebKey[];
}

/** TalakWeb3 auth handler — SIWE login, JWT sign/verify, session lifecycle. */
export interface TalakWeb3Auth extends IAuth {
  forceGlobalInvalidation(): Promise<void>;
  signJwt(payload: SessionPayload): Promise<string>;
  loginWithSiwe(
    message: string,
    signature: string,
    context?: { ip: string; userAgent: string },
  ): Promise<{ accessToken: string; refreshToken: string }>;
  createSession(address: string, chainId: number): Promise<string>;
  getJwks(): Promise<JwksResponse>;
  verifySession(
    token: string,
    context?: { ip: string; userAgent: string },
  ): Promise<SessionPayload>;
  revokeSession(accessToken: string, refreshToken?: string): Promise<void>;
  generateNonce(): string;
  createNonce(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  refresh(
    refreshToken: string,
    context?: { ip: string; userAgent: string },
  ): Promise<{ accessToken: string; refreshToken: string }>;
}

/** Event map for TalakWeb3 hook registry. */
export type TalakWeb3EventsMap = {
  "plugin-load": { name: string };
  "rpc-error": {
    chainId: number;
    endpoint: string;
    error: Error;
    attempt: number;
  };
  "rpc:request": {
    chainId: number;
    method: string;
    duration: number;
    endpoint?: string | undefined;
  };
  "rpc:failover": { from: string; to: string; chainId: number; method: string };
  "chain-changed": number;
  "chain-switch": number;
  "account-changed": string | null;
  "tx:gasless-start": { to: string; data: string };
  "tx:gasless-success": { hash: string };
  "tx:gasless-error": { error: unknown };
  "storage:query-start": { sql: string; params: unknown[] };
  "storage:query-end": { sql: string; results: unknown[] };
  "identity:profile-create": { did: string };
  "identity:profile-created": { id: string };
  "ai:run-start": { input: unknown };
  "ai:run-end": { output: unknown };
};

/** Typed hook registry for emitting and subscribing to SDK events. */
export interface IHookRegistry<Events extends Record<string, unknown> = TalakWeb3EventsMap> {
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void;
  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
  emit<K extends keyof Events>(event: K, data: Events[K]): void;
  clear(): void;
}

/** Middleware chain that executes handlers sequentially. */
export interface IMiddlewareChain<T = unknown, R = unknown> {
  use(handler: MiddlewareHandler<T, R>): void;
  execute(req: T, ctx: TalakWeb3Context, finalHandler: () => Promise<R>): Promise<R>;
}

/** Full SDK configuration passed to `createTalakWeb3()`. All fields are readonly. */
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
  readonly plugins?: ReadonlyArray<TalakWeb3Plugin>;
  readonly auth?:
    | TalakWeb3Auth
    | {
        readonly domain?: string;
        readonly uri?: string;
        readonly version?: string;
        readonly nonceStore?: NonceStore;
        readonly refreshStore?: RefreshStore;
        readonly revocationStore?: RevocationStore;
        readonly accessTtlSeconds?: number;
        readonly refreshTtlSeconds?: number;
      };
  readonly ai?: {
    readonly apiKey?: string;
    readonly baseUrl?: string;
    readonly model?: string;
    readonly mockMode?: boolean;
  };
  readonly ceramic?: { readonly nodeUrl: string; readonly seed?: string };
  readonly tableland?: { readonly privateKey?: string; readonly network?: string };
}

/** Lifecycle hooks for extending TalakWeb3. `setup` is required; middleware hooks are optional. */
export interface TalakWeb3Plugin {
  name: string;
  version: string;
  dependencies?: string[];
  setup(ctx: TalakWeb3Context): void | Promise<void>;
  onBeforeRequest?(req: unknown, ctx: TalakWeb3Context): Promise<void>;
  onAfterResponse?(res: unknown, ctx: TalakWeb3Context): Promise<void>;
  onChainChanged?(chainId: number): void;
  onAccountChanged?(address: string | null): void;
  teardown?(): void | Promise<void>;
  /** Optional liveness probe; returning false flags the plugin as unhealthy in healthCheck(). */
  health?(): boolean;
}

/** Middleware handler function. */
export type MiddlewareHandler<T = unknown, R = unknown> = (
  req: T,
  next: () => Promise<R>,
  ctx: TalakWeb3Context,
) => Promise<R>;

/** Named middleware with optional request/response hooks. */
export interface TalakWeb3Middleware {
  name: string;
  onRequest?: MiddlewareHandler;
  onResponse?: MiddlewareHandler;
}

/** Request-scoped context passed to middleware, hooks, and plugins. */
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
  readonly requestId?: string;
  adapters?: Record<string, unknown>;
}

/** Known preset names for quick-start configurations. */
export type PresetName = "mainnet" | "polygon" | "arbitrum" | "optimism" | "base" | "avalanche";

/**
 * Input type for `createTalakWeb3()` / `talakWeb3()`.
 * All fields are optional — Zod defaults fill missing values.
 */
export type TalakWeb3Input = Partial<TalakWeb3BaseConfig> & { preset?: PresetName };

/** Returned by `createTalakWeb3()`. Must call `init()` before handling requests. */
export interface TalakWeb3Instance {
  readonly config: TalakWeb3BaseConfig;
  readonly hooks: IHookRegistry<TalakWeb3EventsMap>;
  readonly context: TalakWeb3Context;
  readonly handler: (request: Request) => Promise<Response>;
  init(): Promise<void>;
  destroy(): Promise<void>;
  shutdown(): Promise<void>;
  healthCheck(): { status: "ok" | "degraded" | "error"; checks: Record<string, boolean> };
}

/** AI tool definition for agent tool-calling. */
export type ToolDefinition = {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
  handler: (input: unknown) => Promise<unknown>;
};

/** Input for an AI agent run. */
export type AgentRunInput = {
  prompt: string;
  tools?: ToolDefinition[];
};

/** Output from an AI agent run. */
export type AgentRunOutput = {
  text: string;
  toolCalls?: Array<{ tool: string; input: unknown; output?: unknown }>;
};

/** AI agent interface with optional streaming support. */
export interface AiAgent {
  run(input: AgentRunInput): Promise<AgentRunOutput>;
  runStream?(
    input: AgentRunInput,
  ): AsyncIterable<
    { type: "text-delta"; delta: string } | { type: "done"; output: AgentRunOutput }
  >;
}

/** Analytics event payload. */
export type AnalyticsEvent = {
  name: string;
  tsMs: number;
  properties?: Record<string, unknown>;
};

/** Analytics event sink for ingesting events. */
export interface AnalyticsSink {
  ingest(events: AnalyticsEvent[]): Promise<void>;
}

/** Organization member role. */
export type Role = "member" | "admin" | "owner";

/** Organization metadata. */
export type Organization = {
  id: string;
  name: string;
};

/** Organization access gate. */
export interface OrgGate {
  hasRole(input: { orgId: string; address: string; role: Role }): Promise<boolean>;
}
