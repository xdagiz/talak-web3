# <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Incident Response Playbooks

This document provides executable procedures for responding to common failure modes and security events in `talak-web3`.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Playbook: Redis Cluster Down

**Context**: Monitoring alerts for `redis.connection.error` are firing. Dashboard shows `AUTH_SERVICE_UNAVAILABLE`.

1. **Verify Connectivity**: Attempt to manualy ping the Redis instance from the backend network.
2. **Check Redis Resource Limits**: Ensure the Redis instance hasn't hit memory limits (OOM).
3. **Check Network Security Groups**: Verify no firewall changes have blocked port 6379.
4. **Emergency Fallback**: If using a managed service (e.g., ElastiCache, Upstash), check their status page.
5. **Resolution**: Once connectivity is restored, the `hono-backend` will automatically resume operations without a restart.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Playbook: Detected SIWE Replay Attack

**Context**: Alert `auth.nonce.replay` > 10/min.

1. **Identify Source**: Search logs for IP addresses associated with `AUTH_SIWE_NONCE_REPLAY` events.
2. **Verify Rate Limiting**: Ensure `IP_BASED_LIMITS` are active and preventing automated flood.
3. **Analyze Payload**: Inspect the SIWE messages in logs. If multiple requests use the same signature but different nonces, a replay is being attempted.
4. **Mitigation**: Temporarily tighten rate limits for the `/auth/login` endpoint if necessary.
5. **Post-Mortem**: Document the attacker IP and consider blocklisting at the Nginx/Edge level.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Playbook: Upstream RPC Provider Outage

**Context**: Alert `rpc.error` > 10%. Latency dashboard shows high spikes.

1. **Identify Failing Provider**: Check `hono-backend` logs for `RPC_PROVIDER_FAILURE` tags to see which URL is failing.
2. **Verify Failover**: Ensure the `UnifiedRpc` manager is successfully routing requests to alternative providers.
3. **Update Configuration**: If a provider is permanently down, remove it from the environment variable configuration.
4. **Expansion**: Add a fresh provider URL (e.g., Alchemy, Infura, QuickNode) to restore redundancy.
5. **Validation**: Test the specific chain/method combination using the CLI to ensure healthy responses.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Playbook: Token Compromise / Revocation

**Context**: An `auth.refresh.reuse` event is logged, or a user reports a compromised wallet.

1. **Identify Account**: Filter logs for the specific wallet address or session ID.
2. **Trigger Revocation**: Use the administrative interface (or direct Redis `DEL`) to wipe all keys matching `auth:refresh:${address}:*` and `auth:session:${address}:*`.
3. **Notify User**: Advise the user to rotate their wallet keys if the private key itself was disclosed.
