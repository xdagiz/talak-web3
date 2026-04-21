# Redis Deployment Runbook for Talak-Web3 Auth

## Critical Notice

**Redis is security-critical infrastructure for this system, NOT a cache.**

Misconfiguration voids all security guarantees in the threat model.

---

## Required Configuration

### Minimal Security Baseline

```redis
# /etc/redis/redis.conf

# DURABILITY (MANDATORY)
appendonly yes
appendfsync everysec

# REPLICATION (MANDATORY)
min-replicas-to-write 1
min-replicas-max-lag 1

# SECURITY (MANDATORY)
protected-mode yes
requirepass <STRONG_PASSWORD>
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG "CONFIG_<RANDOM>"

# NETWORKING
bind 127.0.0.1 ::1  # localhost only (if app on same host)
# OR
bind <PRIVATE_IP>   # private network only

# TLS (if crossing hosts)
tls-port 6379
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
tls-auth-clients yes

# MEMORY
maxmemory <LIMIT>
maxmemory-policy noeviction  # CRITICAL: never evict data

# LOGGING
loglevel notice
logfile /var/log/redis/redis-server.log
```

### Configuration Validation

```bash
# Verify critical settings
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync
redis-cli CONFIG GET min-replicas-to-write
redis-cli CONFIG GET maxmemory-policy
redis-cli CONFIG GET protected-mode

# All must match required values
```

---

## Topology Requirements

### Minimum: Single Primary + 1 Replica

```
┌──────────────┐         ┌──────────────┐
│   Primary    │────────►│   Replica    │
│  (read/write)│  async  │  (read-only) │
│              │ replic  │              │
└──────────────┘         └──────────────┘
       ▲
       │
┌──────────────┐
│  Application │
│  (primary    │
│   only)      │
└──────────────┘
```

### Recommended: Sentinel for Failover

```
┌─────────────────────────────────────┐
│         Sentinel Cluster            │
│  (3 or 5 nodes for quorum)          │
└─────────────────────────────────────┘
         │              │
    ┌────┴────┐    ┌────┴────┐
    │Primary 1│    │Primary 2│  (active-passive)
    │ + Rep   │    │ + Rep   │
    └─────────┘    └─────────┘
```

### Forbidden Topologies

❌ **Multi-primary** — creates ambiguity during partition
❌ **No replicas** — violates min-replicas-to-write
❌ **Public network exposure** — violates trust boundary
❌ **Shared Redis instance** — no isolation from other services

---

## Network Configuration

### VPC/Private Network (MANDATORY)

```yaml
# AWS Example
VPC: 10.0.0.0/16
Private Subnets:
  - 10.0.1.0/24 (app servers)
  - 10.0.2.0/24 (Redis primary)
  - 10.0.3.0/24 (Redis replica)

Security Groups:
  - Redis SG: Allow 6379 from App SG only
  - App SG: Allow all outbound to Redis SG
```

### TLS Configuration (Required for Cross-Host)

```bash
# Generate certificates
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 \
  -keyout redis.key -out redis.crt -subj "/CN=redis.internal"

# Configure Redis
tls-port 6379
tls-cert-file /etc/redis/ssl/redis.crt
tls-key-file /etc/redis/ssl/redis.key

# Application connection
const redis = new Redis({
  host: 'redis.internal',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  tls: {
    ca: fs.readFileSync('/path/to/ca.crt'),
    rejectUnauthorized: true
  }
});
```

---

## Deployment Procedures

### Initial Setup

```bash
# 1. Install Redis
sudo apt-get install redis-server

# 2. Configure (use template above)
sudo cp redis.conf /etc/redis/redis.conf

# 3. Set permissions
sudo chown redis:redis /etc/redis/redis.conf
sudo chmod 640 /etc/redis/redis.conf

# 4. Create data directory
sudo mkdir -p /var/lib/redis
sudo chown redis:redis /var/lib/redis

# 5. Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 6. Verify configuration
redis-cli -a <PASSWORD> PING
redis-cli -a <PASSWORD> CONFIG GET appendonly
```

### Replica Setup

```bash
# On replica server
redis.conf:
  replicaof <PRIMARY_IP> 6379
  masterauth <PRIMARY_PASSWORD>
  requirepass <REPLICA_PASSWORD>

# Start replica
sudo systemctl start redis-server

# Verify replication
redis-cli -a <PASSWORD> INFO replication
# Should show: role:slave, master_link_status:up
```

### Sentinel Setup

