# example-next-dapp - Logic

> Status: broken (React 19 TS error)
> Last verified: 2026-04-19

## Dependencies

- next: 16.2.0
- react: 19.2.4
- react-dom: 19.2.4
- @talak-web3/core: workspace:*
- @talak-web3/hooks: workspace:*
- @talak-web3/tx: workspace:*

## Source Code

### src/app/layout.tsx

```tsx
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'TalakWeb3 Example Dapp',
  description: 'Example Next.js dapp using talak-web3',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui' }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### src/app/providers.tsx

```tsx
'use client';

import type { ReactNode } from 'react';
import { TalakWeb3Provider } from '@talak-web3/hooks';
import { talakWeb3 } from '@talak-web3/core';

const instance = talakWeb3({
  debug: true,
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      rpcUrls: ['https://cloudflare-eth.com'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      testnet: false,
    },
  ] as const,
  rpc: { retries: 2, timeout: 10_000 },
});

void instance.init();

export function Providers({ children }: { children: ReactNode }) {
  return <TalakWeb3Provider instance={instance}>{children}</TalakWeb3Provider>;
}
```

### src/app/page.tsx

```tsx
'use client';

import { useMemo, useState, useCallback } from 'react';
import { useAccount, useChain, useGasless, useRpc } from '@talak-web3/hooks';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff' }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function Page() {
  const account = useAccount();
  const chain = useChain();
  const rpc = useRpc();
  const gasless = useGasless();

  const [rpcMethod, setRpcMethod] = useState('eth_blockNumber');
  const [rpcParams, setRpcParams] = useState('[]');
  const [rpcResult, setRpcResult] = useState<string>('');

  const parsedParams = useMemo(() => {
    try { return JSON.parse(rpcParams) as unknown[]; } catch { return []; }
  }, [rpcParams]);

  const runRpc = useCallback(async () => {
    const res = await rpc.request(rpcMethod, parsedParams);
    setRpcResult(JSON.stringify(res, null, 2));
  }, [rpc, rpcMethod, parsedParams]);

  return (
    <main style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>TalakWeb3 Example Dapp</div>
          <div style={{ color: '#475569' }}>Wallet + chain + RPC + gasless demo</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card title="Wallet connection">
            <div style={{ display: 'grid', gap: 10 }}>
              <div><b>Status</b>: {account.isConnected ? 'connected' : 'disconnected'}</div>
              <div><b>Address</b>: {account.address ?? '—'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => account.connect('0x000000000000000000000000000000000000dEaD')}
                  style={{ padding: '8px 10px' }}
                >
                  Connect (mock)
                </button>
                <button onClick={account.disconnect} style={{ padding: '8px 10px' }}>Disconnect</button>
              </div>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                This example uses a mock connect button; wire to a real wallet connector in your app.
              </div>
            </div>
          </Card>

          <Card title="Chain switcher">
            <div style={{ display: 'grid', gap: 10 }}>
              <div><b>Current chainId</b>: {chain.chainId}</div>
              <select
                value={chain.chainId}
                onChange={(e) => chain.switchChain(Number(e.target.value))}
                style={{ padding: 8 }}
              >
                {chain.chains.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
            </div>
          </Card>

          <Card title="RPC tester">
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Method</span>
                <input value={rpcMethod} onChange={e => setRpcMethod(e.target.value)} style={{ padding: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Params (JSON array)</span>
                <input value={rpcParams} onChange={e => setRpcParams(e.target.value)} style={{ padding: 8 }} />
              </label>
              <button onClick={runRpc} style={{ padding: '8px 10px' }}>Run</button>
              <pre style={{ background: '#0b1220', color: '#e2e8f0', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
                {rpcResult || '—'}
              </pre>
            </div>
          </Card>

          <Card title="Gasless transaction">
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                onClick={() => gasless.sendGasless('0x000000000000000000000000000000000000dEaD', '0x')}
                disabled={gasless.loading}
                style={{ padding: '8px 10px' }}
              >
                Trigger gasless (requires AA adapter loaded)
              </button>
              <div><b>Last hash</b>: {gasless.lastHash ?? '—'}</div>
              {gasless.error ? <div style={{ color: '#b91c1c' }}><b>Error</b>: {gasless.error}</div> : null}
              <div style={{ color: '#64748b', fontSize: 12 }}>
                To enable this, attach `AccountAbstractionPlugin` to `instance.context.adapters.aa`.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
```

---

## How to Run

```bash
cd apps/example-next-dapp
pnpm install
pnpm dev
```

## Notes

- Uses Next.js 16 with App Router
- Uses @talak-web3/hooks for React context provider
- Demonstrates: wallet connect, chain switcher, RPC tester, gasless txs
- Mock connect button uses hardcoded address `0x000000000000000000000000000000000000dEaD`
- For gasless txs, need to attach AccountAbstractionPlugin
