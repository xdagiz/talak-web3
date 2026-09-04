import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Copy, Loader2, ShieldCheck, Wallet, ExternalLink, ArrowRight, Minus, Plus, AlertTriangle,
} from "lucide-react";
import { recordSubscription, type SubTier } from "@/integrations/supabase/subscriptions";
import {
  CHAIN_INFO, CHAIN_LIST, type ChainKey, type Stablecoin,
  encodeErc20Transfer, getTokenInfo, toTokenUnits, explorerTxUrl,
} from "@/lib/erc20";

type Tier = {
  key: string;
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
};

const STABLECOINS: { key: Stablecoin; name: string }[] = [
  { key: "USDC", name: "USDC" },
  { key: "USDT", name: "USDT" },
  { key: "DAI",  name: "DAI"  },
];

/**
 * Treasury address that receives stablecoin payments. Replace with your own
 * multisig / deployer address. Must be a valid checksummed ERC-20 recipient.
 * Default below is a deterministic dev placeholder — set
 * VITE_TREASURY_ADDRESS in your environment to override.
 */
const TREASURY_ADDRESS =
  (import.meta.env.VITE_TREASURY_ADDRESS as string | undefined) ??
  "0x000000000000000000000000000000000000dEaD";

const PERIODS: { key: "monthly" | "annual"; label: string; multiplier: number; note: string }[] = [
  { key: "monthly", label: "Monthly", multiplier: 1,  note: "Cancel anytime" },
  { key: "annual",  label: "Annual",  multiplier: 10, note: "2 months free" },
];

