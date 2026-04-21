# minimal-auth-app - Logic

> Status: stub
> Last verified: 2026-04-19

## Dependencies

- @talak-web3/client: workspace:*
- viem: ^2.22.4

## Source Code

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>talak-web3 | Minimal Auth</title>
    <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; background: #f9fafb; color: #111827; }
        .card { background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
        button { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-weight: 500; }
        button:disabled { background: #94a3b8; }
        pre { background: #1e293b; color: #f8fafc; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="card">
        <h1>talak-web3 Auth</h1>
        <p>Minimal SIWE flow demonstration.</p>

        <div id="auth-section">
            <button id="login-btn">Login with Wallet (Mock)</button>
        </div>

        <div id="status-section" style="display: none; margin-top: 1rem;">
            <p><strong>Status:</strong> Connected</p>
            <p><strong>Address:</strong> <span id="user-address"></span></p>
            <button id="logout-btn" style="background: #ef4444;">Logout</button>
            <h3>Session Payload</h3>
            <pre id="session-data"></pre>
        </div>
    </div>

    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### src/main.ts

```typescript
import { TalakWeb3Client } from '@talak-web3/client';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

const client = new TalakWeb3Client({
  baseUrl: 'http://localhost:8787',
});

const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const authSection = document.getElementById('auth-section')!;
const statusSection = document.getElementById('status-section')!;
const addressSpan = document.getElementById('user-address')!;
const sessionPre = document.getElementById('session-data')!;

async function updateUI() {
  try {
    const verifyResult = await client.verifySession();
    if (verifyResult.ok && verifyResult.payload) {
      addressSpan.innerText = verifyResult.payload.address || 'Unknown';
      sessionPre.innerText = JSON.stringify(verifyResult.payload, null, 2);
      authSection.style.display = 'none';
      statusSection.style.display = 'block';
    } else {
      authSection.style.display = 'block';
      statusSection.style.display = 'none';
    }
  } catch {
    authSection.style.display = 'block';
    statusSection.style.display = 'none';
  }
}

loginBtn.addEventListener('click', async () => {
  loginBtn.disabled = true;
  loginBtn.innerText = 'Connecting...';

  try {

    const address = '0x000000000000000000000000000000000000dEaD';

    const { nonce } = await client.getNonce(address);
    console.log('Nonce:', nonce);

    const message = `localhost:8787 wants you to sign in with your Ethereum account:\n${address}\n\nI accept the talak-web3 Terms of Service.\n\nURI: http://localhost:8787\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

    const signature = '0xdeadbeef';
    await client.login(message, signature);

    await updateUI();
  } catch (err) {
    alert('Login failed: ' + (err as Error).message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = 'Login with Wallet (Mock)';
  }
});

logoutBtn.addEventListener('click', async () => {
  await client.logout();
  await updateUI();
});

updateUI();
```

---

## How to Run

```bash
cd apps/minimal-auth-app
pnpm install
pnpm dev
```

## API References

The app uses these `TalakWeb3Client` methods:
- `client.getNonce(address)` - Fetch nonce for SIWE
- `client.login(message, signature)` - Login with signed SIWE message
- `client.verifySession()` - Verify active session
- `client.logout()` - Clear session

## Notes

- Points to hono-backend at `http://localhost:8787`
- Uses mock wallet address and signature for demo
- SIWE (Sign-In with Ethereum) flow implementation
- Session stored in httpOnly cookies (handled by backend)