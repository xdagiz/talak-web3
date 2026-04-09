# Performance Optimization

Talak-Web3 is designed for high-performance Web3 applications.

## Metrics
- **Cold Start**: < 187ms
- **Hot Path**: < 23ms
- **Dependency Count**: 47 (strictly enforced)

## Best Practices

### 1. Plugin Selection
Only include the plugins you need. Each plugin adds a small overhead to the initialization.

```typescript
const b3 = talakWeb3({
  plugins: [AuthPlugin] // Minimal setup
});
```

### 2. RPC Failover
Configure multiple RPC endpoints to ensure high availability. Talak-Web3 automatically handles retries and failover.

```typescript
const config = {
  chains: [{
    id: 1,
    rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/...', 'https://mainnet.infura.io/v3/...']
  }]
};
```

### 3. Tree Shaking
Talak-Web3 is fully tree-shakable. Use ES modules to ensure unused code is removed from your production bundle.

### 4. Fast Tasks & Benchmarking
Use the fast task runner and benchmarks to leverage pnpm workspace parallelism and TypeScript incremental builds.

```bash
# Fast builds/typechecks/tests (optionally scoped)
pnpm build:fast -- talak-web3
pnpm typecheck:fast -- talak-web3
pnpm test:fast -- talak-web3

# End-to-end benchmark (baseline vs cached warm runs)
pnpm benchmark:tasks -- talak-web3

# Inspect logs and JSON
type benchmark-tasks.latest.json
```

Outputs include a speedup factor vs a cold baseline and write results to `benchmark-tasks.latest.json`. The current repo benchmark shows ~1.33x speedup on the second warm run.
