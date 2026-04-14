# Scaling Guide

`talak-web3` is designed for high-concurrency environments and can be scaled horizontally to meet increasing demand.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Horizontal Scaling Rules

The `hono-backend` is entirely **stateless**. This means you can run any number of instances behind a load balancer without needing session affinity (sticky sessions).

- **Requirement**: All instances MUST share the same **Redis** cluster.
- **Result**: Nonce consumption and refresh token rotation will remain atomic across all nodes.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Redis Scalability

Redis is the only stateful dependency for the core authentication layer.

- **Redis Cluster**: For high availability and massive throughput, use a Redis Cluster.
- **Lua Scripting**: Our scripts are compatible with Redis Cluster, provided that the keys used in the scripts map to the same hash slot (we use `{prefix}:address` tags where necessary to ensure this).
- **Latency**: Keep the network latency between your backend nodes and Redis as low as possible (<1ms recommended), as every login/refresh requires an atomic Redis round-trip.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> RPC Provider Scaling

The `talak-web3-rpc` package handles provider management. To scale your blockchain interactions:
- **Provider Rotation**: Configure multiple RPC URLs per chain. The framework will automatically failover and load-balance across them.
- **Rate Limits**: monitor your upstream provider usage. If you hit provider-side limits, add more unique providers to your configuration.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Performance Benchmarks

In 100-concurrency stress tests, the `hono-backend` maintains sub-100ms response times for authenticated SIWE login when backed by a standard Redis instance.

---

Next: [Failure Modes](./FAILURE_MODES.md)
