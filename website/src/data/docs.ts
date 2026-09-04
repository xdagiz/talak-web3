export type DocSection = {
  slug: string;
  label: string;
  title: string;
  blurb: string;
  body: string;
  code?: { filename: string; language?: string; code: string };
  links?: { label: string; href: string }[];
};

export const DOC_SECTIONS: DocSection[] = [
  /* ──────────────────────────────────────────────────────────────────────
   * 1. QUICKSTART
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "quickstart",
    label: "Quickstart",
    title: "Quickstart",
    blurb:
      "Get up and running with talak-web3 in under 5 minutes — install, configure, and make your first RPC call.",
    body: `Every talak-web3 application begins with the talakWeb3() factory function exported from @talak-web3/core. This function creates a brand-new, isolated instance each time it is called — there is no global singleton, no shared state between instances, and no hidden side-effects. The returned TalakWeb3Instance exposes a context object that acts as the central dependency-injection container for every subsystem: auth, rpc, config, identity, tx, and events.

Before you can use the instance you must call instance.init(), which boots every registered plugin and subsystem in dependency order. Once init() resolves, the instance emits a "ready" event and you can safely call any method on any subsystem. When your process is shutting down, call instance.destroy() to flush pending writes, close open WebSocket connections, and release timers — this is especially important in serverless environments where cold starts are frequent.

Install the SDK with your preferred package manager. The unified talak-web3 package re-exports everything so you can prototype quickly, or install only the scoped packages you need (e.g. @talak-web3/auth, @talak-web3/rpc) for a smaller bundle. Node.js 22 or later is required. pnpm is the recommended package manager, but npm and yarn both work.

The minimum viable configuration requires at least one chain definition (an object with id, name, and rpcUrls) and an auth instance. For development you can use in-memory stores and HS256 tokens; in production you must supply RS256 key pairs and Redis-backed stores — the SDK will throw at boot time if you attempt to use in-memory stores with NODE_ENV=production.

Once init() completes, you can use the RPC subsystem to make JSON-RPC calls against any configured chain. The RPC client handles provider failover, retries, and health tracking automatically — if your primary provider goes down, requests transparently route to the next healthy endpoint in the pool.`,
    code: {
      filename: "app.ts",
      language: "typescript",
      code: `import { talakWeb3 } from "@talak-web3/core";
import { TalakWeb3Auth } from "@talak-web3/auth";
import { RpcClient } from "@talak-web3/rpc";

// 1. Create an instance with chain + auth config
const instance = talakWeb3({
  chains: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrls: ["https://rpc.ankr.com/eth", "https://eth.llamarpc.com"],
    },
    {
      id: 8453,
      name: "Base",
      rpcUrls: ["https://mainnet.base.org"],
    },
  ],
  auth: new TalakWeb3Auth({
    jwtPrivateKey: process.env.JWT_PRIVATE_KEY!,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY!,
  }),
});

// 2. Boot all subsystems
await instance.init();

// 3. Make an RPC call — failover is automatic
const rpc = new RpcClient({
  endpoints: instance.context.config.chains,
  ctx: instance.context,
});

const blockNumber = await rpc.request<string>(1, "eth_blockNumber");
console.log("Latest block:", parseInt(blockNumber, 16));

// 4. Clean shutdown
process.on("SIGTERM", () => instance.destroy());`,
    },
    links: [
      { label: "Installation guide", href: "/docs/installation" },
      { label: "Architecture overview", href: "/docs/architecture" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 2. INSTALLATION
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "installation",
    label: "Installation",
    title: "Installation",
    blurb:
      "Install the SDK via npm, scaffold with the CLI, or cherry-pick individual scoped packages.",
    body: `There are three ways to add talak-web3 to your project, each suited to a different stage of development.

The fastest path is the unified meta-package: run npm install talak-web3 (or pnpm add talak-web3). This single dependency re-exports every scoped package through subpath exports — talak-web3/auth maps to @talak-web3/auth, talak-web3/rpc maps to @talak-web3/rpc, and so on. Tree-shaking ensures you only ship the code you actually import, so there is no bundle-size penalty for using the meta-package.

For production applications that want explicit control over their dependency tree, install scoped packages individually: pnpm add @talak-web3/core @talak-web3/auth @talak-web3/rpc @talak-web3/config. This makes version pinning and audit trails clearer, especially in monorepo setups where different services may need different subsets of the SDK.

The third method is the CLI scaffolder. Run npx talak-web3 init my-dapp --template nextjs to generate a complete project with pre-configured auth routes, RPC proxy, environment variables, and a working dashboard page. Available templates include nextjs, hono, react-native, and minimal. The CLI binary is published as @talak-web3/cli and is also available as talak and create-talak-web3 — all three names are equivalent.

After installation, copy .env.example to .env and fill in the required values. At minimum you need JWT_PRIVATE_KEY and JWT_PUBLIC_KEY (RS256 PEM-encoded key pair) for auth, and at least one RPC endpoint URL. For production, add REDIS_URL — the SDK refuses to boot with in-memory auth stores when NODE_ENV=production. Generate an RS256 key pair with: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem.

The SDK requires Node.js 22 or later. The monorepo itself uses pnpm (version managed by Corepack), but your consumer project can use any package manager.`,
    code: {
      filename: "setup.sh",
      language: "bash",
      code: `# Option 1: Unified meta-package
npm install talak-web3

# Option 2: Individual scoped packages
pnpm add @talak-web3/core @talak-web3/auth @talak-web3/rpc @talak-web3/config

# Option 3: CLI scaffold
npx talak-web3 init my-dapp --template nextjs
cd my-dapp && pnpm install && pnpm dev

# Generate RS256 keys for production auth
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Required environment variables (.env)
# JWT_PRIVATE_KEY="$(cat private.pem)"
# JWT_PUBLIC_KEY="$(cat public.pem)"
# REDIS_URL=redis://localhost:6379
# ETH_RPC_URL=https://rpc.ankr.com/eth`,
    },
    links: [
      { label: "CLI reference", href: "/docs/cli" },
      { label: "Environment variables", href: "/docs/configuration" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 3. ARCHITECTURE
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "architecture",
    label: "Architecture",
    title: "Architecture",
    blurb:
      "Understand the modular architecture: core factory, plugin system, context injection, and event-driven lifecycle.",
    body: `talak-web3 is organized as a pnpm monorepo with 26+ scoped packages, each responsible for a single concern. At the center sits @talak-web3/core, which exports the talakWeb3() factory function. Every other package — auth, rpc, tx, identity, realtime, rate-limit, and more — plugs into core through a shared context object, making the system modular and testable without tight coupling.

The TalakWeb3Context is the dependency-injection container that flows through every subsystem. When you call talakWeb3({ chains, auth, plugins }), the factory creates a fresh context, attaches the configured subsystems, and returns a TalakWeb3Instance. The context holds references to auth (session management), rpc (provider routing), config (chain definitions and feature flags), identity (ENS resolution), tx (transaction building), and events (structured event emission). Any subsystem can access any other through ctx — for example, the RPC client reads chain config from ctx.config and logs errors through ctx.events.

Plugins are the primary extension mechanism. A plugin is any object that satisfies the TalakWeb3Plugin interface: { name: string, version?: string, setup(ctx: TalakWeb3Context): void | Promise<void> }. During instance.init(), the core boots plugins in registration order, passing each the shared context. This lets plugins register middleware, add new subsystems, or decorate existing ones. The official plugin registry (@talak-web3/plugins) ships connectors for additional chains, wallet providers, storage backends, and AI providers.

The instance lifecycle follows four phases: construction (talakWeb3()), initialization (init()), operation (ready event), and teardown (destroy()). If any plugin or subsystem throws during init(), the instance emits an "error" event and rolls back already-initialized subsystems. This fail-fast behavior prevents partially-initialized instances from handling traffic.

The build system uses Turborepo for parallel task orchestration across the monorepo. Each package is compiled by tsdown into dual ESM + CJS format targeting ES2024, with declaration files and source maps. TypeScript is configured in strict mode with verbatimModuleSyntax and exactOptionalPropertyTypes. Tests run through Vitest with V8 coverage — the auth package requires 95% coverage, core requires 90%, and all other packages require 80%.`,
    code: {
      filename: "plugin.ts",
      language: "typescript",
      code: `import type { TalakWeb3Plugin, TalakWeb3Context } from "@talak-web3/types";

// Define a custom plugin
const metricsPlugin: TalakWeb3Plugin = {
  name: "custom-metrics",
  version: "1.0.0",

  async setup(ctx: TalakWeb3Context) {
    // Access other subsystems through context
    const startTime = Date.now();

    // Listen to RPC events for latency tracking
    ctx.events.on("rpc:request", ({ method, chainId, latencyMs }) => {
      console.log(\`[metrics] \${method} on chain \${chainId}: \${latencyMs}ms\`);
    });

    // Listen to auth events
    ctx.events.on("auth:login", ({ address }) => {
      console.log(\`[metrics] Login from \${address}\`);
    });

    console.log(\`[metrics] Plugin booted in \${Date.now() - startTime}ms\`);
  },
};

// Register the plugin
const instance = talakWeb3({
  chains: [{ id: 1, name: "Ethereum", rpcUrls: ["https://rpc.ankr.com/eth"] }],
  auth: new TalakWeb3Auth({ /* ... */ }),
  plugins: [metricsPlugin],
});

