# Auth/Crypto Test Specifications

**CRITICAL**: These tests MUST pass before any production deployment.

---

## PHASE 1: Cryptographic Invariant Tests

### TC-001: JWKS Modulus Validation

**Purpose**: Verify JWKS exports valid RSA modulus, not placeholder values

**Steps**:
1. Generate RSA keypair using `jose.generateKeyPair('RS256')`
2. Initialize `JwksManager` and add key
3. Call `getJwks()`
4. Decode `n` field from base64url to BigInt
5. Compare with actual key modulus from `exportJWK()`

**Expected Results**:
- ✅ `n` and `e` fields are valid base64url-encoded values
- ✅ Decoded `n` matches actual RSA modulus
- ✅ `x5t#S256` matches SHA-256 hash of SPKI certificate
- ✅ NO `x5t` (SHA-1) field present

**Failure Mode**: Placeholder or incorrect modulus → JWT verification bypass

---

### TC-002: JWKS Key ID Uniqueness

**Purpose**: Verify duplicate key IDs are rejected

**Steps**:
1. Generate RSA keypair #1, add to JwksManager with kid="key1"
2. Generate RSA keypair #2
3. Attempt to add key #2 with kid="key1" (same ID)

**Expected Results**:
- ✅ Second `addKey()` throws `AUTH_DUPLICATE_KID` error
- ✅ Only one key exists in JWKS

**Failure Mode**: Duplicate kids → key rotation attacks

---

### TC-003: JWKS Algorithm Consistency

**Purpose**: Verify non-RSA keys are rejected in RS256 JWKS

**Steps**:
1. Generate EC keypair using `jose.generateKeyPair('ES256')`
2. Attempt to add to JwksManager with `addKey()`

**Expected Results**:
- ✅ `addKey()` throws `AUTH_ALG_MISMATCH` error
- ✅ Error message: "Non-RSA key in RS256 JWKS"

**Failure Mode**: Algorithm mismatch → signature confusion attacks

---

### TC-004: SHA-1 Thumbprint Removal

**Purpose**: Verify SHA-1 x5t is NOT included in JWKS

**Steps**:
1. Initialize JwksManager with valid RSA key
2. Call `getJwks()`
3. Inspect returned JSON

**Expected Results**:
- ✅ NO `x5t` field in any key
- ✅ `x5t#S256` field IS present
- ✅ Only SHA-256 thumbprints exposed

**Failure Mode**: SHA-1 presence → downgrade attacks

---

## PHASE 2: Authentication Invariant Tests

### TC-005: SIWE Domain-Origin Binding

**Purpose**: Prevent cross-domain SIWE replay attacks

**Steps**:
1. Create SIWE message with domain="evil.com"
2. Send POST `/auth/login` with:
   - Body: `{ message, signature }`
   - Header: `Origin: https://good.com`
3. Observe response

**Expected Results**:
- ✅ HTTP 403 Forbidden
- ✅ Response: `{ error: "Domain-origin mismatch", code: "AUTH_DOMAIN_MISMATCH" }`
- ✅ No JWT tokens issued

**Failure Mode**: Missing binding → full account takeover via replay

---

### TC-006: SIWE Issued-At Time Validation

**Purpose**: Prevent replay of old SIWE messages

**Steps**:
1. Create SIWE message with `Issued At: 2020-01-01T00:00:00Z` (old timestamp)
2. Sign message with valid key
3. Send POST `/auth/login`

**Expected Results**:
- ✅ HTTP 401 Unauthorized
- ✅ Error: `AUTH_SIWE_TIME_DRIFT`
- ✅ Message: "SIWE message timestamp out of tolerance"

**Failure Mode**: No time check → unlimited replay window

---

### TC-007: SIWE Domain Hostname Validation

**Purpose**: Reject malformed or protocol-containing domains

**Steps**:
1. Create SIWE message with domain="https://example.com" (contains protocol)
2. Attempt login

**Expected Results**:
- ✅ HTTP 400 Bad Request
- ✅ Error: `AUTH_SIWE_PARSE_ERROR`
- ✅ Message: "Invalid SIWE domain"

---

