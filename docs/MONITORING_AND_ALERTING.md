# Talak-Web3 Authentication Monitoring & Alerting

## Principle: No Signal → No Guarantee

Every security invariant must have corresponding metrics and alerts. Without monitoring, the system silently degrades from deterministic to probabilistic security.

---

## Invariant: I2 — Nonce Durability

### Metrics

```typescript
// Nonce reuse detected (should ALWAYS be 0)
nonce_reuse_detected_total: Counter

// Redis WAIT latency (should be <100ms P99)
redis_wait_latency_ms: Histogram
  buckets: [10, 25, 50, 100, 200, 500]

// Nonce consumption failures
nonce_consumption_failures_total: Counter
  labels: [reason: 'redis_unreachable' | 'replication_timeout' | 'lua_error']
```

### Alerts

```yaml
# CRITICAL: Nonce reuse detected
- alert: NonceReuseDetected
  expr: increase(nonce_reuse_detected_total[5m]) > 0
  for: 0m
  labels:
    severity: critical
    invariant: I2
  annotations:
    summary: "Nonce reuse detected - possible replay attack or data loss"
    action: "Investigate Redis replication lag and AOF durability"

# WARNING: WAIT latency spike
- alert: NonceWaitLatencyHigh
  expr: histogram_quantile(0.99, redis_wait_latency_ms) > 100
  for: 5m
  labels:
    severity: warning
    invariant: I2
  annotations:
    summary: "Redis WAIT latency >100ms - replication may be degraded"
    action: "Check Redis replica health and network latency"

# CRITICAL: WAIT timeout
- alert: NonceWaitTimeout
  expr: increase(nonce_consumption_failures_total{reason="replication_timeout"}[5m]) > 10
  for: 1m
  labels:
    severity: critical
    invariant: I2
  annotations:
    summary: "Redis WAIT timeouts exceeding threshold"
    action: "Redis replication broken - nonce durability compromised"
```

---

## Invariant: I4 — Distributed Revocation

### Metrics

```typescript
// Pub/Sub disconnection duration
revocation_pubsub_disconnect_seconds: Gauge

// Pub/Sub message lag (time from publish to receive)
revocation_pubsub_lag_ms: Histogram
  buckets: [5, 10, 25, 50, 100, 200]

// Fallback to Redis checks (indicates cache miss or Pub/Sub failure)
revocation_redis_fallback_total: Counter

// Revocation propagation time (end-to-end)
revocation_propagation_ms: Histogram
  buckets: [10, 25, 50, 100, 200, 500]
```

### Alerts

```yaml
# CRITICAL: Pub/Sub disconnected
- alert: RevocationPubSubDisconnected
  expr: revocation_pubsub_disconnect_seconds > 5
  for: 0m
  labels:
    severity: critical
    invariant: I4
  annotations:
    summary: "Revocation Pub/Sub disconnected >5s"
    action: "Pub/Sub failure - revocation propagation degraded to Redis polling"

# WARNING: High fallback rate
- alert: RevocationFallbackRateHigh
  expr: rate(revocation_redis_fallback_total[5m]) > 100
  for: 5m
  labels:
    severity: warning
    invariant: I4
  annotations:
    summary: "High rate of Redis fallback checks"
    action: "Cache miss rate high or Pub/Sub not delivering messages"

# CRITICAL: Revocation propagation slow
- alert: RevocationPropagationSlow
  expr: histogram_quantile(0.95, revocation_propagation_ms) > 200
  for: 5m
  labels:
    severity: critical
    invariant: I4
  annotations:
    summary: "Revocation propagation >200ms P95"
    action: "Network latency or Redis replication degraded"
```

---

## Invariant: I6 — Time Trust

### Metrics

```typescript
// Time drift from authoritative source
time_drift_ms: Gauge
  labels: [source: 'cloudflare' | 'google']

// Monotonic time violations (should ALWAYS be 0)
monotonic_violation_total: Counter
  labels: [type: 'regression' | 'excessive_jump']

// Time sync failures
time_sync_failures_total: Counter
  labels: [reason: 'all_sources_failed' | 'drift_exceeded' | 'network_error']

// Monotonic floor value (for debugging)
time_monotonic_floor: Gauge
```

### Alerts

