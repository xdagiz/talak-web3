# Talak-Web3 Auth Migration Paths

## Purpose

This document defines **upgrade paths** for each security invariant when the current architecture reaches its limits. These are not immediate needs, but documented paths for future requirements.

---

## Decision Framework

### When to Migrate

Migrate when **ANY** of these triggers occur:

| Trigger | Current System | Migration Required |
|---------|---------------|-------------------|
| Multi-region active/active deployment | ❌ Cannot guarantee linearizability | ✅ Linearizable storage |
| Regulatory compliance (SOC2, ISO27001) | ❌ No formal proofs | ✅ Audited consensus system |
| Insider threat model expansion | ❌ Trusts infrastructure | ✅ Zero-trust architecture |
| Byzantine fault tolerance required | ❌ Crash faults only | ✅ BFT consensus |
| Pre-execution trust required | ❌ Post-load checks only | ✅ Verified boot |

### Cost-Benefit Analysis

| System | Complexity | Latency | Cost | Guarantees |
|--------|-----------|---------|------|------------|
| **Current (Redis)** | Low | <50ms | $ | Replicated durability |
| **etcd/Consul** | Medium | 50-200ms | $$ | Linearizability |
| **HSM-backed** | High | 100-500ms | $$$ | Hardware trust |
| **Blockchain-based** | Very High | 1-10s | $$$$ | BFT, global ordering |

---

## Invariant I2/I4: Nonce & Revocation → Consensus Storage

### Current Limitation

Redis replication provides **crash safety** but not **linearizability**:
- Partitioned primaries can accept divergent writes
- Failover may lose recent writes (<1s window)
- No quorum reads for strong consistency

### Migration Target: etcd

```
┌─────────────────┐
│  Application    │
│                 │
│  Linearizable   │
│  reads/writes   │
└────────┬────────┘
         │
┌────────┴────────┐
│   etcd Cluster  │
│   (3-5 nodes)   │
│   Raft consensus│
└─────────────────┘
```

### Implementation

```typescript
import { Etcd3 } from 'etcd3';

const client = new Etcd3({
  hosts: ['etcd-1:2379', 'etcd-2:2379', 'etcd-3:2379']
});

// Linearizable nonce consumption
async function consumeNonce(address: string, nonce: string): Promise<boolean> {
  const key = `nonces/${address}/${nonce}`;

  try {
    // Compare-and-swap for atomicity
    const result = await client
      .lease(300) // 5 minute TTL
      .put(key)
      .ifNotExists()
      .value('consumed');

    return result.succeeded;
  } catch (err) {
    // etcd quorum failure → fail closed
    throw new Error('Nonce store unavailable');
  }
}

// Linearizable revocation check
async function isRevoked(jti: string): Promise<boolean> {
  const value = await client.get(`revocations/${jti}`).string();
  return value !== null;
}
```

### Guarantees Gained

| Property | Redis | etcd | Improvement |
|----------|-------|------|-------------|
| Linearizability | ❌ No | ✅ Yes | Strong consistency |
| Quorum reads | ❌ No | ✅ Yes | Partition safety |
| Global ordering | ❌ No | ✅ Yes | Total order |
| Crash tolerance | 1 replica | (N-1)/2 nodes | Better availability |

### Migration Steps

1. **Dual-write phase** (2 weeks)
   - Write to both Redis and etcd
   - Read from Redis (canary)
   - Validate etcd responses match

2. **Shadow read phase** (1 week)
   - Write to etcd only
   - Read from both, compare results
   - Alert on mismatches

3. **Cutover** (1 hour)
   - Switch reads to etcd
   - Monitor for 24 hours
   - Decommission Redis (keep as backup)

### Rollback Plan

- Keep Redis running for 30 days post-migration
- Revert application config to Redis if needed
- No data migration needed (etcd is source of truth)

---

## Invariant I6: Time Authority → Hybrid Logical Clocks

### Current Limitation

Monotonic floor prevents rollback but doesn't establish **global total ordering**:
- Concurrent events on different nodes may be unordered
- NTP can be spoofed (mitigated but not eliminated)
- No causal relationship tracking

### Migration Target: HLC (Hybrid Logical Clocks)

```typescript
interface HLCTimestamp {
  logical: number;    // Logical counter
  physical: number;   // Physical time (NTP-synced)
  nodeId: string;     // Unique node identifier
}

class HybridLogicalClock {
  private timestamp: HLCTimestamp;

  constructor(nodeId: string) {
    this.timestamp = {
      logical: 0,
      physical: Date.now(),
      nodeId
    };
  }

  // Generate new timestamp
  now(): HLCTimestamp {
    const now = Date.now();

    this.timestamp = {
      logical: Math.max(this.timestamp.logical + 1, now - this.timestamp.physical),
      physical: now,
      nodeId: this.timestamp.nodeId
    };

    return { ...this.timestamp };
  }

  // Receive timestamp from another node
  receive(other: HLCTimestamp): void {
    this.timestamp = {
      logical: Math.max(this.timestamp.logical, other.logical) + 1,
      physical: Math.max(this.timestamp.physical, other.physical, Date.now()),
      nodeId: this.timestamp.nodeId
    };
  }

  // Compare timestamps (happens-before)
  happensBefore(a: HLCTimestamp, b: HLCTimestamp): boolean {
    return a.physical < b.physical ||
           (a.physical === b.physical && a.logical < b.logical);
  }
}
```