### TC-008: Nonce Replay Prevention (Distributed)

**Purpose**: Verify nonce is single-use across instances

**Steps**:
1. Instance A: Create nonce for address `0x123...`
2. Instance B: Submit login with that nonce (should succeed)
3. Instance A: Submit login with SAME nonce again

**Expected Results**:
- ✅ First login: HTTP 200 OK, tokens issued
- ✅ Second login: HTTP 401, error `AUTH_SIWE_NONCE_REPLAY`
- ✅ Redis shows nonce key deleted after first use

**Failure Mode**: Nonce reuse → unlimited authentication bypass

---

## PHASE 3: Trust Boundary Tests

### TC-009: Trusted Proxy IP Validation

**Purpose**: Verify x-forwarded-for is only trusted from known proxies

**Setup**:
```typescript
// Mock request
const mockReq = {
  headers: {
    'x-forwarded-for': '1.2.3.4', // Attacker-controlled
  },
  socket: {
    remoteAddress: '192.168.1.1', // Not in TRUSTED_PROXIES
  }
};
```

**Steps**:
1. Call `getIp(mockContext)` with untrusted socket IP
2. Observe returned IP

**Expected Results**:
- ✅ Returns `192.168.1.1` (socket address)
- ✅ Does NOT return `1.2.3.4` (forwarded header)
- ✅ Warning logged: "x-forwarded-for received from untrusted source"

**Failure Mode**: Spoofed IP → rate limiting bypass

---

### TC-010: Cloudflare Header Priority

**Purpose**: Verify cf-connecting-ip is used when available

**Steps**:
1. Mock request with:
   - `cf-connecting-ip: 10.20.30.40`
   - `x-forwarded-for: 50.60.70.80`
2. Call `getIp()`

**Expected Results**:
- ✅ Returns `10.20.30.40` (Cloudflare header)
- ✅ Ignores x-forwarded-for when Cloudflare present

---

### TC-011: Redis Security Audit - Missing AUTH

**Purpose**: Verify startup fails if Redis has no authentication

**Steps**:
1. Start Redis WITHOUT `requirepass` in redis.conf
2. Run `RedisSecurityAuditor.auditSecurity()`
3. Check returned status

**Expected Results**:
- ✅ Status: `critical`
- ✅ Issue: "CRITICAL: Redis AUTH is not enabled"
- ✅ Server startup exits with code 1

**Failure Mode**: Unauthenticated Redis → session manipulation

---

### TC-012: Redis Security Audit - Missing ACL

**Purpose**: Verify warning if no custom ACL users configured

**Steps**:
1. Start Redis with AUTH but only default user
2. Run `auditSecurity()`

**Expected Results**:
- ✅ Status: `warning`
- ✅ Issue: "WARNING: No custom ACL users configured"
- ✅ Recommendation: "Configure ACL users with least-privilege access"

---

## PHASE 4: CSRF Tests

### TC-013: CSRF SameSite=Strict Enforcement

**Purpose**: Verify CSRF cookie prevents cross-site sends

**Steps**:
1. Send request to any endpoint
2. Inspect `Set-Cookie` header for `csrf_token`

**Expected Results**:
- ✅ Cookie includes `SameSite=Strict`
- ✅ Cookie includes `Secure; HttpOnly`
- ✅ NO `SameSite=None` present

**Failure Mode**: SameSite=None → cross-site CSRF attacks

---

### TC-014: CSRF Origin Validation

**Purpose**: Verify origin header matches allowed origins

**Steps**:
1. Configure `ALLOWED_ORIGINS=https://good.com`
2. Send POST request with:
   - `Origin: https://evil.com`
   - Valid CSRF token in header

**Expected Results**:
- ✅ HTTP 403 Forbidden
- ✅ Error: `CSRF_ORIGIN_MISMATCH`
- ✅ Message: "Origin validation failed"

---

### TC-015: CSRF Double-Submit Pattern

**Purpose**: Verify token in header matches cookie

**Steps**:
1. Get CSRF token from cookie: `token_abc123`
2. Send POST with header `x-csrf-token: token_xyz789` (different)

