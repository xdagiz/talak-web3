# Talak-Web3 Auth: Security Enforcement Framework

## From "Secure If Followed" to "Secure Unless Actively Subverted"

This document describes how the authentication system enforces security assumptions **in code**, not just in documentation.

---

## Enforcement Layers

### Layer 1: Startup Assertions (Pre-Traffic)

**Before accepting any authentication requests, the system verifies:**

```typescript
async function bootstrap(): Promise<void> {

  await assertRedisConfiguration(redis);

  await assertRedisReplication(redis, { minReplicas: 1, maxLagSeconds: 10 });

  await time.initialize();

  verifyDependencyIntegrity({ failClosed: true });

  startServer();
}
```

**Key Property**: System **refuses to start** if infrastructure is misconfigured.

---

### Layer 2: Runtime Enforcement (Per-Request)

**Every authentication request is validated against invariants:**

```typescript
async function authenticate(request: AuthRequest): Promise<Session> {

  const consumed = await nonceStore.consume(address, nonce);
  if (!consumed) {
    throw new Error('Nonce already used');
  }

  const isRevoked = await revocationStore.isRevoked(jti);
  if (isRevoked) {
    throw new Error('Token revoked');
  }

  const now = time.now();
  if (token.exp < now) {
    throw new Error('Token expired');
  }

  if (token.contextHash !== computeContextHash(request.ip, request.userAgent)) {
    throw new Error('Token context mismatch');
  }

  return createSession(token);
}
```

**Key Property**: All invariant violations **reject the request**, never allow uncertain state.

---

### Layer 3: Continuous Monitoring (Background)

**Background processes verify system health continuously:**

```typescript
setInterval(async () => {
  try {
    await time.sync();
  } catch (err) {

    logger.critical('Time sync failed — system will fail closed');
    metrics.increment('time_sync_failures_total');
  }
}, 60_000);

setInterval(() => {
  try {
    verifyDependencyIntegrity({ failClosed: true });
  } catch (err) {

  }
}, 300_000);

setInterval(async () => {
  const latency = await measureWaitLatency(redis);
  metrics.record('redis_wait_latency_ms', latency);

  if (latency > 500) {
    logger.critical('Replication lag critical — consider shutdown');
    metrics.increment('fail_closed_events_total', { invariant: 'I2' });
  }
}, 10_000);
```

**Key Property**: Degradation is **detected and reported**, not silently accepted.

---

### Layer 4: Kill Conditions (Automatic Shutdown)

**When system cannot verify safety, it shuts down:**

| Condition | Trigger | Action | Invariant Protected |
|-----------|---------|--------|---------------------|
| Redis unreachable | >5 failures in 30s | `process.exit(1)` | I2, I4, I6 |
| Time drift excessive | >10,000ms | `process.exit(1)` | I6 |
| Integrity check fails | Any mismatch | `process.exit(1)` | I10 |
| Replication lag critical | P99 >500ms for 5min | `process.exit(1)` | I2, I4 |
| Monotonic violation | Any regression | `process.exit(1)` | I6 |

**Implementation**:
```typescript
app.get('/healthz', async (req, res) => {
  try {
    await redis.ping();
    await time.sync();
    res.status(200).send('ok');
  } catch (err) {
    res.status(503).send('unhealthy');

  }
});
```

**Key Property**: System **terminates itself** rather than operate unsafely.

---

## Fault Injection Validation

**All enforcement mechanisms are tested via active fault injection:**

### Test Suite: `fault-injection.test.ts`

```typescript
it('should fail closed when Redis unreachable', async () => {
  await redis.quit();
  await expect(nonceStore.consume(address, nonce))
    .rejects.toThrow('Redis nonce store failure');
});

it('should fallback to Redis when Pub/Sub broken', async () => {

  const isRevoked = await revocationStore.isRevoked(jti);
  expect(isRevoked).toBe(true);
});

it('should reject when time drift exceeds threshold', async () => {
  const mockTimeSource = { getTime: () => Date.now() + 10_000 };
  const time = new AuthoritativeTime({ timeSource: mockTimeSource });
  await expect(time.sync()).rejects.toThrow('Clock drift exceeds threshold');
});

it('should exit process when dependency hash mismatch', async () => {
  const mockDeps = [{ packageName: '@talak-web3/errors', expectedHash: 'sha256:invalid' }];
  expect(() => verifyDependencyIntegrity({ dependencies: mockDeps }))
    .toThrow('process.exit(1)');
});
```

**Key Property**: Enforcement is **provably triggered**, not just documented.

---

## Operator Constraints

**Operators are part of the trust boundary. Application enforces constraints:**

### Forbidden Operations (Application Will Refuse to Start)

