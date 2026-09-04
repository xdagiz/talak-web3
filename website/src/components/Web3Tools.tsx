import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Coins,
  Copy,
  Fuel,
  Loader2,
  PenLine,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAINS, getChainById, type Chain } from "@/data/chains";
import { toast } from "@/hooks/use-toast";
import { detectWalletName, isWalletAvailable, requestAccounts } from "@/lib/siwe";
import { cn } from "@/lib/utils";
import { useTalakWeb3 } from "@/hooks/useTalakWeb3";

/**
 * talak-web3 Web3Tools Component
 * 
 * Provides Web3 tools and utilities aligned with talak-web3 architecture.
 * Includes network status, wallet balances, and message signing functionality.
 */

type LinkedWallet = { id: string; address: string; chain_id: number };

const FEATURED_CHAINS: Chain[] = CHAINS.filter(c => !c.testnet).slice(0, 5);
const POLL_MS = 12_000;

async function jsonRpc<T = unknown>(
  url: string,
  method: string,
  params: unknown[] = [],
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { result?: T; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result as T;
}

function fromHex(hex: string | undefined): bigint {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

function formatNative(wei: bigint, dp = 4): string {
  // BigInt-safe wei → decimal string (avoids precision loss)
  const neg = wei < 0n;
  const v = neg ? -wei : wei;
  const ten18 = 10n ** 18n;
  const whole = v / ten18;
  const frac = v % ten18;
  if (dp <= 0) return `${neg ? "-" : ""}${whole.toString()}`;
  const fracStr = frac.toString().padStart(18, "0").slice(0, dp).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toString()}${fracStr ? "." + fracStr : ""}`;
}

function formatGwei(wei: bigint): string {
  const ten9 = 10n ** 9n;
  const whole = wei / ten9;
  const frac = wei % ten9;
  const fracStr = frac.toString().padStart(9, "0").slice(0, 2).replace(/0+$/, "");
  return `${whole.toString()}${fracStr ? "." + fracStr : ""}`;
}

type NetCell = {
  block: bigint | null;
  gasGwei: bigint | null;
  latencyMs: number | null;
  error?: string;
  loading: boolean;
};

function emptyNet(): NetCell {
  return { block: null, gasGwei: null, latencyMs: null, loading: true };
}

/** ------------------------------------------------------------------ */
/** Live network status: block height + gas across major chains.        */
/** ------------------------------------------------------------------ */
function LiveNetworks() {
  const [cells, setCells] = useState<Record<number, NetCell>>(() =>
    Object.fromEntries(FEATURED_CHAINS.map(c => [c.id, emptyNet()]))
  );
  const [refreshTick, setRefreshTick] = useState(0);
  const { makeRpcCall } = useTalakWeb3();

  useEffect(() => {
    const ctrl = new AbortController();

    async function tick() {
      await Promise.all(
        FEATURED_CHAINS.map(async chain => {
          const start = performance.now();
          try {
            const [block, gas] = await Promise.all([
              makeRpcCall(chain.id, "eth_blockNumber", []) as Promise<string>,
              makeRpcCall(chain.id, "eth_gasPrice", []) as Promise<string>,
            ]);
            const latency = performance.now() - start;
            setCells(prev => ({
              ...prev,
              [chain.id]: {
                block: fromHex(block),
                gasGwei: fromHex(gas),
                latencyMs: latency,
                loading: false,
              },
            }));
          } catch (err) {
            if (ctrl.signal.aborted) return;
            const msg = err instanceof Error ? err.message : "rpc error";
            setCells(prev => ({
              ...prev,
              [chain.id]: { ...emptyNet(), loading: false, error: msg },
            }));
          }
        })
      );
    }

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [refreshTick, makeRpcCall]);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-medium">talak-web3 network status</span>
        <span className="text-[10.5px] text-muted-foreground/70 font-mono">
          · talak-web3 RPC · refreshes every {Math.round(POLL_MS / 1000)}s
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setRefreshTick(t => t + 1)}
          title="Refresh now"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {FEATURED_CHAINS.map((chain, i) => {
          const c = cells[chain.id] ?? emptyNet();
          return (
            <div
              key={chain.id}
              className={cn(
                "p-3 border-border",
                i < FEATURED_CHAINS.length - 1 && "lg:border-r border-b lg:border-b-0"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={chain.logo}
                  alt={chain.name}
                  className="h-5 w-5 rounded-full shrink-0"
                  onError={(e) => {
                    // Fallback to colored dot if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const dot = document.createElement('span');
                    dot.className = 'h-1.5 w-1.5 rounded-full shrink-0';
                    dot.style.backgroundColor = chain.accent;
                    target.parentNode?.insertBefore(dot, target);
                  }}
                />
                <span className="text-[12px] font-medium">{chain.name}</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  id&nbsp;{chain.id}
                </span>
              </div>
              {c.loading ? (
                <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> querying…
                </div>
              ) : c.error ? (
                <div className="text-[11px] text-destructive font-mono truncate" title={c.error}>
                  {c.error}
                </div>
              ) : (
                <>
                  <div className="text-[11px] text-muted-foreground">block</div>
                  <div className="text-[15px] font-mono tabular-nums">
                    #{c.block!.toString()}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span title="Network gas price">
                      <Fuel className="inline h-3 w-3 mr-1 align-[-2px]" />
                      {formatGwei(c.gasGwei!)} gwei
                    </span>
                    <span title="Round-trip latency to public RPC">
                      {c.latencyMs}ms
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** ------------------------------------------------------------------ */
/** Native balances for each linked wallet on its linked chain.         */
/** ------------------------------------------------------------------ */
type BalanceState = { wei: bigint | null; loading: boolean; error?: string };

function WalletBalances({ wallets }: { wallets: LinkedWallet[] }) {
  const [bal, setBal] = useState<Record<string, BalanceState>>({});
  const [refreshTick, setRefreshTick] = useState(0);

  const sigKey = useMemo(
    () => wallets.map(w => `${w.id}:${w.address}:${w.chain_id}`).join("|"),
    [wallets]
  );

  useEffect(() => {
    if (wallets.length === 0) return;
    const ctrl = new AbortController();

    setBal(prev => {
      const next: Record<string, BalanceState> = {};
      wallets.forEach(w => {
        next[w.id] = prev[w.id] ?? { wei: null, loading: true };
      });
      return next;
    });

    (async () => {
      await Promise.all(
        wallets.map(async w => {
          const chain = getChainById(w.chain_id);
          if (!chain) {
            setBal(prev => ({ ...prev, [w.id]: { wei: null, loading: false, error: "unknown chain" } }));
            return;
          }
          try {
            const result = await jsonRpc<string>(
              chain.rpc,
              "eth_getBalance",
              [w.address, "latest"],
              ctrl.signal
            );
            setBal(prev => ({ ...prev, [w.id]: { wei: fromHex(result), loading: false } }));
          } catch (err) {
            if (ctrl.signal.aborted) return;
            const msg = err instanceof Error ? err.message : "rpc error";
            setBal(prev => ({ ...prev, [w.id]: { wei: null, loading: false, error: msg } }));
          }
        })
      );
    })();

    return () => ctrl.abort();
  }, [sigKey, refreshTick, wallets]);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-medium">talak-web3 wallet balances</span>
        <span className="text-[10.5px] text-muted-foreground/70 font-mono">
          · live from talak-web3 RPC services
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setRefreshTick(t => t + 1)}
          disabled={wallets.length === 0}
          title="Refetch balances"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      {wallets.length === 0 ? (
        <div className="p-6 text-center text-[12.5px] text-muted-foreground">
          Link a wallet above to see its native balance.
        </div>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Address</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Chain</th>
              <th className="text-right font-medium text-muted-foreground px-3 py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map(w => {
              const chain = getChainById(w.chain_id);
              const state = bal[w.id];
              return (
                <tr key={w.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-[12px]">
                    {w.address.slice(0, 6)}…{w.address.slice(-4)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {chain?.name ?? `Chain ${w.chain_id}`}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {!state || state.loading ? (
                      <Loader2 className="inline h-3 w-3 animate-spin text-muted-foreground" />
                    ) : state.error ? (
                      <span className="text-destructive text-[11px]" title={state.error}>error</span>
                    ) : (
                      <>
                        <span className="text-foreground">{formatNative(state.wei!)}</span>
                        <span className="ml-1 text-muted-foreground text-[11px]">{chain?.symbol}</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** ------------------------------------------------------------------ */
/** Sign an arbitrary message with the connected wallet (personal_sign).*/
/** ------------------------------------------------------------------ */
function MessageSigner() {
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [signer, setSigner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const available = isWalletAvailable();

  const sign = useCallback(async () => {
    if (!message.trim()) {
      toast({ title: "Type a message first", variant: "destructive" });
      return;
    }
    if (!window.ethereum) {
      toast({ title: "No browser wallet", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const accounts = await requestAccounts();
      const from = accounts[0];
      if (!from) throw new Error("No account returned by wallet");
      const hex =
        "0x" +
        Array.from(new TextEncoder().encode(message))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      const sig = (await window.ethereum.request({
        method: "personal_sign",
        params: [hex, from],
      })) as string;
      setSignature(sig);
      setSigner(from);
      toast({ title: "Message signed", description: `${from.slice(0, 6)}…${from.slice(-4)}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "sign failed";
      toast({ title: "Signing cancelled", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }, [message]);

  const copy = (s: string, label: string) => {
    void navigator.clipboard.writeText(s).then(() => toast({ title: `${label} copied` }));
  };

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-medium">Sign a message</span>
        <span className="text-[10.5px] text-muted-foreground/70 font-mono">
          · personal_sign via {available ? detectWalletName() : "your wallet"}
        </span>
      </div>
      <div className="p-3 space-y-3">
        <Input
          placeholder="Type any text — e.g. proof of ownership for support@example.com"
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="h-8 text-[13px] bg-transparent"
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-[12px] gap-1.5"
            onClick={sign}
            disabled={busy || !available}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
            Sign with wallet
          </Button>
          {!available && (
            <span className="text-[11.5px] text-muted-foreground">
              Install MetaMask or another EVM wallet to use this.
            </span>
          )}
        </div>
        {signature && (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono">signer</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1.5 text-[11.5px] font-mono bg-muted/40 border border-border break-all">
                {signer}
              </code>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copy(signer!, "Address")}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono">signature</div>
            <div className="flex items-start gap-2">
              <code className="flex-1 px-2 py-1.5 text-[11.5px] font-mono bg-muted/40 border border-border break-all">
                {signature}
              </code>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copy(signature, "Signature")}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Share this signature alongside the original message — anyone can recover the signer's
              public address with <span className="font-mono">ecrecover</span> to prove control of the wallet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** ------------------------------------------------------------------ */
export function Web3Tools({ wallets }: { wallets: LinkedWallet[] }) {
  return (
    <div className="space-y-6">
      <LiveNetworks />
      <WalletBalances wallets={wallets} />
      <MessageSigner />
    </div>
  );
}