**Expected Results**:
- ✅ HTTP 403 Forbidden
- ✅ Error: `CSRF_INVALID`
- ✅ Message: "CSRF token mismatch"

---

## PHASE 5: Rate Limiting Tests

### TC-016: Lua Script Member Uniqueness

**Purpose**: Verify no collisions in rate limit sorted set members

**Steps**:
1. Send 100 rapid requests to same endpoint
2. Inspect Redis sorted set for rate limit key
3. Count unique members

**Expected Results**:
- ✅ Exactly 100 unique members in sorted set
- ✅ NO duplicate members
- ✅ All members have microsecond precision timestamps

**Failure Mode**: Collisions → rate limit bypass

---

### TC-017: Refresh Token Race Condition

**Purpose**: Verify only one concurrent refresh succeeds

**Steps**:
1. Create refresh token RT1
2. Send 10 concurrent POST `/auth/refresh` requests with RT1
3. Count successful responses

**Expected Results**:
- ✅ Exactly 1 request succeeds (HTTP 200)
- ✅ 9 requests fail (HTTP 401, "already used")
- ✅ New refresh token issued only once

**Failure Mode**: Race condition → token duplication

---

## TEST INFRASTRUCTURE FIXES REQUIRED

### TF-001: Revocation Store in Test Setup

**Problem**: All auth tests fail with missing `revocationStore` parameter

**Fix Required**:
```typescript
import { InMemoryRevocationStore } from '@talak-web3/auth';

const auth = new TalakWeb3Auth({
  nonceStore: new InMemoryNonceStore(),
  refreshStore: new InMemoryRefreshStore(),
  revocationStore: new InMemoryRevocationStore(), // ← ADD THIS
});
```

**Files to Update**:
- `packages/talak-web3-auth/src/__tests__/auth-core.test.ts`
- `packages/talak-web3-auth/src/__tests__/replay-attack-prevention.test.ts`
- All other auth test files

---

### TF-002: JWT Key Generation for Tests

**Problem**: Tests use invalid/missing JWT keys, causing import failures

**Fix Required**:
```typescript
import { generateKeyPair, exportSPKI, exportPKCS8 } from 'jose';

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const privateKeyPem = exportPKCS8(privateKey);
  const publicKeyPem = exportSPKI(publicKey);
  
  vi.stubEnv('JWT_PRIVATE_KEY', privateKeyPem);
  vi.stubEnv('JWT_PUBLIC_KEY', publicKeyPem);
});

afterAll(() => {
  vi.unstubAllEnvs();
});
```

---

### TF-003: Redis Mock for Distributed Tests

**Problem**: Tests requiring Redis skip because no Redis instance available

**Fix Required**: Use `redis-mock` or Testcontainers for Redis

```typescript
import { createClient } from 'redis';
import { RedisMemoryServer } from 'redis-memory-server';

let redisServer: RedisMemoryServer;
let redisClient: ReturnType<typeof createClient>;

beforeAll(async () => {
  redisServer = new RedisMemoryServer();
  const port = await redisServer.getPort();
  redisClient = createClient({ url: `redis://localhost:${port}` });
  await redisClient.connect();
});

afterAll(async () => {
  await redisClient.quit();
  await redisServer.stop();
});
```

---

## VERIFICATION CHECKLIST

Before marking any test as passing:

- [ ] Test runs without TypeScript errors
- [ ] Test passes 10/10 times (no flakiness)
- [ ] Test validates the specific invariant (not just "code runs")
- [ ] Test includes negative cases (failure modes)
- [ ] Test runs in CI environment (not just localhost)
- [ ] Test has clear pass/fail criteria documented

---

## PRIORITY ORDER

1. **P0 (Blockers)**: TC-001, TC-005, TC-008, TC-009, TC-011
2. **P1 (High)**: TC-002, TC-003, TC-006, TC-013, TC-017
3. **P2 (Medium)**: TC-004, TC-007, TC-010, TC-014, TC-015, TC-016
4. **P3 (Low)**: TC-012

**Deployment Rule**: ALL P0 tests MUST pass. P1 tests SHOULD pass. P2/P3 tests NICE TO HAVE.