```yaml
# CRITICAL: Time drift exceeds threshold
- alert: TimeDriftExceeded
  expr: abs(time_drift_ms) > 5000
  for: 0m
  labels:
    severity: critical
    invariant: I6
  annotations:
    summary: "Time drift >5s from authoritative source"
    action: "System clock or time source compromised - failing closed"

# CRITICAL: Monotonic time violation
- alert: MonotonicTimeViolation
  expr: increase(monotonic_violation_total[5m]) > 0
  for: 0m
  labels:
    severity: critical
    invariant: I6
  annotations:
    summary: "Monotonic time violation detected"
    action: "Clock regression or jump detected - possible attack"

# WARNING: Time source failures
- alert: TimeSourceFailures
  expr: rate(time_sync_failures_total[5m]) > 0.1
  for: 5m
  labels:
    severity: warning
    invariant: I6
  annotations:
    summary: "Time synchronization failures detected"
    action: "Network connectivity or time source availability issues"
```

---

## Invariant: I10 — Supply Chain Integrity

### Metrics

```typescript
// Integrity check failures (should ALWAYS be 0)
integrity_check_failures_total: Counter
  labels: [component: 'dependency_hash' | 'lockfile' | 'runtime_freeze']

// Integrity check duration
integrity_check_duration_ms: Histogram
  buckets: [50, 100, 200, 500, 1000]

// Periodic check runs
integrity_checks_total: Counter
  labels: [result: 'success' | 'failure']
```

### Alerts

```yaml
# CRITICAL: Any integrity failure
- alert: IntegrityCheckFailed
  expr: increase(integrity_check_failures_total[1m]) > 0
  for: 0m
  labels:
    severity: critical
    invariant: I10
  annotations:
    summary: "Dependency integrity check failed"
    action: "IMMEDIATE: System should exit. Investigate supply chain compromise."

# WARNING: Integrity check slow
- alert: IntegrityCheckSlow
  expr: histogram_quantile(0.95, integrity_check_duration_ms) > 500
  for: 5m
  labels:
    severity: warning
    invariant: I10
  annotations:
    summary: "Integrity checks taking >500ms"
    action: "Filesystem or package resolution performance issue"
```

---

## Global Metrics

### Fail-Closed Events

```typescript
// System rejecting requests due to invariant violation
fail_closed_events_total: Counter
  labels: [
    invariant: 'I2' | 'I4' | 'I6' | 'I10',
    reason: string
  ]
```

### Alert Rule

```yaml
# INFO: Fail-closed event (system protecting itself)
- alert: FailClosedEvent
  expr: increase(fail_closed_events_total[5m]) > 0
  for: 0m
  labels:
    severity: info
    team: security
  annotations:
    summary: "System entered fail-closed state"
    action: "System protected itself. Investigate root cause and restore service."
```

---

## KILL CONDITIONS — System Shutdown Triggers

**PRINCIPLE: A secure system must know when it is unsafe to operate.**

The following conditions trigger **immediate system shutdown** (not just alerts):

### Kill Condition 1: Redis Unreachable

**Trigger**: Redis connection failures >5 in 30 seconds

**Action**:
```typescript
// Application refuses to start or shuts down
if (redisConnectionFailures > 5 within 30s) {
  logger.critical('Redis unreachable — shutting down to prevent security degradation');
  process.exit(1);
}
```

**Rationale**: Without Redis, all invariants (I2, I4, I6) cannot be verified. Continuing operation would degrade to probabilistic security.

**Recovery**: Fix Redis connectivity, restart application.

---

### Kill Condition 2: Time Drift Exceeds Bound

**Trigger**: `time_drift_ms` >10,000ms (10 seconds)

**Action**:
```typescript
// Time authority rejects all operations
if (Math.abs(driftMs) > 10_000) {
  logger.critical('Time drift exceeds critical bound — shutting down');
  process.exit(1);
}
```

**Rationale**: Excessive drift invalidates all token expiration checks. System cannot determine if tokens are valid.

**Recovery**: Fix NTP/time source, verify system clock, restart.

---

### Kill Condition 3: Integrity Check Fails

**Trigger**: `integrity_check_failures_total` > 0

**Action**:
```typescript
// Immediate exit on any integrity failure
verifyDependencyIntegrity({ failClosed: true });
// If violation detected, process.exit(1) called internally
```

**Rationale**: Dependency compromise means all code paths are untrusted. System cannot trust itself.

**Recovery**: Investigate supply chain, rebuild from known-good state, rotate all secrets.

---

### Kill Condition 4: Replication Lag Exceeds Limit

**Trigger**: `redis_wait_latency_ms` P99 >500ms for 5 minutes

