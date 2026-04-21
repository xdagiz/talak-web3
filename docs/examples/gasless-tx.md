# gasless-tx-app - Logic

> Status: stub
> Last verified: 2026-04-19

## Dependencies

- @talak-web3/client: workspace:*
- @talak-web3/tx: workspace:*
- viem: ^2.22.4

## Source Code

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>talak-web3 | Gasless Tx</title>
    <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; background: #fffcf0; color: #1c1917; }
        .container { max-width: 600px; margin: auto; }
        .card { background: white; padding: 2rem; border-radius: 1rem; border: 2px solid #e7e5e4; }
        button { width: 100%; background: #0c0a09; color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: 600; }
        button:disabled { opacity: 0.4; pointer-events: none; }
        .status-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-top: 1rem; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-success { background: #dcfce7; color: #166534; }
    </style>
</head>
<body>
    <div class="container">
        <h1>ERC-4337 Gasless</h1>
        <div class="card">
            <p>Trigger a transaction sponsored by a paymaster.</p>
            <button id="send-btn">Send Sponsored Transaction</button>
            <div id="tx-status" style="display: none;">
                <span class="status-badge status-pending" id="badge">Pending...</span>
                <p>Transaction Hash: <small id="tx-hash">0x1111111111111111111111111111111111111111</small></p>
            </div>
        </div>
    </div>

    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### src/main.ts

```typescript
import { TalakWeb3Client } from '@talak-web3/client';
import { createTransactionBuilder } from '@talak-web3/tx';

const client = new TalakWeb3Client({
  baseUrl: 'http://localhost:8787',
});

const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const txStatus = document.getElementById('tx-status') as HTMLDivElement;
const badge = document.getElementById('badge') as HTMLSpanElement;
const hashSmall = document.getElementById('tx-hash') as HTMLElement;

sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  txStyle.display = 'block';
  badge.className = 'status-badge status-pending';
  badge.innerText = 'Initializing UserOp...';

  try {

    badge.innerText = 'Awaiting Signature...';

    const result = await client.request('eth_sendUserOperation', [{
        to: '0x000000000000000000000000000000000000dEaD',
        data: '0x',
        value: '0'
    }]);

    badge.className = 'status-badge status-success';
    badge.innerText = 'Transaction Sent!';
    hashSmall.innerText = result as string;
  } catch (err) {
    alert('Transaction failed: ' + (err as Error).message);
    txStatus.style.display = 'none';
  } finally {
    sendBtn.disabled = false;
  }
});
```

---

## How to Run

```bash
cd apps/gasless-tx-app
pnpm install
pnpm dev
```

## API References

This app demonstrates ERC-4337 Account Abstraction:
- `eth_sendUserOperation` - Send a UserOperation via EntryPoint
- Uses paymaster sponsorship for gasless transactions

## Notes

- Implements ERC-4337 gasless transactions
- UserOperation is sent to EntryPoint contract
- Paymaster sponsors the gas fees
- In a real implementation, would need:
  - Valid UserOp struct with callData
  - Signature from wallet
  - Paymaster signature proving sponsorship