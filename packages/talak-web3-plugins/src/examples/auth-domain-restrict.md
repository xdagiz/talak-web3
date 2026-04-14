# <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Auth Domain Restrict Plugin

This plugin provides an additional security layer by restricting authenticated requests to a specific sub-domain or origin pool.

---

## 1. <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Key Features

- **Origin Verification**: Strictly matches the `Origin` header against a whitelist.
- **Fail-Closed**: If the origin is missing or mismatched, the request is rejected with `403 Forbidden` before it reaches the handlers.
- **Zod-Powered**: Uses Zod for strict configuration validation.

## 2. <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Integration

1. Define your `ALLOWED_DOMAINS` in configuration.
2. Register the plugin middleware in the `Auth` stack.

---

[Back to Plugins](../../README.md)