### Implementation

```typescript
// Token issuance with HLC
const hlc = new HybridLogicalClock(nodeId);

async function issueToken(address: string): Promise<string> {
  const timestamp = hlc.now();

  const token = {
    iat: timestamp.physical,
    hlc: timestamp, // Include HLC in token
    // ... other claims
  };

  return jwt.sign(token, privateKey);
}

// Token validation with causal ordering
async function validateToken(token: JWT): Promise<boolean> {
  const receivedHLC = token.hlc;
  const currentHLC = hlc.now();

  // Reject if token from future (clock skew)
  if (receivedHLC.physical > currentHLC.physical + 60000) {
    return false;
  }

  // Update local clock
  hlc.receive(receivedHLC);

  return true;
}
```

### Guarantees Gained

| Property | Current HLC | Improvement |
|----------|------------|-------------|
| Causal ordering | ✅ Yes | Tracks happens-before |
| Global monotonicity | ✅ Yes | Logical counter |
| Partition tolerance | ✅ Yes | No coordination needed |
| Bounded skew | ✅ Yes | Physical time bound |

### Migration Steps

1. **Add HLC to tokens** (non-breaking)
   - Include HLC timestamp in new tokens
   - Old tokens still valid (fallback to iat)

2. **Validate HLC** (dual validation)
   - Check both iat and HLC
   - Alert on discrepancies

3. **Enforce HLC** (breaking change)
   - Reject tokens without HLC
   - Full causal ordering enforced

---

## Invariant I10: Supply Chain → Verified Boot

### Current Limitation

Post-load integrity checks cannot prevent **pre-execution compromise**:
- Malicious code runs before hash verification
- Native addons bypass JavaScript checks
- Module loader not verified

### Migration Target: Container Signing + Verified Boot

```
┌─────────────────────────────────────┐
│        Build Pipeline               │
│                                     │
│  1. Build container                 │
│  2. Sign with Cosign                │
│  3. Upload to registry              │
│  4. Generate SBOM                   │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│        Deployment                   │
│                                     │
│  1. Verify signature before pull    │
│  2. Verify SBOM against policy      │
│  3. Run in confidential VM (TEE)    │
│  4. Remote attestation              │
└─────────────────────────────────────┘
```

### Implementation

#### 1. Container Signing (Cosign)

```bash
# Build and sign
docker build -t auth-service:1.0.0 .
cosign sign --key cosign.key auth-service:1.0.0

# Push to registry
docker push auth-service:1.0.0
cosign upload blob --blob sbom.json auth-service:1.0.0
```

#### 2. Admission Controller (Kubernetes)

```yaml
# policies/auth-signature-policy.yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: auth-service-signature
spec:
  images:
  - glob: "registry.internal/auth-service:*"
  authorities:
  - key:
      ref: "cosign.pub"
    attestations:
    - name: sbom
      predicateType: cosign.sigstore.dev/attestation/v1
```

#### 3. Runtime Verification

```typescript
import { verifySignature } from '@sigstore/verify';

// Before startup
async function verifyContainer(): Promise<void> {
  const imageDigest = process.env['CONTAINER_DIGEST'];
  const signature = await fetchSignature(imageDigest);

  const valid = await verifySignature({
    signature,
    publicKey: COSIGN_PUBLIC_KEY,
    image: imageDigest
  });

  if (!valid) {
    console.error('Container signature verification failed');
    process.exit(1);
  }

  console.log('Container signature verified');
}

// Run before anything else
verifyContainer().then(startApplication);
```

### Guarantees Gained

| Property | Current | Verified Boot | Improvement |
|----------|---------|---------------|-------------|
| Pre-execution trust | ❌ No | ✅ Yes | Prevents tampering |
| Build reproducibility | ❌ No | ✅ Yes | SBOM verification |
| Runtime attestation | ❌ No | ✅ Yes (with TEE) | Hardware proof |
| Supply chain visibility | Partial | ✅ Full | Complete audit trail |

### Migration Steps

1. **Add container signing** (CI/CD only)
   - Sign all builds
   - No runtime enforcement yet

2. **Add signature verification** (staging)
   - Verify before deployment
   - Reject unsigned images