**Action**:
```typescript
// Shutdown if replication consistently degraded
if (p99WaitLatency > 500ms for 5min) {
  logger.critical('Replication lag exceeds limit — nonce/revocation durability compromised');
  process.exit(1);
}
```

**Rationale**: High replication lag means WAIT cannot guarantee durability. Nonce consumption and revocation may be lost on crash.

**Recovery**: Fix Redis replication, check network, restart application.

---

### Kill Condition 5: Monotonic Time Violation

**Trigger**: `monotonic_violation_total` > 0

**Action**:
```typescript
// Time regression detected — possible attack
if (monotonicViolations > 0) {
  logger.critical('Monotonic time violation — possible clock manipulation attack');
  process.exit(1);
}
```

**Rationale**: Time regression invalidates all causal ordering. System cannot trust temporal relationships.

**Recovery**: Investigate time source, check for attacks, restart with verified time.

---

### Kill Condition Implementation

All kill conditions are enforced at multiple layers:

1. **Startup**: Assert infrastructure health before accepting traffic
2. **Runtime**: Continuous monitoring with automatic shutdown
3. **Health checks**: Kubernetes liveness probe fails → pod restart

```typescript
// Application bootstrap
async function bootstrap(): Promise<void> {
  // 1. Verify Redis infrastructure
  await assertRedisInfrastructure(redis);

  // 2. Verify time authority
  await time.initialize();

  // 3. Verify dependency integrity
  verifyDependencyIntegrity({ failClosed: true });

  // 4. Start monitoring kill conditions
  startKillConditionMonitor();

  // 5. Accept traffic
  startServer();
}
```

**A system that cannot verify its own safety must shut down.**

---

## Dashboard Panels

### Invariant Health Overview

```
Panel 1: Nonce Durability (I2)
- nonce_reuse_detected_total (should be 0)
- redis_wait_latency_ms P99 (should be <100ms)

Panel 2: Revocation Propagation (I4)
- revocation_pubsub_lag_ms P95 (should be <50ms)
- revocation_redis_fallback_total rate

Panel 3: Time Authority (I6)
- time_drift_ms absolute value (should be <5000ms)
- monotonic_violation_total (should be 0)

Panel 4: Supply Chain (I10)
- integrity_check_failures_total (should be 0)
- integrity_checks_total success rate

Panel 5: Fail-Closed Events
- fail_closed_events_total by invariant
- System availability vs security trade-offs
```

---

## Alert Routing

### Critical Alerts (Page Immediately)

- `NonceReuseDetected` → Security team + On-call engineer
- `MonotonicTimeViolation` → On-call engineer
- `IntegrityCheckFailed` → Security team + On-call engineer
- `RevocationPubSubDisconnected` (if >30s) → On-call engineer

### Warning Alerts (Investigate Within 1 Hour)

- `NonceWaitLatencyHigh` → On-call engineer
- `RevocationFallbackRateHigh` → On-call engineer
- `TimeDriftExceeded` (if <5s but rising) → On-call engineer
- `TimeSourceFailures` → On-call engineer

### Info Alerts (Review Next Business Day)

- `FailClosedEvent` → Security team
- `RevocationPropagationSlow` → Infrastructure team

---

## Runbook Links

Each alert must link to a runbook:

```yaml
annotations:
  runbook_url: https://wiki.internal/runbooks/auth-{invariant}-{alert}
```

### Required Runbooks

1. `runbooks/auth-I2-nonce-reuse.md`
2. `runbooks/auth-I4-revocation-partition.md`
3. `runbooks/auth-I6-time-drift.md`
4. `runbooks/auth-I10-integrity-failure.md`
5. `runbooks/auth-fail-closed-recovery.md`

---

## Testing Alerts

### Quarterly Alert Validation

```bash
# Test nonce reuse detection
curl -X POST http://auth-service/test/nonce-reuse

# Test revocation alert
redis-cli PUBLISH talak:revocation:broadcast '{"type":"test"}'

# Test time drift alert
# (Mock time source in staging only)

# Test integrity failure
# (Modify test dependency hash in staging)
```

**All alerts must fire and route correctly.**

---

## Retention

- **Raw metrics**: 15 days (high resolution)
- **Aggregated metrics**: 90 days (1-hour resolution)
- **Alert history**: 1 year
- **Fail-closed events**: Permanent (audit trail)

---

## Review Cycle

- **Monthly**: Review alert false positive rate
- **Quarterly**: Validate all alerts fire correctly
- **Annually**: Reassess thresholds and invariant definitions

**Without this monitoring, the system's guarantees are unenforceable.**