```bash
# sentinel.conf
sentinel monitor mymaster <PRIMARY_IP> 6379 2
sentinel auth-pass mymaster <PASSWORD>
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1

# Start sentinel
redis-sentinel /etc/redis/sentinel.conf

# Verify
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

---

## Operational Rules

### Rule 1: No Manual Failover Without Draining

```bash
# BEFORE failover:
# 1. Stop accepting new auth requests
kubectl scale deployment auth --replicas=0

# 2. Wait for in-flight requests to complete
sleep 30

# 3. Perform failover
redis-cli -p 26379 SENTINEL failover mymaster

# 4. Verify new primary
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# 5. Restart auth service
kubectl scale deployment auth --replicas=3
```

### Rule 2: Monitor Replication Lag Continuously

```bash
#!/bin/bash
# check_replication_lag.sh

while true; do
  lag=$(redis-cli -a $REDIS_PASSWORD INFO replication | grep master_repl_offset)
  echo "[$(date)] Replication lag: $lag"

  if [ $lag -gt 1000 ]; then
    echo "CRITICAL: Replication lag >1000 bytes"
    # Send alert
    curl -X POST $ALERT_WEBHOOK -d "Redis replication lag: $lag"
  fi

  sleep 5
done
```

### Rule 3: Treat Redis as Security-Critical

- **Backup**: Daily AOF/RDB backups to secure storage
- **Access**: Only auth service should connect
- **Audit**: Log all connections and commands
- **Patching**: Test in staging before production
- **Monitoring**: 24/7 alerting on all critical metrics

### Rule 4: Operator Invariants (NON-NEGOTIABLE)

**These rules are enforced by the application. Violation prevents startup.**

1. **NO manual writes to auth keys**
   ```bash
   # FORBIDDEN: Never manually modify these keys
   redis-cli DEL talak:nonce:consumed:*
   redis-cli DEL talak:jti:*
   redis-cli SET talak:time:monotonic_floor 0

   # Consequence: Invalidates all security guarantees
   ```

2. **NO replica promotion without draining auth traffic**
   ```bash
   # BEFORE promotion:
   # 1. Scale auth service to 0 replicas
   # 2. Wait for in-flight requests to complete
   # 3. THEN promote replica
   # 4. THEN restart auth service

   # Consequence: Violation allows nonce replay or revoked token acceptance
   ```

3. **NO config changes without restart + verification**
   ```bash
   # FORBIDDEN: Runtime config changes without verification
   redis-cli CONFIG SET appendonly no

   # REQUIRED: After ANY config change
   # 1. Update redis.conf
   # 2. Restart Redis
   # 3. Run verification: assertRedisInfrastructure()
   # 4. Monitor for 15 minutes

   # Consequence: Application will refuse to start if config invalid
   ```

4. **NO mixed-version clusters during deployment**
   ```bash
   # FORBIDDEN: Rolling upgrade without maintenance mode
   # 1. Stop all auth traffic
   # 2. Upgrade all Redis nodes to same version
   # 3. Verify cluster health
   # 4. Resume auth traffic

   # Consequence: Mixed versions may have different Lua script behavior
   ```

5. **NO disabling of security features**
   ```bash
   # FORBIDDEN: Never disable these features
   redis-cli CONFIG SET protected-mode no
   redis-cli CONFIG SET requirepass ""
   redis-cli CONFIG SET maxmemory-policy allkeys-lru

   # Consequence: Application startup assertions will fail
   ```

6. **ALL config changes must be audited**
   ```bash
   # REQUIRED: Log all config changes
   redis-cli CONFIG REWRITE

   # Monitor with:
   redis-cli MONITOR | grep -i "CONFIG SET"
   ```

**Operators are part of the trust boundary. Treat them as potential adversaries.**

---

## Health Checks

### Liveness Probe

```yaml
# Kubernetes
livenessProbe:
  exec:
    command:
    - redis-cli
    - -a
    - $(REDIS_PASSWORD)
    - PING
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```

### Readiness Probe

```yaml
readinessProbe:
  exec:
    command:
    - redis-cli
    - -a
    - $(REDIS_PASSWORD)
    - INFO
    - replication
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
```

### Custom Health Check

```typescript
// application health endpoint
async function redisHealthCheck(): Promise<boolean> {
  try {
    // Check connectivity
    await redis.ping();

    // Check replication
    const info = await redis.info('replication');
    const role = info.match(/role:(master|slave)/)?.[1];

    if (role === 'master') {
      const connectedReplicas = parseInt(info.match(/connected_slaves:(\d+)/)?.[1] || '0');
      if (connectedReplicas < 1) {
        return false; // No replicas connected
      }
    }

    // Check replication lag
    const lag = parseInt(info.match(/master_repl_offset:(\d+)/)?.[1] || '0');
    if (lag > 10000) {
      return false; // Replication lag too high
    }

    return true;
  } catch (err) {
    return false;
  }
}
```

---

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# backup_redis.sh

BACKUP_DIR="/backup/redis/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Trigger BGSAVE
redis-cli -a $REDIS_PASSWORD BGSAVE

# Wait for save to complete
while [ "$(redis-cli -a $REDIS_PASSWORD LASTSAVE)" == "$LAST_SAVE" ]; do
  sleep 1
done

# Copy RDB file
cp /var/lib/redis/dump.rdb $BACKUP_DIR/

# Compress and upload
tar -czf $BACKUP_DIR/redis.rdb.tar.gz $BACKUP_DIR/dump.rdb
aws s3 cp $BACKUP_DIR/redis.rdb.tar.gz s3://secure-backups/redis/

# Cleanup local
rm -rf $BACKUP_DIR
```