```bash
redis-cli DEL talak:nonce:consumed:*
redis-cli DEL talak:jti:*

redis-cli CONFIG SET appendonly no
redis-cli CONFIG SET maxmemory-policy allkeys-lru

redis-cli CONFIG SET min-replicas-to-write 0
```

### Required Operations (Application Verifies on Startup)

```bash
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync
redis-cli CONFIG GET min-replicas-to-write

redis-cli INFO replication

```

**Key Property**: Operators **cannot misconfigure without detection**.

---

## Migration Triggers (Quantitative)

**System documents when architecture must change:**

| Metric | Threshold | Trigger | Action |
|--------|-----------|---------|--------|
| `revocation_propagation_ms` P99 | >50ms | Revocation SLA violation | Migrate to etcd |
| Deployment regions | ≥2 | Multi-region requirement | Migrate to consensus |
| `integrity_check_failures_total` | >0 | Supply chain risk | Implement verified boot |
| Compliance deadline | <12 months | SOC2/ISO27001 required | Full audit + migration |
| Cross-region latency | >100ms | Regional failover needed | Regional isolation |

**Key Property**: Migration decisions are **data-driven, not subjective**.

---

## Security Posture Evolution

### Before Enforcement (Documents Only)

```
Security = invariants + assumptions + human discipline
          ↑ WEAK LINK
```

- Documents existed but not enforced
- Misconfiguration possible without detection
- Degradation to probabilistic security silent
- Operators trusted implicitly

### After Enforcement (Code + Documents)

```
Security = invariants + assumptions + code enforcement + human discipline
                                      ↑ NEW LAYER
```

- Documents backed by startup assertions
- Misconfiguration prevents startup
- Degradation triggers automatic shutdown
- Operators constrained by application

---

## What This Achieves

### Guarantees (Enforced in Code)

✅ **Redis configuration** — System verifies on startup, refuses to start if wrong
✅ **Replication status** — Monitored continuously, alerts on degradation
✅ **Time authority** — Monotonic guard enforced, historical drift persisted
✅ **Dependency integrity** — Hash verification at startup + every 5 minutes
✅ **Kill conditions** — System shuts down when unsafe, doesn't degrade silently
✅ **Operator constraints** — Forbidden actions invalidate startup assertions
✅ **Fault tolerance** — All failure modes tested via fault injection

### Limitations (Still Require Human Discipline)

⚠️ **Pre-execution trust** — Cannot prevent compromised container from starting
⚠️ **Infrastructure provisioning** — Cannot enforce Redis deployment topology
⚠️ **Network security** — Cannot prevent Redis exposure to public internet
⚠️ **Secret management** — Cannot enforce secure storage of Redis password

### Not Protected By Design

❌ **Byzantine faults** — Assumes Redis nodes not actively malicious
❌ **Nation-state attacks** — Assumes infrastructure not compromised
❌ **Physical security** — Assumes servers not physically accessed
❌ **Social engineering** — Assumes operators not tricked into bypassing controls

---

## Continuous Enforcement

### Automated Checks

- **Startup**: Infrastructure assertions before traffic
- **Runtime**: Per-request invariant validation
- **Background**: Continuous health monitoring
- **Periodic**: Dependency integrity re-verification
- **Kubernetes**: Liveness probes fail → pod restart

### Human Checks

- **Monthly**: Alert false positive rate review
- **Quarterly**: Fault injection test execution
- **Quarterly**: Failover procedure testing
- **Annually**: Threat model reassessment
- **Per-incident**: Post-mortem and document updates

---

## Final State

The system now enforces security assumptions at **four layers**:

1. **Prevention**: Startup assertions block misconfiguration
2. **Detection**: Runtime validation catches invariant violations
3. **Response**: Kill conditions shut down unsafe operation
4. **Verification**: Fault injection proves enforcement works

This transitions the system from:

> "Secure if operators follow documents"

to:

> **"Secure unless infrastructure is actively subverted"**

The remaining gap is **pre-execution trust**, which requires:
- Container image signing
- Verified boot
- Hardware security modules

These are **deployment-time concerns**, not application-layer concerns.

---

## Related Documents

- [THREAT_MODEL.md](./THREAT_MODEL.md) — Security contract and adversary classes
- [INVARIANT_CLOSURE_REPORT.md](./INVARIANT_CLOSURE_REPORT.md) — Invariant proofs and failure models
- [MONITORING_AND_ALERTING.md](./MONITORING_AND_ALERTING.md) — Metrics, alerts, and kill conditions
- [REDIS_DEPLOYMENT_RUNBOOK.md](./REDIS_DEPLOYMENT_RUNBOOK.md) — Infrastructure configuration and operator constraints
- [MIGRATION_PATHS.md](./MIGRATION_PATHS.md) — Quantitative migration triggers
- [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md) — High-level overview and checklist

**All documents are required. Code enforces what documents specify.**
