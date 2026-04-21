# Security Deployment Guide

This guide provides comprehensive instructions for deploying Talak Web3 with 10/10 operational maturity and security resilience.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Key Management Configuration](#key-management-configuration)
3. [Redis Hardening](#redis-hardening)
4. [Security Event Pipeline](#security-event-pipeline)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Load Testing](#load-testing)
7. [Incident Response](#incident-response)
8. [Production Checklist](#production-checklist)

## Environment Setup

### Environment Variables

Configure the following environment variables based on your deployment environment:

#### Core Configuration
```bash
NODE_ENV=production
ENVIRONMENT=production

SIWE_DOMAIN=your-domain.com
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
JWT_PRIMARY_KID=v1

REDIS_URL=rediss://redis.example.com:6379
REDIS_PASSWORD=your-redis-password
REDIS_AUTH_ENABLED=true
REDIS_TLS_ENABLED=true
REDIS_MAX_CONNECTIONS=100
REDIS_MAX_RETRIES=3

REDIS_DB_NONCE=0
REDIS_DB_SESSION=1
REDIS_DB_RATELIMIT=2
REDIS_DB_AUDIT=3
```

#### Security Configuration
```bash
REDIS_TLS_CERT_PATH=/path/to/redis.crt
REDIS_TLS_KEY_PATH=/path/to/redis.key
REDIS_TLS_CA_PATH=/path/to/ca.crt

RATE_LIMIT_GLOBAL_MULTIPLIER=1
RATE_LIMIT_AUTH_MULTIPLIER=1
RATE_LIMIT_RPC_MULTIPLIER=1

SECURITY_REQUIRE_CLIENT_CERTS=true
SECURITY_ENABLE_ZERO_TRUST=true
```

#### Monitoring Configuration
```bash
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

SECURITY_EVENTS_ENABLED=true
SECURITY_EVENTS_TYPE=elasticsearch
ELASTICSEARCH_URL=https://elasticsearch.example.com:9200
ELASTICSEARCH_INDEX=security_events
ELASTICSEARCH_USERNAME=security_user
ELASTICSEARCH_PASSWORD=security_password
```

#### Alert Configuration
```bash
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_SMTP_HOST=smtp.example.com
ALERT_EMAIL_USERNAME=alerts@example.com
ALERT_EMAIL_PASSWORD=smtp_password

ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

ALERT_PAGERDUTY_ENABLED=true
ALERT_PAGERDUTY_API_KEY=your-pagerduty-api-key
```

## Key Management Configuration

### Environment-Based Key Provider (Development/Staging)

For development and staging environments, use environment-based key management:

```typescript
import { TalakWeb3Auth } from '@talak-web3/auth';

const auth = new TalakWeb3Auth({
  nonceStore,
  refreshStore,
  revocationStore,
  keyProviderType: 'environment',
  keyRotationConfig: {
    maxKeys: 5,
    gracePeriodMs: 7 * 24 * 60 * 60 * 1000,
    rotationIntervalMs: 30 * 24 * 60 * 60 * 1000,
  },
});
```

### AWS KMS Key Provider (Production)

For production, use AWS KMS for enhanced security:

```typescript
import { TalakWeb3Auth } from '@talak-web3/auth';

const auth = new TalakWeb3Auth({
  nonceStore,
  refreshStore,
  revocationStore,
  keyProviderType: 'aws-kms',
  keyProviderOptions: {
    keyId: 'arn:aws:kms:us-east-1:123456789012:key/your-key-id',
    region: 'us-east-1',
  },
  keyRotationConfig: {
    maxKeys: 10,
    gracePeriodMs: 14 * 24 * 60 * 60 * 1000,
    rotationIntervalMs: 90 * 24 * 60 * 60 * 1000,
  },
});
```

### Key Rotation Setup

1. **Create Initial Keys**
```bash
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem

export JWT_PRIVATE_KEY="$(cat private.pem)"
export JWT_PUBLIC_KEY="$(cat public.pem)"
```

2. **Configure Rotation**
```typescript

```

3. **JWKS Endpoint**
```typescript
import { createJwksEndpoint } from './security/jwks-endpoint.js';

app.get('/.well-known/jwks.json', createJwksEndpoint(auth));
```

## Redis Hardening

### Redis Configuration

Create a hardened Redis configuration (`redis.conf`):

```conf
# Security
requirepass your-redis-password
protected-mode yes
port 6379
bind 127.0.0.1 10.0.0.1

# TLS
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
tls-port 6380

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Disable Dangerous Commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command EVAL ""
rename-command SCRIPT ""
```

### Redis Security Audit

The system automatically performs security audits on startup:

```typescript
import { RedisSecurityAuditor } from './security/redis-hardening.js';

const auditor = new RedisSecurityAuditor(redis);
const audit = await auditor.auditSecurity();

if (audit.status === 'critical') {
  console.error('Redis security issues detected:', audit.issues);
  process.exit(1);
}
```

### Database Separation

Configure separate Redis databases for different data types:

```typescript
import { RedisDatabaseSelector } from './security/redis-hardening.js';

const dbSelector = new RedisDatabaseSelector(redis, {
  nonceDb: 0,
  sessionDb: 1,
  rateLimitDb: 2,
  auditDb: 3,
});
```

## Security Event Pipeline

### Elasticsearch Configuration

1. **Setup Elasticsearch Index Template**
```json
{
  "index_patterns": ["security-events-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "security-events-policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "type": { "type": "keyword" },
        "severity": { "type": "keyword" },
        "source": { "type": "keyword" },
        "details": { "type": "object" },
        "metadata": {
          "properties": {
            "ip": { "type": "ip" },
            "wallet": { "type": "keyword" },
            "userAgent": { "type": "text" }
          }
        }
      }
    }
  }
}
```

2. **Configure Security Events**
```typescript
import { createSecurityEventManager, createElasticsearchSink } from './security/security-events.js';

const eventManager = createSecurityEventManager([
  createElasticsearchSink({
    type: 'elasticsearch',
    url: process.env['ELASTICSEARCH_URL'],
    index: 'security-events',
    username: process.env['ELASTICSEARCH_USERNAME'],
    password: process.env['ELASTICSEARCH_PASSWORD'],
  }),
]);
```

### Event Types and Monitoring

The system automatically tracks these security events:

- **Authentication Events**: Successes, failures, lockouts
- **Rate Limiting**: Violations, penalties, abuse patterns
- **Suspicious Activity**: Unusual patterns, correlation anomalies
- **System Events**: Key rotations, configuration changes
- **Security Incidents**: Breaches, compromises, attacks

## Monitoring and Alerting

### Prometheus Metrics

1. **Install Prometheus**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'talak-web3'
    static_configs:
      - targets: ['localhost:8787']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

2. **Key Metrics to Monitor**
```typescript
talak_auth_success_total{environment="production"}
talak_auth_failure_total{environment="production",reason="invalid_signature"}

talak_rate_limit_hit_total{environment="production",type="auth"}
talak_security_risk_score{environment="production",source="adaptive"}

talak_redis_connection_status{environment="production"}
talak_jwt_signing_duration_seconds{environment="production"}
```

### Grafana Dashboards

Create dashboards for:

1. **Security Overview**
   - Authentication success/failure rates
   - Rate limit violations
   - Security event counts by severity

2. **System Health**
   - Redis connection status
   - JWT signing/verification latency
   - Error rates and response times

3. **Threat Detection**
   - Suspicious activity patterns
   - IP-wallet correlation anomalies
   - Attack detection metrics

### Alert Rules

Configure Prometheus alert rules:

```yaml
groups:
  - name: talak-security
    rules:
      - alert: HighAuthFailureRate
        expr: rate(talak_auth_failure_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High authentication failure rate"
          description: "Authentication failure rate is {{ $value }} failures/sec"

      - alert: RedisConnectionDown
        expr: talak_redis_connection_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis connection is down"
          description: "Redis connection status is 0"

      - alert: HighSecurityRiskScore
        expr: talak_security_risk_score > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High security risk score detected"
          description: "Security risk score is {{ $value }}"
```

## Load Testing

### Running Load Tests

1. **Setup Test Environment**
```typescript
import { loadTestEngine } from './security/load-testing.js';

const target = {
  baseUrl: 'https://staging.talak-web3.com',
  endpoints: {
    nonce: '/auth/nonce',
    login: '/auth/login',
    rpc: '/rpc',
    refresh: '/auth/refresh',
  },
};
```

2. **Execute Test Scenarios**
```typescript
const results = await loadTestEngine.runAllScenarios(target, {
  verbose: true,
  onProgress: (scenario, result) => {
    console.log(`Completed ${scenario}: ${result.successfulRequests}/${result.totalRequests} successful`);
  },
});

const report = loadTestEngine.generateReport(results);
console.log(report);
```

3. **Test Scenarios**
- **High Concurrency Login**: 100 concurrent login attempts
- **Replay Attack Flood**: 200 replay attacks with same nonce
- **Malformed RPC Storm**: 500 malformed RPC requests
- **Redis Failure Test**: System behavior under Redis failure

### Performance Benchmarks

Target performance characteristics:
- **Authentication**: < 200ms P95, > 1000 RPS
- **RPC Requests**: < 500ms P95, > 500 RPS
- **Rate Limiting**: < 10ms P95, > 10000 RPS
- **Security Events**: < 50ms P95, > 5000 EPS

## Incident Response

### Incident Response Workflow

1. **Detection**
   - Automated monitoring alerts
   - Security event correlation
   - Manual reporting

2. **Assessment**
   - Incident classification
   - Impact analysis
   - Severity determination

3. **Response**
   - Containment actions
   - Revocation procedures
   - Communication protocols

4. **Recovery**
   - System restoration
   - Security improvements
   - Post-mortem analysis

### Emergency Procedures

1. **Key Compromise**
```typescript
import { incidentResponseManager } from './security/incident-response.js';

const incident = await incidentResponseManager.createIncident({
  type: 'key_compromise',
  severity: 'critical',
  description: 'Private key exposure detected',
  affectedSystems: ['authentication', 'jwt-signing'],
  containmentActions: ['immediate_key_rotation', 'revoke_active_tokens'],
  recoveryActions: ['generate_new_keys', 'update_systems'],
  postMortemRequired: true,
});

await incidentResponseManager.executeRevocation('global_jwt_revocation', {
  incidentId: incident.id,
  reason: 'Key compromise emergency revocation',
  scope: 'global',
  targets: [],
  immediate: true,
  notifyUsers: true,
});
```

2. **System Breach**
```typescript
const incident = await incidentResponseManager.createIncident({
  type: 'data_breach',
  severity: 'critical',
  description: 'Unauthorized access detected',
  affectedSystems: ['user-data', 'authentication'],
  containmentActions: ['immediate_system_lockdown', 'revoke_all_sessions'],
  recoveryActions: ['force_password_reset', 'security_audit'],
  postMortemRequired: true,
});
```

### Revocation Strategies

1. **Global JWT Revocation**: Revoke all active tokens
2. **Selective Wallet Revocation**: Revoke tokens for specific addresses
3. **IP-Based Revocation**: Revoke tokens from specific IP ranges
4. **Time-Based Revocation**: Revoke tokens issued within time window

## Production Checklist

### Pre-Deployment Checklist

- [ ] Environment variables configured and validated
- [ ] Redis security hardening applied
- [ ] Key management system configured
- [ ] Security event pipeline connected
- [ ] Monitoring and alerting configured
- [ ] Load testing completed and passing
- [ ] Incident response procedures tested
- [ ] Backup and recovery procedures verified
- [ ] Security audit completed
- [ ] Documentation updated

### Post-Deployment Verification

- [ ] All services responding correctly
- [ ] Authentication flow working
- [ ] Rate limiting functioning
- [ ] Security events being captured
- [ ] Metrics being collected
- [ ] Alerts configured and tested
- [ ] JWKS endpoint accessible
- [ ] Redis connection stable
- [ ] Key rotation scheduled
- [ ] Incident response team notified

### Ongoing Maintenance

- [ ] Daily security metrics review
- [ ] Weekly incident response drills
- [ ] Monthly security audits
- [ ] Quarterly key rotation
- [ ] Annual penetration testing
- [ ] Continuous monitoring tuning
- [ ] Regular backup verification
- [ ] Documentation updates

## Security Best Practices

### Key Management
- Use hardware security modules (HSM) or KMS in production
- Implement automatic key rotation
- Maintain key usage logs
- Separate signing and verification keys

### Network Security
- Enable TLS for all communications
- Implement network segmentation
- Use VPN or private networks for internal services
- Configure firewalls and security groups

### Application Security
- Validate all inputs
- Implement rate limiting
- Use secure headers
- Log security events
- Monitor for anomalies

### Operational Security
- Principle of least privilege
- Regular security training
- Incident response preparedness
- Backup and disaster recovery
- Compliance and auditing

## Troubleshooting

### Common Issues

1. **Redis Connection Issues**
   - Check TLS configuration
   - Verify authentication credentials
   - Validate network connectivity
   - Review Redis logs

2. **Authentication Failures**
   - Verify key configuration
   - Check nonce synchronization
   - Review SIWE message format
   - Validate signature verification

3. **Rate Limiting Issues**
   - Check Redis connectivity
   - Verify bucket configuration
   - Review penalty application
   - Monitor correlation data

4. **Security Event Pipeline**
   - Verify sink configuration
   - Check network connectivity
   - Review event formatting
   - Monitor queue health

### Debug Commands

```bash
redis-cli -h redis.example.com -p 6380 --tls ping

openssl rsa -in private.pem -check
openssl rsa -pubin -in public.pem -check

curl -X POST https://api.example.com/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"0x742d35Cc6634C0532925a3b8D4C9db96C4b4b8b8"}'

curl https://api.example.com/metrics

curl https://api.example.com/.well-known/jwks.json
```

This comprehensive security deployment guide ensures that Talak Web3 achieves 10/10 operational maturity with enterprise-grade security resilience.
