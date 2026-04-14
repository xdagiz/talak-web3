# <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> Storage S3 Adapter Plugin

This plugin demonstrates how to register an external service adapter (AWS S3) into the `talak-web3` context.

---

## 1. <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Key Features

- **Context Injection**: Makes `ctx.storage` available to any downstream handler or middleware.
- **Pre-signed URLs**: Safely generates temporary upload/download links for authenticated users.
- **Bucket Isolation**: Ensures per-user or per-org bucket partitioning logic.

## 2. <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Integration

1. Provide your AWS credentials via environment variables.
2. The adapter will automatically initialize and join the core context on startup.

---

[Back to Plugins](../../README.md)
