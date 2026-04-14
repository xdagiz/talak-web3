# Deployment Guide

This guide covers the necessary steps to deploy `talak-web3` in a production environment.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Production Requirements

For a secure, horizontally scalable deployment, the following are mandatory:
- **Redis Cluster**: Required for atomic nonce consumption and refresh token rotation.
- **HTTPS Enforcement**: All traffic must be encrypted to protect JWTs and CSRF cookies.
- **Dedicated Domain**: SIWE verification requires a consistent authoritative domain.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Setup Steps

### 1. Provision Infrastructure
Deploy a Node.js environment (v18+) and a Redis instance (v7+).

### 2. Configure Environment
Create a `.env` file based on [.env.example](../.env.example). Ensure all security-critical variables are set:
```env
REDIS_URL=redis://your-production-redis:6379
JWT_SECRET=a-very-long-and-random-secret
SIWE_DOMAIN=your-app-domain.com
ALLOWED_ORIGINS=https://your-app-domain.com
```

### 3. Build & Launch
```bash
pnpm install
pnpm build
pnpm --filter hono-backend start
```

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Horizontal Scaling

`talak-web3` is designed to be **stateless at the application layer**. You can scale the `hono-backend` horizontally behind a load balancer without issue, provided:
- All instances connect to the same **Redis** cluster.
- The `ALLOWED_ORIGINS` and `SIWE_DOMAIN` are consistent across all instances.
- Sticky sessions are NOT required, as all session state is externalized in Redis.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Infrastructure Hardening

- **Redis ACLs**: Restrict access to the Redis instance to only the backend application IPs.
- **Resource Limits**: Set memory and CPU limits in your container orchestration (e.g., Kubernetes) to prevent OOM kills during high RPC volume.
- **Rate Limiting Tuning**: Adjust the default token bucket parameters in `rateLimit.ts` to match your expected traffic patterns.

---

Next: [Security Model](./SECURITY.md)