await instance.init(); // Plugin setup() runs here`,
    },
    links: [
      { label: "Plugin system", href: "/docs/plugins" },
      { label: "Package ecosystem", href: "/packages" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 4. AUTHENTICATION (SIWE)
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "auth",
    label: "Authentication",
    title: "Authentication (SIWE)",
    blurb:
      "Server-side Sign-In with Ethereum with JWT sessions, atomic nonce consumption, refresh token rotation, and fail-closed Redis stores.",
    body: `The @talak-web3/auth package implements the complete Sign-In with Ethereum (EIP-4361) flow on the server side. It handles nonce generation, SIWE message parsing and signature verification, JWT issuance with RS256, session management, and refresh token rotation — all designed to be replay-resistant and production-hardened out of the box.

The TalakWeb3Auth class is the central entry point. Construct it with your RS256 key pair (jwtPrivateKey and jwtPublicKey), and optionally configure jwtAlgorithm (defaults to RS256, the only algorithm accepted in production), accessTokenTtl (default 15 minutes), refreshTokenTtl (default 7 days), and pluggable stores for nonces, sessions, and refresh tokens. The class exposes six core methods: generateNonce(), verifyNonce(), loginWithSiwe(), verifySession(), refreshSession(), and logout().

The SIWE login flow works as follows: (1) Your client calls your /auth/nonce endpoint, which calls auth.generateNonce() to create a cryptographically random nonce and store it with a TTL. (2) The client constructs a SIWE message containing the nonce, signs it with the user's wallet, and sends both to your /auth/login endpoint. (3) Your server calls auth.loginWithSiwe(message, signature), which first consumes the nonce atomically (marking it as used before checking the signature — this is critical for replay resistance), then verifies the SIWE signature, validates the domain and URI, and if everything passes, issues a JWT access token and a refresh token. The method returns { accessToken, refreshToken, address, chainId }.

Security is central to the design. Nonces are consumed before signature verification so that a replay of a valid message always fails — even if the attacker captured a valid signature, the nonce is already burned. Refresh tokens are rotated on every use: calling refreshSession() invalidates the old refresh token and issues a new pair. Calling logout() blacklists the access token and invalidates all associated refresh tokens. revokeAllSessions(address) is the nuclear option that invalidates every session for a given wallet address.

Auth stores are pluggable and environment-aware. For development, the package ships MemoryNonceStore, MemorySessionStore, and MemoryRefreshTokenStore — these store everything in process memory and are explicitly rejected when NODE_ENV=production. For production you must use RedisNonceStore, RedisSessionStore, and RedisRefreshTokenStore, which provide atomic operations, TTL-based expiry, and cluster support. If Redis goes down, the auth subsystem returns 503 Service Unavailable — it never falls back to in-memory stores. This fail-closed architecture is a deliberate security choice.

The JWT payload includes the wallet address, chain ID, issued-at timestamp, and expiration. RS256 (asymmetric) keys mean your backend signs tokens with the private key and any service can verify them with the public key — this is essential for microservice architectures where multiple services need to verify sessions without sharing a secret.`,
    code: {
      filename: "auth-setup.ts",
      language: "typescript",
      code: `import { TalakWeb3Auth } from "@talak-web3/auth";
import {
  RedisNonceStore,
  RedisSessionStore,
  RedisRefreshTokenStore,
} from "@talak-web3/auth/stores";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// Production-ready auth configuration
const auth = new TalakWeb3Auth({
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY!,
  jwtPublicKey: process.env.JWT_PUBLIC_KEY!,
  jwtAlgorithm: "RS256",
  accessTokenTtl: 900,      // 15 minutes
  refreshTokenTtl: 604800,  // 7 days
  nonceStore: new RedisNonceStore(redis, { ttlSeconds: 300 }),
  sessionStore: new RedisSessionStore(redis),
  refreshTokenStore: new RedisRefreshTokenStore(redis),
});

// 1. Generate nonce for client
const nonce = await auth.generateNonce();

// 2. Client signs SIWE message, then server verifies
const { accessToken, refreshToken, address, chainId } =
  await auth.loginWithSiwe(siweMessage, signature);

// 3. Verify session on subsequent requests
const payload = await auth.verifySession(accessToken);
console.log("Authenticated:", payload.address);

// 4. Refresh tokens (rotation — old token is invalidated)
const newTokens = await auth.refreshSession(refreshToken);

// 5. Logout (blacklists access token)
await auth.logout(accessToken);`,
    },
    links: [
      {
        label: "EIP-4361 specification",
        href: "https://eips.ethereum.org/EIPS/eip-4361",
      },
      { label: "Security guide", href: "/docs/security" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 5. RPC CLIENT
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "rpc",
    label: "RPC Client",
    title: "RPC Client & Provider Routing",
    blurb:
      "Multi-provider RPC with weighted failover, health tracking, per-provider rate limiting, and circuit breakers.",
    body: `The @talak-web3/rpc package provides a resilient JSON-RPC client that routes requests across multiple providers per chain. Rather than trusting a single RPC endpoint, you configure a pool of providers with priorities, weights, and rate limits — the client automatically selects the best healthy provider for each request and fails over to alternates when problems are detected.

The RpcClient class accepts an array of RpcEndpoint objects, each with a url, chainId, optional priority (lower = preferred), optional weight (for load distribution among same-priority providers), and optional maxRps (requests per second cap). It also takes a TalakWeb3Context for configuration and event emission, plus tuning knobs: maxRetries (default 3), retryDelay (default 1000ms), timeout (default 30s), and healthCheckInterval (default 30s).

Provider selection uses a two-tier algorithm. First, endpoints for the requested chain are grouped by priority — the lowest-priority group is tried first. Within a group, providers are selected using weighted round-robin. If all providers in the current group are unhealthy, the client escalates to the next priority group. This means your premium provider (Alchemy, Infura) handles normal traffic, and free public endpoints serve as fallbacks only when needed.

Health tracking runs automatically in the background. Every healthCheckInterval milliseconds, the client sends a lightweight eth_blockNumber probe to each endpoint and records latency and success/failure. After a configurable number of consecutive failures (default 3), the provider is marked unhealthy and removed from rotation — this is the circuit breaker pattern. Unhealthy providers are re-probed at a reduced frequency and automatically restored when they recover. You can inspect health at any time via getHealthStatus(chainId), which returns an array of ProviderHealth objects with url, isHealthy, latency, errorCount, and lastCheck.

Rate limiting is enforced per-provider using a token bucket algorithm configured by maxRps. If a provider's rate limit is exhausted, the client transparently selects the next available provider rather than queuing or throttling your application. This prevents a single slow or rate-limited endpoint from blocking your entire request pipeline.

For batch operations, batchRequest(chainId, requests) sends multiple JSON-RPC calls in a single HTTP request, reducing round trips and improving throughput for operations like fetching multiple balances or logs simultaneously.`,
    code: {
      filename: "rpc-setup.ts",
      language: "typescript",
      code: `import { RpcClient } from "@talak-web3/rpc";

const rpc = new RpcClient({
  endpoints: [
    // Primary — low latency, high rate limit
    { url: "https://eth-mainnet.g.alchemy.com/v2/KEY", chainId: 1, priority: 0, weight: 3, maxRps: 25 },
    // Secondary — good fallback
    { url: "https://rpc.ankr.com/eth",                 chainId: 1, priority: 1, weight: 2, maxRps: 15 },
    // Tertiary — free public endpoint
    { url: "https://ethereum.publicnode.com",           chainId: 1, priority: 2, weight: 1 },
    // Base chain
    { url: "https://mainnet.base.org",                  chainId: 8453, priority: 0 },
  ],
  ctx: instance.context,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30_000,
  healthCheckInterval: 30_000,
});

// Single request — failover is automatic
const blockNumber = await rpc.request<string>(1, "eth_blockNumber");
const balance = await rpc.request<string>(1, "eth_getBalance", [
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "latest"
]);

// Batch request — multiple calls in one HTTP round trip
const results = await rpc.batchRequest(1, [
  { method: "eth_blockNumber", params: [] },
  { method: "eth_gasPrice", params: [] },
  { method: "eth_getBalance", params: ["0xabc...", "latest"] },
]);

// Health monitoring
const health = rpc.getHealthStatus(1);
health.forEach(p => {
  console.log(\`\${p.url}: \${p.isHealthy ? "UP" : "DOWN"} (\${p.latency}ms)\`);
});`,
    },
    links: [
      { label: "Status dashboard", href: "/status" },
      { label: "Configuration", href: "/docs/configuration" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 6. TRANSACTIONS
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "tx",
    label: "Transactions",
    title: "Transactions & Account Abstraction",
    blurb:
      "Build, simulate, sign, and submit transactions with gas estimation and ERC-4337 UserOp support.",
    body: `The @talak-web3/tx package provides the full transaction lifecycle — from building calldata to waiting for on-chain confirmation — plus ERC-4337 account abstraction helpers for smart contract wallets.

The TxBuilder class is the primary interface for standard transactions. Call build(params) with a TxParams object containing to, value, data, chainId, and optional gas overrides to construct a fully-populated Transaction object. Before sending, use estimateGas(tx) to get a gas estimate from the connected RPC provider. Once signed, send(signedTx) submits the transaction and returns a transaction hash. Finally, waitForReceipt(hash, confirmations) polls until the transaction is mined and the requested number of confirmations is reached, returning a TxReceipt with status, gasUsed, logs, and blockNumber.

For ERC-4337 (account abstraction), the package provides three specialized clients. UserOperationBuilder constructs UserOp objects compatible with the ERC-4337 entry point contract — it handles sender, nonce, callData, gas limits, and signatures. BundlerClient communicates with ERC-4337 bundlers (e.g., Pimlico, Stackup, Alchemy) to submit UserOps via eth_sendUserOperation and check their status. PaymasterClient integrates with gas sponsorship services so your users can transact without holding ETH — the paymaster pays the gas fee on their behalf.

Gas utilities round out the package: estimateUserOpGas estimates the three gas fields required by UserOps (callGasLimit, verificationGasLimit, preVerificationGas), getGasPrice fetches current base fee and priority fee, and formatGwei / formatEther convert between units for display. The simulate method lets you dry-run a transaction against the current chain state before committing, catching reverts and insufficient balance errors before they cost gas.`,
    code: {
      filename: "transaction.ts",
      language: "typescript",
      code: `import { TxBuilder, UserOperationBuilder, BundlerClient } from "@talak-web3/tx";

// ── Standard transaction ──
const txBuilder = new TxBuilder({ ctx: instance.context });

const tx = await txBuilder.build({
  chainId: 8453,
  to: "0xRecipientAddress...",
  value: "10000000000000000", // 0.01 ETH in wei
  data: "0x",                // plain transfer
});

const gasEstimate = await txBuilder.estimateGas(tx);
console.log("Estimated gas:", gasEstimate.toString());

const hash = await txBuilder.send(signedTx);
const receipt = await txBuilder.waitForReceipt(hash, 2); // wait for 2 confirmations
console.log("Status:", receipt.status, "Gas used:", receipt.gasUsed);

// ── ERC-4337 UserOp (gasless / sponsored) ──
const userOpBuilder = new UserOperationBuilder({
  entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  smartAccount: "0xUserSmartWallet...",
});

const userOp = await userOpBuilder.build({
  callData: encodedCallData,
  chainId: 8453,
});

const bundler = new BundlerClient({ url: "https://bundler.example.com" });
const opHash = await bundler.sendUserOperation(userOp);
const opReceipt = await bundler.waitForReceipt(opHash);`,
    },
    links: [
      {
        label: "ERC-4337 specification",
        href: "https://eips.ethereum.org/EIPS/eip-4337",
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 7. REACT HOOKS
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "hooks",
    label: "React Hooks",
    title: "React Hooks & Providers",
    blurb:
      "A complete set of React hooks for accounts, balances, transactions, ENS, and chain management — SSR-safe and ~3 KB gzipped.",
    body: `The @talak-web3/hooks package (also available as talak-web3/react) provides a TalakWeb3Provider context wrapper and a complete library of typed React hooks for building Web3 frontends. The hooks are Suspense-aware, SSR-safe, and add roughly 3 KB gzipped to your bundle.

Wrap your application tree with TalakWeb3Provider and pass a config prop containing your chain definitions and client configuration. The provider initializes the client SDK, manages wallet connections, and makes state available to all descendant hooks via React Context.

Core hooks include: useAccount() returns { address, isConnected, chain, connector } for the currently connected wallet. useBalance(address?, chainId?) returns { data, isLoading, error, refetch } for native token balance with automatic polling. useChainId() returns the current chain ID. useConnect() returns { connect, connectors, isLoading, error } for triggering wallet connection with a specific connector. useDisconnect() cleanly disconnects the active wallet.

Transaction hooks include: useSendTransaction() returns { sendTransaction, data, isLoading, error } for submitting transactions. useSignMessage() returns { signMessage, data, isLoading, error } for signing arbitrary messages. useContractRead(config) reads on-chain contract state with automatic refresh. useContractWrite(config) writes to contracts and returns the transaction hash. useWaitForTransaction(hash) polls until a pending transaction is confirmed.

Identity and chain hooks include: useEnsName(address) resolves an address to its ENS name. useEnsAvatar(name) fetches the ENS avatar URL. useBlockNumber() returns the latest block number with live updates. useSwitchChain() returns { switchChain } for programmatic chain switching. useWatchContractEvent(config, callback) subscribes to contract events in real time.

Important note: there is no useSIWE hook in the current release. You should wire your own SIWE signing flow against your backend API using useSignMessage() for the wallet signature and a custom fetch call to your auth endpoints.`,
    code: {
      filename: "WalletApp.tsx",
      language: "tsx",
      code: `import { TalakWeb3Provider, useAccount, useBalance, useConnect }
  from "@talak-web3/hooks";

function App() {
  return (
    <TalakWeb3Provider config={{
      chains: [
        { id: 1, name: "Ethereum", rpcUrls: ["https://rpc.ankr.com/eth"] },
        { id: 8453, name: "Base", rpcUrls: ["https://mainnet.base.org"] },
      ],
    }}>
      <WalletDashboard />
    </TalakWeb3Provider>
  );
}

function WalletDashboard() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance, isLoading } = useBalance(address);
  const { connect, connectors } = useConnect();

  if (!isConnected) {
    return (
      <div>
        {connectors.map((connector) => (
          <button key={connector.id} onClick={() => connect(connector)}>
            Connect {connector.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p>Connected: {address}</p>
      <p>Chain: {chain?.name}</p>
      <p>Balance: {isLoading ? "Loading..." : balance?.formatted} ETH</p>
    </div>
  );
}`,
    },
    links: [
      { label: "Client SDK", href: "/docs/client" },
      { label: "Next.js example", href: "/docs/examples-nextjs" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 8. CLIENT SDK
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "client",
    label: "Client SDK",
    title: "Browser Client SDK",
    blurb:
      "Client-side wallet connections, message signing, typed-data signing, and chain management.",
    body: `The @talak-web3/client package provides the TalakWeb3Client class for browser environments. It wraps wallet connections, signing operations, and chain management into a clean imperative API that the React hooks build upon.

Construct a TalakWeb3Client with a configuration object and call connect(connector) with one of the built-in wallet connectors: InjectedConnector for browser-extension wallets like MetaMask and Rabby, WalletConnectConnector for mobile wallets via QR code, or CoinbaseWalletConnector for Coinbase Wallet. Each connector handles its own discovery, initialization, and deep-linking logic — you just pick the one your user wants.

Once connected, the client exposes signMessage(message) for EIP-191 personal signatures, signTypedData(data) for EIP-712 typed data signatures, sendTransaction(params) for submitting transactions, and switchChain(chainId) for requesting a chain switch from the wallet. getAccount() returns the current Account object (or null if disconnected).

The client implements an observer pattern for reactive updates. Call watchAccount(callback) to be notified whenever the connected account changes (including disconnects), and watchChainId(callback) to react to chain switches. Both return an unsubscribe function. This is the mechanism the React hooks use internally to trigger re-renders, but you can use it directly in vanilla JS, Vue, Svelte, or any framework.

Token storage is handled by pluggable adapters. InMemoryTokenStorage stores access and refresh tokens in JavaScript variables (suitable for SPAs), while CookieTokenStorage uses HTTP-only cookies with Secure and SameSite=Strict flags for better security. Both implement the TokenStorage interface so you can create custom adapters (e.g., for React Native's AsyncStorage).`,
    code: {
      filename: "client.ts",
      language: "typescript",
      code: `import { TalakWeb3Client, InMemoryTokenStorage } from "@talak-web3/client";
import { InjectedConnector } from "@talak-web3/client/connectors";

const client = new TalakWeb3Client({
  baseUrl: "http://localhost:8787",
  storage: new InMemoryTokenStorage(),
  fetchImpl: fetch.bind(window),
});

// Connect wallet
const injected = new InjectedConnector();
const account = await client.connect(injected);
console.log("Connected:", account.address, "on chain", account.chainId);

// Sign a message
const signature = await client.signMessage("Hello from talak-web3!");

// Send a transaction
const txHash = await client.sendTransaction({
  to: "0xRecipient...",
  value: "10000000000000000", // 0.01 ETH
  chainId: 1,
});

// Watch for account changes
const unwatch = client.watchAccount((account) => {
  if (account) {
    console.log("Account changed:", account.address);
  } else {
    console.log("Disconnected");
  }
});

// Switch chain
await client.switchChain(8453); // Switch to Base

// Clean up
unwatch();
await client.disconnect();`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 9. IDENTITY
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "identity",
    label: "Identity",
    title: "ENS & Identity Resolution",
    blurb:
      "Resolve ENS names, avatars, text records, and content hashes with batching and caching.",
    body: `The @talak-web3/identity package provides the IdentityResolver class for resolving Ethereum Name Service (ENS) records and decentralized identities. It supports forward lookups (name → address), reverse lookups (address → name), avatar resolution, arbitrary text records, and content hashes — all with built-in caching and batch support.

Call resolveName(address) to perform a reverse ENS lookup, returning the primary ENS name for a wallet address (or null). Call resolveAddress(name) for a forward lookup, resolving an ENS name like "vitalik.eth" to its Ethereum address. getAvatar(nameOrAddress) fetches the avatar image URL from the ENS profile, supporting IPFS, Arweave, and HTTP URLs with automatic gateway resolution. getTextRecord(name, key) retrieves arbitrary text records like "com.twitter", "url", "description", or "email".

For performance, the resolver caches results in memory with a configurable TTL (default 5 minutes). The batch(queries) method lets you resolve multiple identities in a single call, using multicall under the hood to minimize RPC round trips. This is especially useful for rendering lists of addresses with their display names and avatars.

The resolver is chain-agnostic — it reads ENS from Ethereum mainnet by default but can be configured to use any chain with an ENS-compatible registry. For non-ENS identities, the @talak-web3/identity package also supports DID resolution and verifiable profile schemas, though ENS remains the most commonly used identity layer.`,
    code: {
      filename: "identity.ts",
      language: "typescript",
      code: `import { IdentityResolver } from "@talak-web3/identity";

const resolver = new IdentityResolver({ ctx: instance.context });

// Forward lookup: name → address
const address = await resolver.resolveAddress("vitalik.eth");
console.log("Address:", address); // 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

// Reverse lookup: address → name
const name = await resolver.resolveName("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
console.log("ENS:", name); // vitalik.eth

// Avatar
const avatar = await resolver.getAvatar("vitalik.eth");
console.log("Avatar URL:", avatar);

// Text records
const twitter = await resolver.getTextRecord("vitalik.eth", "com.twitter");
const website = await resolver.getTextRecord("vitalik.eth", "url");

// Batch resolution — one multicall for multiple addresses
const results = await resolver.batch([
  { type: "name", address: "0xabc..." },
  { type: "name", address: "0xdef..." },
  { type: "avatar", name: "nick.eth" },
]);`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 10. CONFIGURATION
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "configuration",
    label: "Configuration",
    title: "Configuration & Presets",
    blurb:
      "Type-safe config builder with chain presets, environment validation, runtime feature flags, and deep merging.",
    body: `The @talak-web3/config package provides a type-safe configuration system with validation, presets, and environment-aware defaults. Use defineConfig() to build a configuration object that is validated at compile time and runtime.

The defineConfig() function accepts an options object and returns a fully-typed TalakWeb3Config. Key fields include chains (array of chain definitions), auth (authentication options including JWT keys, TTLs, and store configuration), plugins (array of TalakWeb3Plugin objects), and feature flags for enabling or disabling specific subsystems.

Chain presets are pre-built configurations for popular networks: mainnet, polygon, arbitrum, optimism, base, sepolia, and goerli. Each preset includes the chain ID, name, native currency, default public RPC URLs, and block explorer. You can use them as-is or override specific fields. createPreset(name, config) lets you define your own reusable preset for custom chains or recurring configurations.

Environment detection helpers — isProduction() and isDevelopment() — let you conditionally configure behavior. For example, you might use in-memory stores in development but require Redis in production. The SDK validates your configuration at boot time: if you're in production with in-memory stores, it throws a descriptive error rather than silently running in an insecure configuration.

mergeConfigs(...configs) performs a deep merge of multiple configuration objects, with later configs taking precedence. This is useful for layering a base config with environment-specific overrides: mergeConfigs(baseConfig, developmentOverrides). Array fields are replaced (not concatenated) to keep merge behavior predictable.`,
    code: {
      filename: "config.ts",
      language: "typescript",
      code: `import { defineConfig, mergeConfigs } from "@talak-web3/config";
import { mainnet, base, sepolia } from "@talak-web3/config/chains";

// Base configuration
const baseConfig = defineConfig({
  chains: [
    { ...mainnet, rpcUrls: [process.env.ETH_RPC_URL!] },
    { ...base, rpcUrls: [process.env.BASE_RPC_URL!] },
  ],
  auth: {
    jwtPrivateKey: process.env.JWT_PRIVATE_KEY!,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY!,
    accessTokenTtl: 900,
    refreshTokenTtl: 604800,
  },
  rpc: {
    maxRetries: 3,
    timeout: 30_000,
    healthCheckInterval: 30_000,
  },
});

// Development overrides
const devConfig = defineConfig({
  chains: [sepolia],
  auth: {
    jwtAlgorithm: "HS256", // OK in dev, rejected in production
    accessTokenTtl: 3600,  // Longer TTL for dev convenience
  },
});

// Merge: production base + dev overrides
const config = process.env.NODE_ENV === "production"
  ? baseConfig
  : mergeConfigs(baseConfig, devConfig);`,
    },
    links: [
      { label: "Environment variables", href: "/docs/deployment" },
      { label: "Chain presets", href: "/packages/config" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 11. ERROR HANDLING
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "errors",
    label: "Error Handling",
    title: "Error Handling & Error Hierarchy",
    blurb:
      "Typed error classes with structured codes, retryability hints, and JSON-safe serialization.",
    body: `The @talak-web3/errors package defines a comprehensive, typed error hierarchy that every package in the SDK throws. Every error extends the base TalakWeb3Error class, which carries a structured error code (from the ErrorCode enum), a human-readable message, an optional cause for error chaining, and a retryable boolean hint that tells your application whether it's safe to retry the failed operation.

Authentication errors (AuthError) include NonceExpiredError (the SIWE nonce TTL has elapsed), InvalidSignatureError (the wallet signature doesn't match the message), SessionExpiredError (the JWT access token has expired), and TokenRevokedError (the session was explicitly invalidated via logout or revokeAllSessions).

RPC errors (RpcError) include ProviderUnavailableError (all providers for a chain are unhealthy), RateLimitedError (the per-provider request limit was exceeded), TimeoutError (the request exceeded the configured timeout), and InvalidResponseError (the provider returned malformed JSON-RPC).

Transaction errors (TxError) include InsufficientFundsError (the sender doesn't have enough ETH for value + gas), GasEstimationError (the gas estimation call reverted), RevertError (the transaction was mined but reverted with an error message), and UserOpFailedError (an ERC-4337 UserOp was rejected by the bundler or entry point).

Configuration errors (ConfigError) surface at boot time when required fields are missing or invalid. NetworkError indicates chain-level issues like ChainNotSupportedError or EndpointNotFoundError.

Use the isSpecificError(error, ErrorClass) type guard for narrowing in catch blocks. Every error serializes cleanly to JSON via toJSON(), making them safe to log, send to error-tracking services, or return in API responses.`,
    code: {
      filename: "error-handling.ts",
      language: "typescript",
      code: `import {
  TalakWeb3Error,
  AuthError,
  RpcError,
  SessionExpiredError,
  ProviderUnavailableError,
  isSpecificError,
} from "@talak-web3/errors";

async function handleRequest(accessToken: string) {
  try {
    const session = await auth.verifySession(accessToken);
    const balance = await rpc.request(1, "eth_getBalance", [session.address, "latest"]);
    return { balance };
  } catch (error) {
    // Narrow to specific error types
    if (isSpecificError(error, SessionExpiredError)) {
      return { error: "Session expired. Please sign in again.", code: 401 };
    }

    if (isSpecificError(error, ProviderUnavailableError)) {
      return { error: "RPC providers unavailable. Try again shortly.", code: 503 };
    }

    if (error instanceof RpcError && error.retryable) {
      // Safe to retry — provider hiccup, timeout, rate limit
      console.warn("Retryable RPC error:", error.code, error.message);
      return { error: "Temporary issue. Retrying...", code: 503 };
    }

    if (error instanceof AuthError) {
      return { error: error.message, code: 401 };
    }

    // Unknown error — log and return generic 500
    console.error("Unexpected error:", error instanceof TalakWeb3Error
      ? error.toJSON()
      : error
    );
    return { error: "Internal server error", code: 500 };
  }
}`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 12. SECURITY
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "security",
    label: "Security",
    title: "Security Model & Production Hardening",
    blurb:
      "Threat model, fail-closed architecture, production hardening checklist, and security best practices.",
    body: `Security is not a feature in talak-web3 — it is a design constraint that shapes every architectural decision. The SDK implements a fail-closed model: when something goes wrong, the system denies access rather than falling back to a less secure mode.

SIWE replay prevention is the first layer of defense. When loginWithSiwe() is called, the nonce is consumed atomically before the signature is verified. This means even if an attacker intercepts a valid signed message and replays it, the nonce has already been burned and the login will fail. The nonce store enforces a TTL (default 5 minutes) so that unused nonces expire automatically — there is no window where an attacker can accumulate valid nonces for future use.

JWT security follows industry best practices. RS256 (asymmetric RSA) is the only algorithm accepted in production — HS256 is allowed in development but the SDK throws if you attempt to use it with NODE_ENV=production. Access tokens have a short TTL (default 15 minutes) to limit the damage window if a token is leaked. Refresh tokens have a longer TTL (default 7 days) but are rotated on every use: when you call refreshSession(), the old refresh token is immediately invalidated and a new pair is issued. This means a stolen refresh token can only be used once before the legitimate user's next refresh detects the theft (the token won't exist).

In-memory auth stores are a critical security violation in production. The SDK ships MemoryNonceStore, MemorySessionStore, and MemoryRefreshTokenStore for development convenience, but they are explicitly rejected when NODE_ENV=production. Production requires Redis-backed stores, which provide atomic operations, TTL-based expiry, and survive process restarts. If Redis goes down, auth endpoints return 503 Service Unavailable — they never silently fall back to in-memory storage. This fail-closed behavior ensures that a Redis outage causes visible downtime rather than invisible security degradation.

Rate limiting protects against brute-force attacks. The @talak-web3/rate-limit package supports per-IP, per-API-key, and per-method limiting using token bucket and sliding window algorithms. Apply rate limits to your nonce and login endpoints to prevent attackers from exhausting nonces or hammering your auth service.

Additional hardening measures include: CSRF protection via Authorization header (not cookies, avoiding CSRF entirely), RSA key strength validation (the SDK rejects keys shorter than 2048 bits), secure cookie defaults (HttpOnly, Secure, SameSite=Strict), secret leak detection (the SDK scans configuration values for patterns that look like they were meant to be environment variables), and strict TLS requirements (all hosted endpoints negotiate TLS 1.3 only).`,
    code: {
      filename: "production-hardened.ts",
      language: "typescript",
      code: `import { TalakWeb3Auth } from "@talak-web3/auth";
import { RedisNonceStore, RedisSessionStore, RedisRefreshTokenStore } from "@talak-web3/auth/stores";
import { createRateLimiter } from "@talak-web3/rate-limit";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// ── Production auth: RS256 + Redis stores + short TTLs ──
const auth = new TalakWeb3Auth({
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY!,    // RS256 PEM
  jwtPublicKey: process.env.JWT_PUBLIC_KEY!,       // RS256 PEM
  jwtAlgorithm: "RS256",                           // Only option in prod
  accessTokenTtl: 900,                             // 15 min
  refreshTokenTtl: 604800,                         // 7 days
  expectedDomain: "app.talak-web3.dev",            // SIWE domain check
  nonceStore: new RedisNonceStore(redis, { ttlSeconds: 300 }),
  sessionStore: new RedisSessionStore(redis),
  refreshTokenStore: new RedisRefreshTokenStore(redis),
});

// ── Rate limiting on auth endpoints ──
const authLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60_000,        // 10 requests per minute
  keyGenerator: (req) => req.ip,
  store: redis,
});

// ── Apply to Hono routes ──
app.post("/auth/nonce", authLimiter, async (c) => { /* ... */ });
app.post("/auth/login", authLimiter, async (c) => { /* ... */ });

// If Redis goes down → 503, not silent fallback`,
    },
    links: [
      {
        label: "SECURITY.md",
        href: "https://github.com/dagimabebe/talak-web3/blob/main/SECURITY.md",
      },
      { label: "Deployment guide", href: "/docs/deployment" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 13. DEPLOYMENT
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "deployment",
    label: "Deployment",
    title: "Production Deployment",
    blurb:
      "Deploy with Docker, Nginx, Redis, and Cloudflare Workers — with fail-closed architecture and security headers.",
    body: `The recommended production topology is a three-layer stack: Nginx as an edge reverse proxy handling SSL termination and security headers, the Hono backend as a stateless application server, and Redis as the durable state layer for sessions, nonces, and refresh tokens. This architecture is demonstrated in the examples/production-deployment directory with a complete Docker Compose setup.

Nginx sits at the edge and handles TLS termination (TLS 1.3 only), HTTP-to-HTTPS redirection, and strict security headers: HSTS with a 1-year max-age, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and X-XSS-Protection. It also sets up an upgraded proxy connection for WebSocket traffic used by the realtime subsystem. Rate limiting at the Nginx layer provides an additional defense-in-depth layer on top of the application-level rate limits.

The Hono backend is designed to be stateless — all durable state lives in Redis. This means you can horizontally scale by adding more backend instances behind a load balancer without worrying about session affinity. The backend validates environment variables at startup and refuses to start if required values (JWT keys, Redis URL) are missing. All request inputs are validated with Zod schemas before reaching business logic.

Redis stores all authentication state: nonces (with 5-minute TTL), active sessions (keyed by access token hash), and refresh tokens (with 7-day TTL and rotation tracking). If Redis becomes unavailable, the backend returns 503 for all auth operations — this is the fail-closed principle in action. No requests are silently served without proper session validation.

For edge deployments, talak-web3 works with Cloudflare Workers via Wrangler. The Hono adapter supports the Workers runtime natively, and you can use Upstash Redis (HTTP-based) as your session store since Workers don't support TCP connections. The CLI template npx talak-web3 init my-app --template hono generates a Wrangler-ready project with the correct bindings.

Environment variables for production: JWT_PRIVATE_KEY and JWT_PUBLIC_KEY (RS256 PEM), REDIS_URL (redis:// connection string), SIWE_DOMAIN (your app domain for SIWE message validation), plus RPC endpoint URLs for each chain you support.`,
    code: {
      filename: "docker-compose.yml",
      language: "yaml",
      code: `version: "3.9"
services:
  backend:
    build: .
    environment:
      - NODE_ENV=production
      - JWT_PRIVATE_KEY_FILE=/run/secrets/jwt_private
      - JWT_PUBLIC_KEY_FILE=/run/secrets/jwt_public
      - REDIS_URL=redis://redis:6379
      - SIWE_DOMAIN=app.talak-web3.dev
      - ETH_RPC_URL=https://rpc.ankr.com/eth
    depends_on: [redis]
    networks: [web3-network]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8787/health"]
      interval: 30s

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass \${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes: [redis-data:/data]
    networks: [web3-network]
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/ssl/certs:ro
    depends_on: [backend]
    networks: [web3-network]

volumes:
  redis-data:
networks:
  web3-network:`,
    },
    links: [
      { label: "Security guide", href: "/docs/security" },
      { label: "Status monitoring", href: "/status" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 14. CLI REFERENCE
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "cli",
    label: "CLI Reference",
    title: "CLI Reference",
    blurb:
      "Scaffold, diagnose, upgrade, and generate boilerplate from the command line.",
    body: `The @talak-web3/cli package provides a command-line interface for scaffolding new projects, generating boilerplate, checking your environment, and upgrading dependencies. It is published with three equivalent binary names: talak, talak-web3, and create-talak-web3.

The init command scaffolds a new project: talak-web3 init my-dapp --template nextjs. Available templates are nextjs (Next.js 14+ App Router with SIWE auth and RPC proxy), hono (Hono backend with auth endpoints, Cloudflare Workers ready), react-native (React Native with WalletConnect), and minimal (bare-minimum setup with just core + auth). Each template includes a pre-configured package.json, environment variable templates, example routes/pages, auth handler boilerplate, and a README with setup instructions.

The add command installs a talak-web3 scoped package and wires it into your project: talak-web3 add @talak-web3/realtime. It updates your package.json and adds any required configuration entries.

The generate command creates boilerplate files: talak-web3 generate config creates a type-safe configuration file, generate auth-handler creates server-side SIWE route handlers, generate rpc-config creates an RPC endpoint configuration, and generate middleware creates auth and rate-limit middleware.

The doctor command checks your environment: Node.js version, package manager, installed packages and their versions, environment variables, TypeScript configuration, and common misconfigurations. It outputs a diagnostic report and suggests fixes.

The upgrade command bumps all talak-web3 packages to their latest compatible versions, respecting semver ranges. It also runs doctor after upgrading to verify nothing broke.`,
    code: {
      filename: "cli-usage.sh",
      language: "bash",
      code: `# Scaffold a new project with the Next.js template
npx talak-web3 init my-dapp --template nextjs
cd my-dapp && pnpm install && pnpm dev

# Or use the hono template for a backend API
npx talak-web3 init my-api --template hono

# Add a package to an existing project
talak-web3 add @talak-web3/realtime
talak-web3 add @talak-web3/identity

# Generate boilerplate
talak-web3 generate config          # Creates talak.config.ts
talak-web3 generate auth-handler    # Creates auth route handlers
talak-web3 generate rpc-config      # Creates RPC endpoint config
talak-web3 generate middleware      # Creates auth + rate-limit middleware

# Check your environment
talak-web3 doctor

# Upgrade all talak-web3 packages
talak-web3 upgrade`,
    },
    links: [
      { label: "Templates", href: "/docs/examples-nextjs" },
      { label: "Installation", href: "/docs/installation" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 15. FRAMEWORK ADAPTERS
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "adapters",
    label: "Framework Adapters",
    title: "Framework Adapters",
    blurb:
      "Drop-in adapters for Next.js, Hono, Express, and Fastify — auth middleware, SIWE handlers, and context injection.",
    body: `The @talak-web3/adapters package provides framework-specific adapters that bridge talak-web3 primitives into the HTTP framework you are already using. Instead of writing glue code to connect SIWE authentication, session verification, and RPC proxying to your framework's request/response cycle, you install an adapter and get production-ready middleware and route handlers immediately.

Each adapter — createNextjsAdapter(), createHonoAdapter(), createExpressAdapter(), createFastifyAdapter() — returns an object with four components: authMiddleware (verifies JWT access tokens on incoming requests and injects the session payload into the request context), siweHandler (handles the complete SIWE login/logout flow as route handlers), nonceHandler (generates and returns cryptographic nonces), and sessionHandler (handles token refresh requests).

The adapters also inject a talak-web3 context into the framework's native request object, so downstream handlers can access instance.context.auth, instance.context.rpc, and other subsystems without importing them directly. For Next.js, the adapter works with both the Pages Router (via API routes) and the App Router (via route handlers). For Hono, the adapter registers as Hono middleware with full Cloudflare Workers and Node.js support.

Additional adapters for SvelteKit, Cloudflare Workers, and Vercel Edge are available through the community plugins registry. The adapter interface is documented so you can create custom adapters for any framework that handles HTTP requests.`,
    code: {
      filename: "hono-adapter.ts",
      language: "typescript",
      code: `import { Hono } from "hono";
import { cors } from "hono/cors";
import { createHonoAdapter } from "@talak-web3/adapters";
import { talakWeb3 } from "@talak-web3/core";

const instance = talakWeb3({ /* config */ });
await instance.init();

const { authMiddleware, siweHandler, nonceHandler, sessionHandler } =
  createHonoAdapter(instance);

const app = new Hono();

// CORS for browser clients
app.use("/*", cors({ origin: "https://app.talak-web3.dev" }));

// Public auth routes
app.post("/auth/nonce", nonceHandler);
app.post("/auth/login", siweHandler.login);
app.post("/auth/logout", siweHandler.logout);
app.post("/auth/refresh", sessionHandler);

// Protected routes — authMiddleware verifies JWT
app.use("/api/*", authMiddleware);

app.get("/api/session", (c) => {
  const session = c.get("session"); // Injected by authMiddleware
  return c.json({ address: session.address, chainId: session.chainId });
});

app.get("/api/balance", async (c) => {
  const session = c.get("session");
  const balance = await instance.context.rpc.request(
    1, "eth_getBalance", [session.address, "latest"]
  );
  return c.json({ balance });
});

export default app;`,
    },
    links: [
      { label: "Hono example", href: "/docs/examples-hono" },
      { label: "Next.js example", href: "/docs/examples-nextjs" },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 16. RATE LIMITING
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "rate-limiting",
    label: "Rate Limiting",
    title: "Rate Limiting",
    blurb:
      "Token bucket and sliding window rate limiters with Redis, Cloudflare KV, Upstash, and in-memory storage adapters.",
    body: `The @talak-web3/rate-limit package provides two rate-limiting algorithms — token bucket and sliding window — with pluggable storage backends and framework middleware integration.

TokenBucketLimiter implements the classic token bucket algorithm: tokens are added to a bucket at a steady rate (the refill rate), and each request consumes one token. When the bucket is empty, requests are rejected until tokens refill. This algorithm allows short bursts of traffic while enforcing an average rate over time. SlidingWindowLimiter uses a sliding time window to count requests — it provides a more even distribution and prevents the burst behavior of fixed windows.

createRateLimiter(options) is the high-level factory. Pass maxRequests (the limit), windowMs (the time window in milliseconds), keyGenerator (a function that extracts the rate-limit key from the request — typically the client IP or API key), and store (the storage backend). Storage adapters include in-memory (for development), Redis (for production with shared state across instances), Cloudflare KV (for Workers), and Upstash (for serverless Redis over HTTP).

RateLimitMiddleware is a factory that creates Express/Hono-compatible middleware from a rate limiter instance. It automatically sets X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers on responses. When the limit is exceeded, it returns 429 Too Many Requests with a Retry-After header.

For defense-in-depth, apply different limits at different levels: a generous per-IP limit on all routes, a stricter per-API-key limit on authenticated routes, and an aggressive per-method limit on sensitive endpoints like /auth/nonce and /auth/login to prevent nonce exhaustion and brute-force attacks.`,
    code: {
      filename: "rate-limit.ts",
      language: "typescript",
      code: `import { createRateLimiter, RateLimitMiddleware } from "@talak-web3/rate-limit";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// General API rate limit: 100 req / minute per IP
const apiLimiter = createRateLimiter({
  algorithm: "sliding-window",
  maxRequests: 100,
  windowMs: 60_000,
  keyGenerator: (req) => req.headers.get("cf-connecting-ip") || req.ip,
  store: redis,
});

// Strict auth rate limit: 10 req / minute per IP
const authLimiter = createRateLimiter({
  algorithm: "token-bucket",
  maxRequests: 10,
  windowMs: 60_000,
  keyGenerator: (req) => req.ip,
  store: redis,
});

// Apply as Hono middleware
app.use("/api/*", RateLimitMiddleware(apiLimiter));
app.use("/auth/*", RateLimitMiddleware(authLimiter));

// Response headers are set automatically:
// X-RateLimit-Limit: 100
// X-RateLimit-Remaining: 97
// X-RateLimit-Reset: 1693857600`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 17. REALTIME
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "realtime",
    label: "Realtime",
    title: "Realtime Events & WebSocket",
    blurb:
      "Subscribe to new blocks, pending transactions, contract events, and ERC-20 transfers with auto-reconnecting WebSocket.",
    body: `The @talak-web3/realtime package provides the RealtimeClient class for subscribing to live blockchain events over WebSocket connections, with automatic reconnection, heartbeats, and a message-replay buffer.

The client uses WebSocket as its primary transport for full-duplex communication, with Server-Sent Events (SSE) as a fallback for environments that don't support WebSocket (e.g., some corporate proxies). Auto-reconnect with exponential backoff ensures your subscriptions survive network hiccups without manual intervention — the client tracks active subscriptions and re-subscribes after reconnecting.

Subscribe to events using the on() method: on("block", callback) fires on every new block, on("pendingTx", callback) watches the mempool for pending transactions, on("logs", filter, callback) filters contract event logs by address and topics, and on("transfer", filter, callback) watches for ERC-20 token transfers with optional filtering by from/to address and token contract. Each subscription returns an unsubscribe function.

The subscribe(event, filter?, callback) method provides a lower-level interface for custom subscriptions. The client maintains a message-replay buffer (configurable size, default 100 messages) so that messages received during a brief disconnection are replayed to your callback after reconnection, preventing missed events.

For server-side use cases, the client supports presence tracking — multiple clients can announce their presence and discover each other, useful for building collaborative features or monitoring dashboards.`,
    code: {
      filename: "realtime.ts",
      language: "typescript",
      code: `import { RealtimeClient } from "@talak-web3/realtime";

const realtime = new RealtimeClient({
  ctx: instance.context,
  reconnectDelay: 1000,
  maxReconnectDelay: 30_000,
  replayBufferSize: 100,
});

// Subscribe to new blocks on Ethereum
const unsubBlocks = realtime.on("block", { chainId: 1 }, (block) => {
  console.log("New block:", block.number, "txCount:", block.transactions.length);
});

// Watch ERC-20 transfers for a specific token
const unsubTransfers = realtime.on("transfer", {
  chainId: 1,
  token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  to: "0xMyAddress...",
}, (transfer) => {
  console.log(\`Received \${transfer.value} USDC from \${transfer.from}\`);
});

// Watch contract events
const unsubLogs = realtime.on("logs", {
  chainId: 1,
  address: "0xContractAddress...",
  topics: ["0xEventSignature..."],
}, (log) => {
  console.log("Contract event:", log.data);
});

// Clean up
process.on("SIGTERM", () => {
  unsubBlocks();
  unsubTransfers();
  unsubLogs();
  realtime.disconnect();
});`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 18. TESTING
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "testing",
    label: "Testing",
    title: "Testing Utilities",
    blurb:
      "Mock contexts, deterministic fixtures, signed message generators, and a local test-chain harness.",
    body: `The @talak-web3/test-utils package provides everything you need to write unit and integration tests for talak-web3 applications without hitting real RPC providers or running a local node.

createMockContext() returns a fully-mocked TalakWeb3Context where every subsystem (auth, rpc, config, identity, tx, events) is a vitest mock. You can override any mock implementation inline or set up pre-canned responses. createMockAuth() returns a mock auth instance with pre-generated tokens so you can test authenticated flows without running the full SIWE dance. createMockRpc() returns a mock RPC client with configurable response fixtures for common methods like eth_blockNumber, eth_getBalance, and eth_gasPrice.

For testing SIWE flows specifically, mockSiweMessage(params?) generates a valid EIP-4361 message with all required fields, and mockSignature(message) produces a corresponding valid signature using a deterministic test private key. These pair with the mock auth stores to let you test the full login flow end-to-end without a browser or wallet extension.

TestProvider is a React wrapper component that provides a mocked TalakWeb3Provider context. It's designed for use with React Testing Library: wrap your component in TestProvider and all hooks (useAccount, useBalance, etc.) will return the mock values you configure.

setupTestEnvironment() configures vitest globals, sets NODE_ENV=test, and applies sensible defaults. createTestChain(overrides?) generates a test chain configuration that points to anvil or hardhat local nodes, so your integration tests can run against a real chain fork without external dependencies.`,
    code: {
      filename: "auth.test.ts",
      language: "typescript",
      code: `import { describe, it, expect } from "vitest";
import {
  createMockContext,
  createMockAuth,
  mockSiweMessage,
  mockSignature,
  TestProvider,
} from "@talak-web3/test-utils";

describe("Auth flow", () => {
  it("should login with SIWE and verify session", async () => {
    const ctx = createMockContext();
    const auth = createMockAuth();

    // Generate a test SIWE message + signature
    const message = mockSiweMessage({
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      domain: "localhost",
      chainId: 1,
    });
    const signature = mockSignature(message);

    // Login
    const result = await auth.loginWithSiwe(message, signature);
    expect(result.accessToken).toBeDefined();
    expect(result.address).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");

    // Verify session
    const payload = await auth.verifySession(result.accessToken);
    expect(payload.address).toBe(result.address);
    expect(payload.chainId).toBe(1);
  });

  it("should reject expired sessions", async () => {
    const auth = createMockAuth({ accessTokenTtl: -1 }); // Already expired
    const { accessToken } = await auth.loginWithSiwe(
      mockSiweMessage(), mockSignature(mockSiweMessage())
    );
    await expect(auth.verifySession(accessToken)).rejects.toThrow("expired");
  });
});`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 19. EVENTS
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "events",
    label: "Events",
    title: "Events & Activity Feed",
    blurb:
      "Emit structured events from your application and stream them into your dashboard's activity feed in real time.",
    body: `The event system is the bridge between your application logic and your operations dashboard. Anything you push into events.emit() shows up in the Activity feed in real time, searchable by type, level, chain, method, latency, and custom metadata.

Events serve three purposes: product analytics (track user actions, conversion funnels, feature usage), operational observability (log RPC errors, auth failures, rate-limit hits), and on-chain effect tracking (record transaction hashes, confirmation times, gas spent). Each event has a type (e.g., "tx", "auth", "error", "custom"), a level ("success", "info", "warning", "error"), a human-readable message, and an optional metadata object for structured data.

Events stream to the dashboard over a single SSE connection per project. The dashboard provides a live activity feed with filtering, search, and drill-down — you can filter by time range, event type, wallet address, chain, or any metadata field. This is especially useful for debugging production issues: when a user reports a problem, you can search their wallet address in the activity feed and see every event related to their session.

On the server side, internal SDK subsystems (auth, rpc, tx) automatically emit events for key operations — logins, logouts, RPC requests, failures, and transactions. You can supplement these with your own custom events using events.emit(). The event API is intentionally simple and fire-and-forget: if the dashboard is unreachable, events are buffered in memory and retried.`,
    code: {
      filename: "events.ts",
      language: "typescript",
      code: `// Emit custom events from your application
await instance.context.events.emit({
  type: "tx",
  level: "success",
  message: "NFT mint completed",
  metadata: {
    tokenId: 4421,
    chain: "base",
    collection: "0xCollection...",
    gasUsed: "84000",
    txHash: "0xabc...",
  },
});

// Track auth events
await instance.context.events.emit({
  type: "auth",
  level: "info",
  message: "New user signed in",
  metadata: {
    address: "0xUser...",
    chainId: 1,
    connector: "MetaMask",
  },
});

// Track errors for debugging
await instance.context.events.emit({
  type: "error",
  level: "error",
  message: "Payment transaction reverted",
  metadata: {
    address: "0xUser...",
    error: "ERC20: insufficient allowance",
    chain: "ethereum",
    method: "transfer",
  },
});

// Listen to events programmatically
instance.context.events.on("rpc:request", ({ method, chainId, latencyMs }) => {
  console.log(\`RPC: \${method} on \${chainId} took \${latencyMs}ms\`);
});`,
    },
    links: [{ label: "Live activity feed", href: "/activity" }],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 20. WEBHOOKS
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "webhooks",
    label: "Webhooks",
    title: "Webhooks",
    blurb:
      "Mirror events to your own backend with HMAC-SHA256 signed payloads, exponential backoff retries, and idempotency keys.",
    body: `Webhooks fan out events from your talak-web3 project to HTTP endpoints you own. Every delivery is signed with HMAC-SHA256 using your endpoint's shared secret, so you can cryptographically verify that the payload came from talak-web3 and hasn't been tampered with.

Configure webhook endpoints in the dashboard: specify the URL, the event types you want to receive (e.g., "tx.confirmed", "auth.login", "error.*"), and the shared secret. When a matching event occurs, the system sends a POST request to your URL with a JSON payload containing the event data, a timestamp, and an X-Talak-Signature header with the HMAC-SHA256 signature.

Failed deliveries are retried with exponential backoff over a 24-hour budget. The first retry happens after 1 minute, then 5 minutes, 30 minutes, 1 hour, 4 hours, and so on. Every delivery includes an X-Talak-Idempotency-Key header, so your handler can safely deduplicate if it receives the same event more than once. This makes it safe to return 200 OK even if your processing fails — you can process the event asynchronously and rely on the idempotency key to handle retries.

The verifyWebhookSignature helper function from talak-web3/server takes the shared secret, the X-Talak-Signature header value, and the raw request body, and returns true if the signature is valid. Always verify before processing — an unverified webhook payload could be a forgery.`,
    code: {
      filename: "webhook-receiver.ts",
      language: "typescript",
      code: `import { verifyWebhookSignature } from "talak-web3/server";
import { Hono } from "hono";

const app = new Hono();

app.post("/webhooks/talak", async (c) => {
  const signature = c.req.header("X-Talak-Signature")!;
  const idempotencyKey = c.req.header("X-Talak-Idempotency-Key")!;
  const rawBody = await c.req.text();

  // 1. Verify the signature
  const isValid = verifyWebhookSignature({
    secret: process.env.TALAK_WEBHOOK_SECRET!,
    signature,
    body: rawBody,
  });

  if (!isValid) {
    return c.text("Invalid signature", 401);
  }

  // 2. Parse the payload
  const event = JSON.parse(rawBody);

  // 3. Deduplicate using idempotency key
  const alreadyProcessed = await redis.get(\`webhook:\${idempotencyKey}\`);
  if (alreadyProcessed) {
    return c.text("Already processed", 200);
  }

  // 4. Process the event
  console.log(\`Webhook: \${event.type} — \${event.message}\`);

  // 5. Mark as processed
  await redis.set(\`webhook:\${idempotencyKey}\`, "1", "EX", 86400);

  return c.text("OK", 200);
});`,
    },
    links: [{ label: "Configure webhooks", href: "/webhooks" }],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 21. PLUGINS
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "plugins",
    label: "Plugins",
    title: "Plugin System",
    blurb:
      "Extend talak-web3 with the lazy plugin loader and official plugin registry — chains, wallets, storage, and AI providers.",
    body: `The plugin system is the primary extension mechanism in talak-web3. A plugin is any JavaScript object that implements the TalakWeb3Plugin interface: { name: string, version?: string, setup(ctx: TalakWeb3Context): void | Promise<void> }. During instance.init(), the core iterates through registered plugins and calls each one's setup() function, passing the shared context.

Plugins receive the full TalakWeb3Context, which means they can read configuration, access the auth and RPC subsystems, register event listeners, add middleware, and even extend the context with new capabilities. The setup() function can be synchronous or asynchronous — useful for plugins that need to establish connections (e.g., a database plugin that opens a connection pool).

Register plugins in two ways: pass them in the plugins array when calling talakWeb3({ plugins: [myPlugin] }), or call instance.use(myPlugin) before init(). Plugins run in registration order, so if plugin B depends on something plugin A sets up, register A first.

The official plugin registry (@talak-web3/plugins) ships maintained plugins for additional chain definitions, wallet connectors (Lit Protocol PKPs, Safe multisig, Privy), storage backends (Ceramic, Tableland, Pinata), AI providers (OpenAI, Anthropic, Google), and analytics sinks (PostHog, Segment, Plausible). Install them via the CLI: talak-web3 add @talak-web3/plugins/lit-pkp.

The lazy plugin loader optimizes startup time by deferring plugin imports until they are actually needed. This is especially beneficial in serverless environments where cold-start latency matters — plugins that aren't used during a particular request are never loaded.`,
    code: {
      filename: "custom-plugin.ts",
      language: "typescript",
      code: `import type { TalakWeb3Plugin, TalakWeb3Context } from "@talak-web3/types";
import { talakWeb3 } from "@talak-web3/core";

// Define a custom logging plugin
const loggingPlugin: TalakWeb3Plugin = {
  name: "structured-logger",
  version: "1.0.0",

  async setup(ctx: TalakWeb3Context) {
    // Listen to all auth events
    ctx.events.on("auth:login", ({ address, chainId }) => {
      console.log(JSON.stringify({
        level: "info", event: "auth.login", address, chainId, ts: Date.now()
      }));
    });

    // Listen to RPC errors
    ctx.events.on("rpc:error", ({ method, chainId, error }) => {
      console.error(JSON.stringify({
        level: "error", event: "rpc.error", method, chainId, error: error.message
      }));
    });

    // Extend context with custom utilities
    (ctx as any).logger = {
      info: (msg: string, data?: object) =>
        console.log(JSON.stringify({ level: "info", msg, ...data, ts: Date.now() })),
      error: (msg: string, data?: object) =>
        console.error(JSON.stringify({ level: "error", msg, ...data, ts: Date.now() })),
    };
  },
};

// Register and boot
const instance = talakWeb3({
  chains: [/* ... */],
  auth: new TalakWeb3Auth({ /* ... */ }),
  plugins: [loggingPlugin],
});

await instance.init(); // loggingPlugin.setup() runs here`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 22. NEXT.JS EXAMPLE
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "examples-nextjs",
    label: "Next.js Example",
    title: "Next.js Example",
    blurb:
      "Full SIWE auth flow with Next.js App Router — server-side auth routes, RPC proxy, and React hooks.",
    body: `The Next.js example demonstrates a complete Web3 application with server-side SIWE authentication, an RPC proxy route, client-side React hooks, and protected dashboard pages. It uses Next.js 14+ with the App Router and can be scaffolded instantly with npx talak-web3 init my-dapp --template nextjs.

On the server side, the example defines five API route handlers under app/api/auth/: nonce/route.ts generates a cryptographic nonce, login/route.ts verifies the SIWE message and signature and returns JWT tokens, logout/route.ts invalidates the session, refresh/route.ts handles token rotation, and session/route.ts returns the current session payload. A sixth route at app/api/rpc/route.ts acts as an RPC proxy — it forwards JSON-RPC requests to the configured provider pool with failover, preventing your RPC endpoints from being exposed to the browser.

The server-side instance is created once in lib/talak.ts and shared across all route handlers via module caching. It uses Redis stores for production auth and is configured with RS256 JWT keys from environment variables.

On the client side, app/providers.tsx wraps the application in TalakWeb3Provider with the chain configuration. Components use the React hooks (useAccount, useConnect, useBalance) for wallet state, and a custom SiweLogin component handles the SIWE flow by fetching a nonce from /api/auth/nonce, constructing the SIWE message, requesting a wallet signature via useSignMessage, and posting the result to /api/auth/login.

Protected pages check for a valid session by calling /api/auth/session on load and redirecting to login if the session is expired or missing.`,
    code: {
      filename: "app/api/auth/login/route.ts",
      language: "typescript",
      code: `import { NextResponse } from "next/server";
import { getInstance } from "@/lib/talak";

export async function POST(request: Request) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message or signature" },
        { status: 400 }
      );
    }

    const instance = await getInstance();
    const result = await instance.context.auth.loginWithSiwe(message, signature);

    return NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      address: result.address,
      chainId: result.chainId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}`,
    },
    links: [
      {
        label: "GitHub example",
        href: "https://github.com/dagimabebe/talak-web3/tree/main/examples/nextjs-app",
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 23. HONO EXAMPLE
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "examples-hono",
    label: "Hono Example",
    title: "Hono Backend Example",
    blurb:
      "Production-ready Hono backend with SIWE auth, RPC proxy, rate limiting, Redis, and Cloudflare Workers deployment.",
    body: `The Hono example provides a production-ready backend API that can be deployed to Cloudflare Workers or any Node.js runtime. It demonstrates the full talak-web3 server stack: SIWE authentication, RPC proxying with failover, Redis-backed session storage, rate limiting, CORS, and structured logging with Pino.

The backend defines four auth routes (/auth/nonce, /auth/login, /auth/logout, /auth/refresh) using the Hono adapter, an RPC proxy route (/rpc/:chainId) that validates and forwards JSON-RPC requests, and a health check route (/health) that reports the status of Redis and RPC providers. All request inputs are validated with Zod schemas — the server rejects malformed requests before they reach business logic.

Rate limiting is applied at two levels: a general API limit of 100 requests per minute per IP on all routes, and a stricter 10 requests per minute limit on auth endpoints. Both use Redis-backed sliding window counters so limits are shared across all backend instances.

For Cloudflare Workers deployment, the example includes a wrangler.toml with the correct bindings and uses Upstash Redis (HTTP-based) since Workers don't support TCP. For traditional deployment, it runs as a Node.js HTTP server with Pino structured logging and Prometheus metrics via prom-client.

The fail-closed architecture is demonstrated explicitly: if Redis is unreachable at startup, the server logs an error and exits rather than starting in a degraded state. During operation, if Redis becomes unavailable, auth endpoints return 503 — they never silently accept unauthenticated requests.`,
    code: {
      filename: "src/index.ts",
      language: "typescript",
      code: `import { Hono } from "hono";
import { cors } from "hono/cors";
import { talakWeb3 } from "@talak-web3/core";
import { TalakWeb3Auth } from "@talak-web3/auth";
import { createHonoAdapter } from "@talak-web3/adapters";
import { createRateLimiter } from "@talak-web3/rate-limit";
import { RedisNonceStore, RedisSessionStore, RedisRefreshTokenStore }
  from "@talak-web3/auth/stores";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const instance = talakWeb3({
  chains: [
    { id: 1, name: "Ethereum", rpcUrls: [process.env.ETH_RPC_URL!] },
    { id: 8453, name: "Base", rpcUrls: [process.env.BASE_RPC_URL!] },
  ],
  auth: new TalakWeb3Auth({
    jwtPrivateKey: process.env.JWT_PRIVATE_KEY!,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY!,
    nonceStore: new RedisNonceStore(redis),
    sessionStore: new RedisSessionStore(redis),
    refreshTokenStore: new RedisRefreshTokenStore(redis),
  }),
});

await instance.init();

const app = new Hono();
const { authMiddleware, siweHandler, nonceHandler, sessionHandler } =
  createHonoAdapter(instance);

app.use("/*", cors({ origin: process.env.CORS_ORIGIN! }));
app.post("/auth/nonce", nonceHandler);
app.post("/auth/login", siweHandler.login);
app.post("/auth/logout", authMiddleware, siweHandler.logout);
app.post("/auth/refresh", sessionHandler);
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;`,
    },
    links: [
      {
        label: "GitHub example",
        href: "https://github.com/dagimabebe/talak-web3/tree/main/examples/hono-api",
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 24. REACT NATIVE EXAMPLE
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "examples-react-native",
    label: "React Native",
    title: "React Native Example",
    blurb:
      "WalletConnect integration, deep linking, account management, and transaction sending for mobile Web3 apps.",
    body: `The React Native example demonstrates how to build a mobile Web3 application using talak-web3 with WalletConnect for wallet connections. Since mobile browsers don't have MetaMask or other extension wallets, WalletConnect bridges the gap by connecting to the user's preferred mobile wallet via QR code or deep link.

The example app has three screens: HomeScreen (displays connection status and account info), WalletScreen (manages connected wallets and shows balances), and SettingsScreen (chain selection and session management). The WalletConnect connector is configured with a project ID from the WalletConnect Cloud dashboard and handles deep linking automatically — when a user taps "Connect Wallet", the app opens their wallet app (MetaMask, Rainbow, Trust Wallet, etc.) for approval.

For SIWE authentication, the flow is similar to the web version but adapted for React Native's navigation: the app requests a nonce from the backend, constructs the SIWE message, requests a signature via WalletConnect, and sends the result to the backend for JWT issuance. Tokens are stored securely using React Native's AsyncStorage (or a custom secure storage adapter for production).

Transaction sending works through the same WalletConnect bridge — the app constructs a transaction object and sends it to the connected wallet for signing and submission. The user approves the transaction in their wallet app and the result is relayed back.`,
    code: {
      filename: "App.tsx",
      language: "tsx",
      code: `import React from "react";
import { TalakWeb3Provider, useAccount, useConnect }
  from "@talak-web3/hooks";
import { WalletConnectConnector } from "@talak-web3/client/connectors";

const walletConnectConnector = new WalletConnectConnector({
  projectId: process.env.WALLETCONNECT_PROJECT_ID!,
  metadata: {
    name: "My dApp",
    description: "A talak-web3 React Native app",
    url: "https://mydapp.com",
    icons: ["https://mydapp.com/icon.png"],
  },
});

export default function App() {
  return (
    <TalakWeb3Provider config={{
      chains: [
        { id: 1, name: "Ethereum", rpcUrls: ["https://rpc.ankr.com/eth"] },
        { id: 8453, name: "Base", rpcUrls: ["https://mainnet.base.org"] },
      ],
      connectors: [walletConnectConnector],
    }}>
      <HomeScreen />
    </TalakWeb3Provider>
  );
}

function HomeScreen() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  if (!isConnected) {
    return (
      <button onPress={() => connect(connectors[0])}>
        Connect via WalletConnect
      </button>
    );
  }

  return <text>Connected: {address}</text>;
}`,
    },
    links: [
      {
        label: "GitHub example",
        href: "https://github.com/dagimabebe/talak-web3/tree/main/examples/react-native-app",
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 25. AI INTEGRATION
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "ai",
    label: "AI Integration",
    title: "AI & LLM Integration",
    blurb:
      "Build provider-agnostic AI agents that read chain state, interpret natural language into transactions, and stream output.",
    body: `The @talak-web3/ai package bridges large language models with on-chain data and transaction construction. It provides an AiAssistant class for common workflows and a createTools() function for integrating with LangChain, Vercel AI SDK, and other agent frameworks.

The AiAssistant class provides four high-level methods. interpretTransaction(description) takes a natural language description like "Send 0.5 ETH to vitalik.eth on mainnet" and returns a fully-populated TxParams object ready to sign and submit. explainTransaction(tx) does the reverse — given a raw transaction object, it produces a human-readable summary explaining what the transaction does, who it affects, and what the likely outcome is. suggestGasStrategy(txParams) analyzes current network conditions and recommends gas settings (slow/standard/fast) with estimated confirmation times. analyzeContract(address) fetches the contract ABI, recent interactions, and common patterns to produce a security and functionality summary.

The createTools(ctx) function generates a set of tools compatible with LangChain and Vercel AI SDK agent frameworks. These tools let an LLM agent read on-chain state (balances, block numbers, contract storage), resolve ENS names, estimate gas, and construct transactions — all through the talak-web3 context with proper auth and rate limiting.

The package supports multiple AI backends: OpenAI (GPT-4), Anthropic (Claude), and Google AI (Gemini). Configure the backend via the provider option. Embedding helpers for vector databases (pgvector, Pinecone, Qdrant) are also included for RAG applications that need to search through contract ABIs, transaction histories, or documentation.`,
    code: {
      filename: "ai-agent.ts",
      language: "typescript",
      code: `import { AiAssistant, createTools } from "@talak-web3/ai";

const assistant = new AiAssistant({
  ctx: instance.context,
  provider: "openai",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
});

// Natural language → transaction
const txParams = await assistant.interpretTransaction(
  "Send 0.5 ETH to vitalik.eth on Ethereum mainnet"
);
console.log("Transaction:", txParams);
// { to: "0xd8dA6BF...", value: "500000000000000000", chainId: 1 }

// Transaction → human-readable explanation
const explanation = await assistant.explainTransaction({
  to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  data: "0xa9059cbb000000000000000000000000...",
  chainId: 1,
});
console.log(explanation);
// "Transfer 1,000 USDC to 0xRecipient on Ethereum mainnet"

// Gas strategy recommendation
const gasStrategy = await assistant.suggestGasStrategy(txParams);
console.log("Recommended:", gasStrategy.standard);
// { maxFeePerGas: "25 gwei", maxPriorityFeePerGas: "2 gwei", estimatedTime: "~30s" }

// Contract analysis
const analysis = await assistant.analyzeContract("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
console.log(analysis.summary);
// "USDC (USD Coin) — ERC-20 token with admin controls, pausable, upgradeable proxy"

// LangChain/Vercel AI SDK tools
const tools = createTools(instance.context);
// Use with your preferred agent framework`,
    },
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 26. API REFERENCE
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "api",
    label: "API Reference",
    title: "API Reference",
    blurb:
      "Complete API surface for every package in the SDK — exports, types, and import patterns.",
    body: `The talak-web3 ecosystem is organized into 26+ scoped packages, each with a focused API surface. The unified talak-web3 meta-package re-exports everything through subpath exports, so you can import from either the scoped package or the meta-package.

Core packages: @talak-web3/core exports talakWeb3() (the factory function) and __resetTalakWeb3() (no-op for backwards compatibility). @talak-web3/config exports defineConfig(), createPreset(), mergeConfigs(), chain presets (mainnet, polygon, arbitrum, optimism, base, sepolia, goerli), and environment helpers. @talak-web3/types exports all shared TypeScript types: Address, Chain, ChainConfig, HexString, Hash, Transaction, TxParams, TxReceipt, RpcRequest, RpcResponse, AuthOptions, AuthResult, JWTPayload, SiweMessage, TalakWeb3Config, TalakWeb3Context, TalakWeb3Instance, TalakWeb3Plugin, UserOperation, and Store. @talak-web3/errors exports the full error hierarchy: TalakWeb3Error, AuthError, RpcError, TxError, ConfigError, NetworkError, and all subtypes plus the isSpecificError() type guard.

Auth packages: @talak-web3/auth exports TalakWeb3Auth (the main class). @talak-web3/auth/stores exports MemoryNonceStore, MemorySessionStore, MemoryRefreshTokenStore, RedisNonceStore, RedisSessionStore, and RedisRefreshTokenStore.

Network packages: @talak-web3/rpc exports RpcClient. @talak-web3/client exports TalakWeb3Client, InMemoryTokenStorage, and CookieTokenStorage plus wallet connectors (InjectedConnector, WalletConnectConnector, CoinbaseWalletConnector). @talak-web3/realtime exports RealtimeClient. @talak-web3/rate-limit exports createRateLimiter(), TokenBucketLimiter, SlidingWindowLimiter, and RateLimitMiddleware.

Feature packages: @talak-web3/tx exports TxBuilder, UserOperationBuilder, BundlerClient, and PaymasterClient. @talak-web3/identity exports IdentityResolver. @talak-web3/hooks exports TalakWeb3Provider and all React hooks. @talak-web3/adapters exports framework adapters. @talak-web3/ai exports AiAssistant and createTools().

Utility packages: @talak-web3/utils exports address, hex, bigint, encoding, hash, and retry utilities. @talak-web3/cli provides the CLI binary. @talak-web3/test-utils provides testing helpers. @talak-web3/templates contains CLI scaffold templates.

See the Packages page for detailed per-package documentation with full export lists, type signatures, and usage examples.`,
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 27. CONTRIBUTING
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "contributing",
    label: "Contributing",
    title: "Contributing Guide",
    blurb:
      "Fork, branch, test, and submit PRs with conventional commits — including security invariants and coverage thresholds.",
    body: `Contributions to talak-web3 are welcome! The project follows a fork-and-branch workflow with conventional commits and automated CI checks.

Start by cloning the repository: git clone https://github.com/dagimabebe/talak-web3.git. Enable Corepack (corepack enable) to use the pinned pnpm version, then run pnpm install to install all dependencies across the monorepo. Run pnpm build to compile all packages, pnpm test to run the full test suite, pnpm lint to check code style with oxlint, and pnpm typecheck to verify TypeScript types.

Commit messages must follow the Conventional Commits specification. Use prefixes like feat: for new features, fix: for bug fixes, docs: for documentation changes, test: for test additions, chore: for maintenance tasks, refactor: for code restructuring, perf: for performance improvements, and ci: for CI/CD changes. The commit-msg hook enforces this via commitlint — commits with non-conforming messages are rejected.

Pull requests must pass all CI checks before merging: build, typecheck, lint, and tests (including coverage thresholds). The auth package requires 95% test coverage, core requires 90%, and all other packages require 80%. Tests run against Node.js 22 and 24 in the CI matrix, with Redis services spun up for integration tests.

Critical rule: never weaken security invariants. The fail-closed architecture, mandatory Redis in production, nonce-before-verify pattern, RS256 requirement, and MemoryAuthStorage rejection are all deliberate security decisions. PRs that relax these constraints will be rejected unless they come with a thorough security analysis demonstrating that the change is safe.

Releases are managed via Changesets. After merging feature PRs, run pnpm changeset to create a changeset entry describing your change. The CI bot creates a "Version Packages" PR that bumps versions and updates changelogs. Merging that PR triggers automatic publishing to npm with provenance attestation.`,
    code: {
      filename: "development.sh",
      language: "bash",
      code: `# Clone and set up
git clone https://github.com/dagimabebe/talak-web3.git
cd talak-web3
corepack enable       # Activates the pinned pnpm version
pnpm install          # Install all workspace dependencies

# Build all packages (Turborepo parallel)
pnpm build

# Run the full test suite
pnpm test

# Run tests with coverage report
pnpm test:coverage

# Type checking
pnpm typecheck

# Lint with oxlint
pnpm lint

# Format with oxfmt
pnpm fmt

# Create a changeset for your PR
pnpm changeset

# Run only unit tests (exclude integration/e2e)
pnpm test:unit

# Run the website in development mode
pnpm docs:dev`,
    },
    links: [
      {
        label: "GitHub",
        href: "https://github.com/dagimabebe/talak-web3",
      },
      {
        label: "Code of Conduct",
        href: "https://github.com/dagimabebe/talak-web3/blob/main/CODE_OF_CONDUCT.md",
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────────────────
   * 28. TROUBLESHOOTING
   * ────────────────────────────────────────────────────────────────────── */
  {
    slug: "troubleshooting",
    label: "Troubleshooting",
    title: "Troubleshooting",
    blurb:
      "Solutions for common issues with installation, auth stores, JWT keys, Redis, CORS, provider failover, and TypeScript.",
    body: `This page covers the most frequently reported issues and their solutions.

MemoryAuthStorage rejected in production: If you see "In-memory auth stores are not allowed in production", you are running with NODE_ENV=production but haven't configured Redis stores. This is a deliberate security check — in-memory stores don't survive restarts, can't be shared across instances, and have no TTL enforcement. Solution: install ioredis, create Redis-backed stores (RedisNonceStore, RedisSessionStore, RedisRefreshTokenStore), and set REDIS_URL in your environment.

npm registry warnings: If you see "npm warn Unknown env config _dagimabebe-registry", this is a harmless warning from npm detecting a custom registry configuration. It does not affect installation or functionality. You can suppress it by adding the registry to your .npmrc or ignore it entirely.

pnpm version mismatch: The monorepo pins a specific pnpm version via the packageManager field. If you get version errors, run corepack enable to let Node.js manage the correct pnpm version automatically. Never install pnpm globally when working in this monorepo.

JWT key generation: You need an RS256 key pair for production auth. Generate one with OpenSSL: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem. Set the contents as JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables. The SDK rejects keys shorter than 2048 bits.

Redis connection issues: If auth endpoints return 503, check your Redis connection. Common causes: wrong REDIS_URL format (should be redis://host:port), Redis server not running, firewall blocking port 6379, or missing password. Test connectivity with redis-cli -u $REDIS_URL ping.

CORS errors with SIWE: If your browser shows CORS errors when calling auth endpoints, ensure your backend's CORS configuration includes your frontend's origin. The Hono adapter example uses cors({ origin: "https://app.talak-web3.dev" }). For development, use cors({ origin: "http://localhost:5173" }).

Provider failover not triggering: If requests fail instead of failing over, check that you've configured multiple endpoints for the same chain with different priorities. Also verify that healthCheckInterval isn't set too high — the default 30 seconds is usually appropriate. Call rpc.getHealthStatus(chainId) to see which providers are healthy.

TypeScript strict mode issues: The SDK is built with strict TypeScript (strictNullChecks, exactOptionalPropertyTypes, verbatimModuleSyntax). If you see type errors, ensure your tsconfig.json has "moduleResolution": "bundler" or "node16" and "module": "esnext" or "node16". The SDK uses subpath exports which require modern module resolution.`,
    code: {
      filename: "fix-common-issues.sh",
      language: "bash",
      code: `# Generate RS256 key pair for production JWT auth
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Set as environment variables (add to .env)
echo "JWT_PRIVATE_KEY=\"$(cat private.pem)\"" >> .env
echo "JWT_PUBLIC_KEY=\"$(cat public.pem)\"" >> .env

# Test Redis connectivity
redis-cli -u redis://localhost:6379 ping
# Expected output: PONG

# Fix pnpm version
corepack enable
corepack prepare pnpm@latest --activate

# Verify Node.js version (must be >= 22)
node --version

# Clear build cache if experiencing stale builds
pnpm turbo clean
rm -rf node_modules/.cache
pnpm install
pnpm build`,
    },
    links: [
      { label: "Discord", href: "https://discord.gg/talak-web3" },
      {
        label: "GitHub Issues",
        href: "https://github.com/dagimabebe/talak-web3/issues",
      },
    ],
  },
];

export function getDocSection(slug: string): DocSection | undefined {
  return DOC_SECTIONS.find((s) => s.slug === slug);
}
