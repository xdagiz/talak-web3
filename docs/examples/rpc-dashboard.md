# rpc-dashboard-app - Logic

> Status: stub
> Last verified: 2026-04-19

## Dependencies

- @talak-web3/client: workspace:*

## Source Code

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>talak-web3 | RPC Dashboard</title>
    <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #0f172a; }
        .container { max-width: 800px; margin: auto; display: grid; gap: 1.5rem; }
        .card { background: white; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; }
        .input-group { display: grid; gap: 0.5rem; margin-bottom: 1rem; }
        input { padding: 0.625rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; width: 100%; box-sizing: border-box; }
        button { background: #0f172a; color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 0.375rem; cursor: pointer; }
        button:disabled { opacity: 0.5; }
        pre { background: #0b1220; color: #38bdf8; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; min-height: 100px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RPC Dashboard</h1>

        <div class="card">
            <h3>Execute RPC</h3>
            <div class="input-group">
                <label>Method</label>
                <input id="rpc-method" value="eth_blockNumber" />
            </div>
            <div class="input-group">
                <label>Params (JSON)</label>
                <input id="rpc-params" value="[]" />
            </div>
            <button id="run-btn">Execute Call</button>
            <p style="font-size: 0.8rem; color: #64748b;">Authenticated via session token (if logged in)</p>
        </div>

        <div class="card">
            <h3>Response</h3>
            <pre id="rpc-output">// Results will appear here</pre>
        </div>
    </div>

    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### src/main.ts

```typescript
import { TalakWeb3Client } from '@talak-web3/client';

const client = new TalakWeb3Client({
  baseUrl: 'http://localhost:8787',
});

const methodInput = document.getElementById('rpc-method') as HTMLInputElement;
const paramsInput = document.getElementById('rpc-params') as HTMLInputElement;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
const outputPre = document.getElementById('rpc-output') as HTMLPreElement;

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  outputPre.innerText = '// Executing...';

  const method = methodInput.value;
  let params = [];
  try {
     params = JSON.parse(paramsInput.value);
  } catch {
     outputPre.innerText = 'Error: Invalid JSON params';
     runBtn.disabled = false;
     return;
  }

  try {
    // This call is automatically proxied through the backend
    // If a session exists, the client adds the Bearer token and CSRF header
    const result = await client.request(method, params);
    outputPre.innerText = JSON.stringify(result, null, 2);
  } catch (err) {
    outputPre.innerText = 'Error: ' + (err as Error).message;
  } finally {
    runBtn.disabled = false;
  }
});
```

---

## How to Run

```bash
cd apps/rpc-dashboard-app
pnpm install
pnpm dev
```

## Notes

- Dashboard for testing RPC calls
- Automatically handles authentication (adds session token if logged in)
- Proxies requests through hono-backend
- Accepts any RPC method and JSON params
- Useful for debugging RPC calls