3. **Enforce in production** (breaking)
   - Admission controller rejects unsigned
   - Runtime verification before startup

4. **Add TEE** (optional, high-security)
   - Run in confidential VM
   - Remote attestation

---

## Migration Decision Matrix

### Scenario: Multi-Region Active/Active

**Trigger** (ANY of these):
- Deployment spans ≥2 geographic regions
- Cross-region latency >100ms
- Regional failover required (RTO <5 min)

**Current**: Fails (replication lag across regions)

**Required**: etcd with cross-region consensus OR regional isolation

**Recommendation**:
- If <3 regions: etcd global cluster
- If >3 regions: Regional etcd + cross-region async replication

**Timeline**: 3-6 months

---

### Scenario: SOC2 Compliance

**Trigger** (ANY of these):
- Audit requires linearizability proof
- Compliance deadline <12 months
- Customer requires SOC2 Type II

**Current**: Fails (no formal guarantees, no audit trail)

**Required**: Linearizable storage + verified boot + audit logging

**Recommendation**:
1. Migrate to etcd (linearizability)
2. Implement container signing (supply chain)
3. Add comprehensive audit logging

**Timeline**: 6-12 months

---

### Scenario: Revocation SLA <50ms Globally

**Trigger** (ALL of these):
- Product requirement: revocation <50ms P99
- Current system: revocation >50ms (replication lag)
- Measured via `revocation_propagation_ms` metric

**Current**: Cannot guarantee (Redis async replication)

**Required**: Consensus-backed storage with quorum reads

**Recommendation**:
- Migrate to etcd/Consul
- Deploy globally distributed cluster
- Use quorum reads for linearizability

**Timeline**: 4-8 months

---

### Scenario: Supply Chain Risk > Threshold

**Trigger** (ANY of these):
- Handling custodial assets (user funds)
- Detected supply chain attempt in industry
- Regulatory mandate (e.g., financial services)
- Security audit flags pre-execution gap

**Current**: Partial (post-load detection only)

**Required**: Verified boot + signed containers + reproducible builds

**Recommendation**:
1. Implement container signing (Cosign)
2. Add admission controller
3. Deploy in confidential VM (optional)
4. Remote attestation

**Timeline**: 3-6 months

---

### Scenario: Nation-State Threat Model

**Trigger** (ALL of these):
- High-value target (government, critical infrastructure)
- Nation-state adversary in threat model
- Budget allows 10x infrastructure cost

**Current**: Fails (assumes honest infrastructure)

**Required**: HSM + TEE + BFT consensus + zero-trust

**Recommendation**:
1. Move to HSM-backed key management
2. Run in confidential computing (AWS Nitro/GCP SEV)
3. Migrate to BFT consensus (Tendermint/HotStuff)
4. Implement zero-trust network architecture

**Timeline**: 12-24 months
**Cost**: 10x infrastructure cost

---

### Scenario: Regulatory Mandate (Financial Services)

**Trigger** (ANY of these):
- Handling regulated financial data
- License requires specific technical controls
- Audit mandates formal verification

**Current**: May fail (depends on specific requirements)

**Required**: Likely linearizability + formal verification + audit

**Recommendation**:
1. Consult with compliance team
2. Map requirements to technical controls
3. Implement etcd + verified boot minimum
4. Consider formal verification (TLA+) for critical paths

**Timeline**: 6-18 months (depends on audit)

---

## Current System Viability

### When Current System is Sufficient

✅ Single-region deployment
✅ Standard threat model (external attackers)
✅ Crash fault tolerance adequate
✅ Sub-50ms latency required
✅ Limited operational team

### When Migration is Required

❌ Multi-region active/active
❌ Byzantine fault tolerance needed
❌ Regulatory compliance mandates
❌ Insider threat model expansion
❌ Pre-execution trust required

---

## Cost Estimates

| Migration | Engineering | Infrastructure | Timeline | Risk |
|-----------|------------|----------------|----------|------|
| Redis → etcd | 2-3 engineers | 2-3x Redis cost | 3 months | Medium |
| Add HLC | 1 engineer | No change | 1 month | Low |
| Container signing | 1 engineer | Minimal | 1 month | Low |
| TEE deployment | 2-3 engineers | 3-5x compute | 6 months | High |
| BFT consensus | 3-5 engineers | 5-10x current | 12 months | Very High |

---

## Recommendation

**For 95% of deployments, the current system is sufficient.**

Migrate only when:
1. **Specific requirements** demand stronger guarantees
2. **Regulatory mandates** require formal properties
3. **Threat model** expands beyond current assumptions

**Premature migration introduces complexity without proportional benefit.**

---

## Review Schedule

- **Quarterly**: Reassess threat model and requirements
- **Annually**: Evaluate migration triggers
- **Per deployment**: Document any architectural constraints

**This document is a living reference. Update as requirements evolve.**
