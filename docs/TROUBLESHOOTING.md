# Troubleshooting Guide

This guide provides solutions to common operational issues encountered when deploying or developing with `talak-web3`.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Redis Connection Errors

**Issue**: Backend logs show `redis error` or returns `503 Service Unavailable`.
- **Cause**: The application cannot reach the configured Redis instance.
- **Solution**:
    - Verify `REDIS_URL` format: `redis://[user]:[password]@[host]:[port]`.
    - Check if Redis is running and reachable from your backend environment.
    - Ensure your firewall/security groups allow traffic on port 6379 (or your custom port).

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Invalid SIWE Signatures

**Issue**: `/auth/login` returns `401 Unauthorized` with `AUTH_SIWE_INVALID_SIG`.
- **Cause**: The signature submitted does not match the derived address from the SIWE message.
- **Solution**:
    - Ensure the message follows EIP-4361 exactly.
    - Verify that the wallet address in the message matches the signing wallet.
    - Check for invisible characters or extra whitespace in the message submission.

**Issue**: `/auth/login` returns `401 Unauthorized` with `AUTH_SIWE_NONCE_REPLAY`.
- **Cause**: The nonce has already been consumed or has expired.
- **Solution**:
    - Refresh the nonce via `/auth/nonce` before attempting a new login.
    - Ensure your client is not sending duplicate login requests for a single signing event.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> CORS Failures

**Issue**: Browser console shows `CORS header 'Access-Control-Allow-Origin' missing` or `mismatch`.
- **Cause**: The `Origin` header from the client does not match any entry in `ALLOWED_ORIGINS`.
- **Solution**:
    - Check your `ALLOWED_ORIGINS` environment variable in the backend. It must be a comma-separated list of exact origin strings (e.g., `https://app.example.com`).
    - Note: `talak-web3` does not support wildcard (`*`) origins in production for security reasons.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Rate Limit Blocks

**Issue**: Endpoint returns `429 Too Many Requests`.
- **Cause**: You have exceeded the IP or wallet-specific request threshold.
- **Solution**:
    - In development, you can increase limits in `apps/hono-backend/src/server.ts`.
    - In production, wait for the window to reset (default: 1-2 minutes).

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> CSRF Mismatch

**Issue**: POST requests return `403 Forbidden` with `CSRF_INVALID`.
- **Cause**: The `x-csrf-token` header is missing or does not match the `csrf_token` cookie.
- **Solution**:
    - Ensure your client first calls a non-mutating endpoint (like `/auth/nonce`) to receive the initial cookie.
    - Verify your client is correctly extracting the cookie value and adding it to the `x-csrf-token` header.

---

[Back to Root README](../README.md)