### Recovery Procedure

```bash
# 1. Stop Redis
sudo systemctl stop redis-server

# 2. Restore backup
aws s3 cp s3://secure-backups/redis/latest.rdb.tar.gz /tmp/
tar -xzf /tmp/latest.rdb.tar.gz -C /var/lib/redis/

# 3. Fix permissions
sudo chown redis:redis /var/lib/redis/dump.rdb

# 4. Start Redis
sudo systemctl start redis-server

# 5. Verify
redis-cli -a $REDIS_PASSWORD DBSIZE
redis-cli -a $REDIS_PASSWORD PING
```

---

## Performance Tuning

### Recommended Settings

```redis
# For auth workload (low latency, moderate throughput)
tcp-backlog 511
timeout 300
tcp-keepalive 60

# Slow log for debugging
slowlog-log-slower-than 10000  # 10ms
slowlog-max-len 128

# Latency monitoring
latency-monitor-threshold 100  # 100ms
```

### Monitoring Commands

```bash
# Check memory usage
redis-cli INFO memory

# Check latency
redis-cli --latency

# Monitor commands in real-time
redis-cli MONITOR

# Check slow log
redis-cli SLOWLOG GET 10

# Latency history
redis-cli LATENCY HISTORY
```

---

## Incident Response

### Scenario 1: Replication Broken

```bash
# Symptoms: connected_slaves:0

# 1. Check replica status
redis-cli -h <REPLICA_IP> INFO replication

# 2. Check network connectivity
ping <PRIMARY_IP>
nc -zv <PRIMARY_IP> 6379

# 3. Restart replica
sudo systemctl restart redis-server

# 4. Verify recovery
redis-cli -h <REPLICA_IP> INFO replication
# Should show: master_link_status:up
```

### Scenario 2: Primary Unreachable

```bash
# Symptoms: Sentinel failover not triggering

# 1. Check Sentinel status
redis-cli -p 26379 SENTINEL masters

# 2. Manual failover (if needed)
redis-cli -p 26379 SENTINEL failover mymaster

# 3. Verify new primary
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# 4. Update application config
kubectl set env deployment/auth REDIS_HOST=<NEW_PRIMARY_IP>

# 5. Restart application
kubectl rollout restart deployment/auth
```

### Scenario 3: Memory Full

```bash
# Symptoms: OOM command not allowed

# 1. Check memory
redis-cli INFO memory

# 2. Identify large keys
redis-cli --bigkeys

# 3. If consumed set too large (should not happen with TTL)
redis-cli DEBUG SLEEP 0  # Brief pause
redis-cli ACL DELUSER <TEMP_USER>  # Remove temp data

# 4. If still full, increase maxmemory
redis-cli CONFIG SET maxmemory <NEW_LIMIT>

# 5. Long-term: Add memory or reduce TTLs
```

---

## Configuration Checklist

Before going to production, verify:

- [ ] `appendonly yes` — durability enabled
- [ ] `appendfsync everysec` — acceptable performance/durability tradeoff
- [ ] `min-replicas-to-write 1` — at least 1 replica required
- [ ] `min-replicas-max-lag 1` — lag bound enforced
- [ ] `maxmemory-policy noeviction` — never evict security data
- [ ] `protected-mode yes` — no public access
- [ ] `requirepass <STRONG>` — authentication required
- [ ] TLS enabled (if cross-host)
- [ ] Private network only
- [ ] Sentinel or managed failover configured
- [ ] Backup automation in place
- [ ] Monitoring alerts configured
- [ ] Runbooks documented
- [ ] Quarterly failover testing scheduled

**Missing any item voids security guarantees.**
