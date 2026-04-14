# Observability Guide

`talak-web3` provides deep operational visibility through structured logging and unified metrics. This document explains how to monitor your deployment.

## Metrics Collection

The `hono-backend` collects real-time metrics for all critical authentication and RPC operations.

### Key Metrics
- **Authentication**:
    - `auth.login.success`: Counter of successful SIWE logins.
    - `auth.login.failure`: Counter of failed logins (tagged with error code).
    - `auth.refresh.success`: Counter of successful token rotations.
    - `auth.login.duration`: Histogram/Timer for login processing latency.
- **RPC**:
    - `rpc.error`: Counter of upstream RPC failures.
    - `rpc.duration`: Histogram/Timer for RPC request latency.
- **Rate Limiting**:
    - `rate_limit.hit`: Counter of blocked requests (tagged with endpoint and IP/Address).

### Prometheus Integration
Currently, metrics are exported to the backend logs. To integrate with Prometheus:
1. Enable the `/metrics` endpoint in `server.ts`.
2. Configure your Prometheus scraper to poll the endpoint at regular intervals.
3. The response will be formatted in the standard Prometheus text format.

## Structured Logging

We use [Pino](https://getpino.io/) for high-performance, structured JSON logging.

### Log Enrichment
Every request is automatically enriched with:
- `reqId`: A unique `x-request-id` (UUID) for tracing.
- `method` / `path`: The HTTP request details.
- `address`: The authenticated wallet address (if available).
- `ip`: The source IP of the request.

### Log Levels
- `info`: Standard operational events (login success, RPC success).
- `warn`: Recoverable errors or security events (failed login, rate limit hit).
- `error`: Infrastructure failures (Redis down, upstream RPC timeout).

## Tracing a Request

To trace a specific request across multiple components:
1. Search your log aggregator (e.g., ELK, Datadog, CloudWatch) for the `reqId`.
2. This ID is propagated through the `talak-web3-core` context and will appear in all logs generated during that request's lifecycle.

---

Next: [Scaling Guide](./SCALING.md)