function parseBasePrice(price: string): number | null {
  const m = price.match(/\$?([\d.,]+)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function CryptoCheckout({
  open,
  onOpenChange,
  tier,
  onSuccess,
  onError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tier: Tier | null;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
}) {
  const { toast } = useToast();
  const [coin, setCoin] = useState<Stablecoin>("USDC");
  const [chain, setChain] = useState<ChainKey>("base");
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [seats, setSeats] = useState(1);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const basePrice = useMemo(() => (tier ? parseBasePrice(tier.price) : null), [tier]);
  const total = useMemo(() => {
    if (basePrice === null) return null;
    const periodMult = PERIODS.find(p => p.key === period)!.multiplier;
    const seatMult = tier?.key === "team" ? Math.max(1, seats) : 1;
    return basePrice * periodMult * seatMult;
  }, [basePrice, period, seats, tier]);

  const tokenInfo = useMemo(() => getTokenInfo(coin, chain), [coin, chain]);

  useEffect(() => {
    if (!open) {
      setTxHash(null);
      setPaying(false);
    }
  }, [open]);

  // Track wallet account changes (disconnect / switch).
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth || typeof eth.on !== "function") return;
    const onAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? (accounts as string[]) : [];
      setWalletAddress(list[0] ?? null);
    };
    eth.on("accountsChanged", onAccountsChanged);
    return () => {
      if (typeof eth.removeListener === "function") {
        eth.removeListener("accountsChanged", onAccountsChanged);
      }
    };
  }, []);

  // Try to restore an already-authorized account on open.
  useEffect(() => {
    if (!open || walletAddress) return;
    const eth = window.ethereum;
    if (!eth) return;
    eth
      .request({ method: "eth_accounts" })
      .then((res) => {
        const list = Array.isArray(res) ? (res as string[]) : [];
        if (list[0]) setWalletAddress(list[0]);
      })
      .catch(() => { /* user has not authorized — that's fine */ });
  }, [open, walletAddress]);

  const connect = async () => {
    if (!window.ethereum) {
      toast({
        title: "No wallet detected",
        description: "Install MetaMask, Rabby, Coinbase Wallet, or another EIP-1193 wallet to continue.",
        variant: "destructive",
      });
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts?.[0]) {
        setWalletAddress(accounts[0]);
        toast({ title: "Wallet connected", description: shortAddr(accounts[0]) });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Wallet connection refused.";
      toast({ title: "Couldn't connect", description: msg, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const ensureChain = async () => {
    const targetChainHex = "0x" + CHAIN_INFO[chain].chainId.toString(16);
    try {
      await window.ethereum!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainHex }],
      });
    } catch (err: unknown) {
      // 4902 = chain not added — try to add it.
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        const info = CHAIN_INFO[chain];
        await window.ethereum!.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: targetChainHex,
            chainName: info.name,
            nativeCurrency: { name: info.nativeSymbol, symbol: info.nativeSymbol, decimals: 18 },
            rpcUrls: [info.rpcUrl],
            blockExplorerUrls: [info.explorer],
          }],
        });
      } else {
        throw err;
      }
    }
  };

  const pay = async () => {
    if (!walletAddress || !window.ethereum || total === null) return;
    if (!tokenInfo) {
      toast({
        title: "Unsupported pair",
        description: `${coin} is not deployed on ${CHAIN_INFO[chain].name}. Pick another network or coin.`,
        variant: "destructive",
      });
      return;
    }
    setPaying(true);
    try {
      // 1. Make sure the wallet is on the right chain.
      await ensureChain();

      // 2. Build the ERC-20 `transfer` calldata.
      const amount = toTokenUnits(total, tokenInfo.decimals);
      const data = encodeErc20Transfer(TREASURY_ADDRESS, amount);

      // 3. Send the transaction. `to` is the *token contract*, not the recipient.
      const result = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: tokenInfo.address,
          value: "0x0",
          data,
        }],
      });

      const hash = typeof result === "string" ? result : null;
      if (!hash) throw new Error("Wallet did not return a transaction hash.");
      setTxHash(hash);

      // 4. Process payment through payment service
      if (tier) {
        const { PaymentService } = await import("@/services/payment-service");
        const paymentService = PaymentService.getInstance();
        
        const paymentData = {
          tier: tier.key,
          paymentMethod: 'crypto',
          amountCents: Math.round(total * 100),
          currency: coin.toLowerCase(),
          billingEmail: '', // Will be filled by parent component
          organizationName: '',
          transactionId: hash,
        };

        const paymentResult = await paymentService.processPayment(paymentData);

        if (paymentResult.success) {
          onSuccess?.(hash);
          toast({
            title: "Payment broadcast",
            description: "We'll activate your plan as soon as the transaction confirms on-chain.",
          });
        } else {
          onError?.(paymentResult.error || 'Payment processing failed');
          toast({
            title: "Payment processing failed",
            description: paymentResult.error,
            variant: "destructive",
          });
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      // 4001 = user rejected
      const msg = code === 4001
        ? "You rejected the transaction in your wallet."
        : err instanceof Error ? err.message : "Transaction failed.";
      onError?.(msg);
      toast({ title: "Payment failed", description: msg, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const copyAddr = async () => {
    await navigator.clipboard.writeText(TREASURY_ADDRESS);
    toast({ title: "Treasury address copied" });
  };

  if (!tier) return null;
  const requiresQuote = basePrice === null;
  const unsupportedPair = !requiresQuote && !tokenInfo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[480px] p-0 overflow-hidden border-border gap-0 rounded-md">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[15px] font-medium tracking-[-0.01em] flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Pay with crypto
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground leading-[1.5]">
              Self-custody — no card, no chargebacks.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body — scrollable */}
        <div className="max-h-[calc(85vh-140px)] overflow-y-auto">
          {requiresQuote ? (
            <div className="p-5 text-[13px] text-muted-foreground leading-[1.65]">
              <p>
                <strong className="text-foreground">{tier.name}</strong> is priced per
                deployment. Email{" "}
                <a href="mailto:sales@talak-web3.dev" className="underline hover:text-foreground">
                  sales@talak-web3.dev
                </a>{" "}
                and we'll set up a custom invoice payable in stablecoins on any of our supported chains.
              </p>
            </div>
          ) : txHash ? (
            <SuccessView
              tierName={tier.name}
              total={total!}
              coin={coin}
              chainKey={chain}
              chainName={CHAIN_INFO[chain].name}
              txHash={txHash}
            />
          ) : (
            <div className="p-5 space-y-4">
              {/* Plan summary — compact */}
              <div className="rounded-md border border-border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Plan</p>
                  <p className="text-[14px] font-medium mt-0.5 truncate">{tier.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[18px] font-[500] tracking-[-0.02em] tabular-nums">
                    {total!.toLocaleString()} <span className="text-[12px] text-muted-foreground">{coin}</span>
                  </p>
                  <p className="text-[10.5px] text-muted-foreground tabular-nums">
                    ≈ ${total!.toLocaleString()} {period === "annual" ? "/ yr" : "/ mo"}
                  </p>
                </div>
              </div>

              {/* Period */}
              <Field label="Billing period">
                <div className="grid grid-cols-2 gap-1.5">
                  {PERIODS.map(p => {
                    const active = period === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPeriod(p.key)}
                        className={`rounded-md border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-foreground bg-foreground/5"
                            : "border-border hover:border-foreground/40"
                        }`}
                      >
                        <p className="text-[12.5px] font-medium">{p.label}</p>
                        <p className="text-[10.5px] text-muted-foreground mt-0.5">{p.note}</p>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Seats */}
              {tier.key === "team" && (
                <Field label="Seats">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setSeats(s => Math.max(1, s - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={seats}
                      onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
                      className="h-9 flex-1 text-center text-[13px] tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setSeats(s => s + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-1.5 tabular-nums">
                    × ${basePrice} / seat / mo
                  </p>
                </Field>
              )}

              {/* Coin */}
              <Field label="Stablecoin">
                <div className="grid grid-cols-3 gap-1.5">
                  {STABLECOINS.map(c => {
                    const active = coin === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCoin(c.key)}
                        className={`rounded-md border px-2 py-2 text-center transition-colors ${
                          active
                            ? "border-foreground bg-foreground/5"
                            : "border-border hover:border-foreground/40"
                        }`}
                      >
                        <span className="text-[12.5px] font-medium">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Chain */}
              <Field label="Network">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {CHAIN_LIST.map(c => {
                    const active = chain === c.key;
                    const supported = !!getTokenInfo(coin, c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setChain(c.key)}
                        title={supported ? c.name : `${coin} not on ${c.name}`}
                        className={`rounded-md border px-2 py-1.5 text-center transition-colors ${
                          active
                            ? "border-foreground bg-foreground/5"
                            : supported
                              ? "border-border hover:border-foreground/40"
                              : "border-dashed border-border/60 text-muted-foreground/60"
                        }`}
                      >
                        <span className="text-[11.5px] font-medium">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
                {unsupportedPair && (
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500/90">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      {coin} isn't deployed on {CHAIN_INFO[chain].name}. Switch to a different chain
                      or pick another stablecoin.
                    </span>
                  </div>
                )}
              </Field>

              {/* Wallet */}
              <div className="rounded-md border border-border p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
                      Your wallet
                    </p>
                    <p className="text-[12.5px] mt-0.5 font-mono">
                      {walletAddress ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-foreground/60" />
                          {shortAddr(walletAddress)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-sans">Not connected</span>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={connect}
                    disabled={connecting}
                    variant={walletAddress ? "outline" : "default"}
                    className="h-8 text-[12px] gap-1.5"
                  >
                    {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {walletAddress ? "Reconnect" : "Connect wallet"}
                  </Button>
                </div>

                <div className="border-t border-border pt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
                      Treasury
                    </p>
                    <p className="text-[12px] font-mono mt-0.5 truncate">{shortAddr(TREASURY_ADDRESS)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyAddr}
                    className="h-7 text-[11px] gap-1 px-2"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>

                {tokenInfo && (
                  <div className="border-t border-border pt-2.5 flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground font-mono">
                    <span>{coin} contract</span>
                    <a
                      href={`${CHAIN_INFO[chain].explorer}/token/${tokenInfo.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {shortAddr(tokenInfo.address)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 text-[11px] leading-[1.6] rounded-md border border-border p-2.5 bg-muted/20">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/60" />
                <span className="text-muted-foreground">
                  Your wallet signs locally. talak-web3 never holds custody of your funds.
                  The transaction calls <code className="text-foreground">transfer()</code> on the
                  official {coin} contract.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer button — sticky outside scroll */}
        {!requiresQuote && !txHash && (
          <div className="px-5 py-4 border-t border-border bg-background">
            <Button
              type="button"
              onClick={pay}
              disabled={!walletAddress || paying || unsupportedPair}
              className="w-full h-10 text-[13px] gap-2"
            >
              {paying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Pay {total!.toLocaleString()} {coin}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SuccessView({
  tierName, total, coin, chainKey, chainName, txHash,
}: {
  tierName: string; total: number; coin: string;
  chainKey: ChainKey; chainName: string; txHash: string;
}) {
  return (
    <div className="p-6 text-center space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center bg-foreground/5 border border-border">
        <CheckCircle2 className="h-6 w-6 text-foreground/70" />
      </div>
      <div>
        <h3 className="text-[16px] font-medium tracking-[-0.01em]">Payment broadcast</h3>
        <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-[1.65]">
          Your <strong className="text-foreground">{tierName}</strong> plan will activate as soon as the {total.toLocaleString()} {coin} payment confirms on {chainName}.
        </p>
      </div>
      <div className="rounded-md border border-border p-3 text-left">
        <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Transaction</p>
        <a
          href={explorerTxUrl(chainKey, txHash)}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-mono mt-1 break-all flex items-start gap-1.5 hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" /> {txHash}
        </a>
      </div>
    </div>
  );
}

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
