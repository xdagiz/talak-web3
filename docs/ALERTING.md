# <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Alerting Strategy

This document defines the recommended alerting thresholds for a production `talak-web3` deployment. Monitoring these metrics ensures early detection of infrastructure degradation or security incidents.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Authentication Alerts

| Metric | Threshold | Severity | Action |
| --- | --- | --- | --- |
| `auth.login.failure` | > 5% total traffic | **CRITICAL** | Investigate for SIWE message malformation or credential stuffing. |
| `auth.nonce.replay` | > 10 / min | **HIGH** | Potential replay attack detected. Verify rate limiting effectiveness. |
| `auth.refresh.failure` | > 2% total traffic | **HIGH** | Investigate session hijacking attempts or token synchronization issues. |
| `session.hierarchy.revocation` | > 1 / hour | **CRITICAL** | A detected refresh token reuse has triggered a total session wipe. INVESTIGATE IMMEDIATELY. |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Infrastructure Alerts

| Metric | Threshold | Severity | Action |
| --- | --- | --- | --- |
| `redis.connection.error` | > 0 | **CRITICAL** | Redis is unreachable. System is in FAIL-CLOSED state. Restore Redis connectivity. |
| `redis.latency` | > 10ms (p99) | **HIGH** | Investigate Redis cluster health or network congestion between app and store. |
| `rpc.error` | > 10% total RPCs | **HIGH** | Check upstream provider health. Add more providers to the rotation if necessary. |
| `rpc.duration` | > 1s (p95) | **MEDIUM** | Investigate slow upstream providers. Adjust failover timeouts. |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Scaling Alerts

| Metric | Threshold | Severity | Action |
| --- | --- | --- | --- |
| `rate_limit.hit` | > 5% total requests | **MEDIUM** | Legitimate traffic might be hitting quotas. Consider scaling total capacity or tuning bucket sizes. |
| `http.5xx` | > 1% total traffic | **HIGH** | Investigate backend crashes or uncaught exceptions in plugins. |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Integration Instructions

1. **Prometheus / Grafana**: Use the `/metrics` endpoint to populate Grafana dashboards based on these thresholds.
2. **Alertmanager**: Configure Alertmanager to route **CRITICAL** and **HIGH** alerts to PagerDuty, Slack, or OpsGenie.
3. **Structured Logs**: Set up log-based alerts for `session.hierarchy.revocation` events to get immediate visibility into detected attacks.
