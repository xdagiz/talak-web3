import { useCallback, useMemo, useState } from "react";
import { Play, Code, Loader2, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CHAINS, getChainById } from "@/data/chains";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * RPC Playground — interactive JSON-RPC tester.
 *
 * Runs calls directly against public RPC endpoints (no backend required on a
 * static SPA) and logs each call to the Supabase `rpc_logs` table so the
 * dashboard charts populate with real data when the user is signed in.
 */

const PRESET_METHODS: { name: string; params: string; desc: string }[] = [
  { name: "eth_blockNumber", params: "[]", desc: "Latest block height" },
  { name: "eth_chainId", params: "[]", desc: "Current chain ID" },
  { name: "eth_gasPrice", params: "[]", desc: "Current gas price" },
  { name: "net_version", params: "[]", desc: "Network ID" },
  {
    name: "eth_getBalance",
    params: '["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "latest"]',
    desc: "Balance of an address",
  },
];

type Result = {
  ok: boolean;
  raw?: unknown;
  error?: string;
  latencyMs: number;
};

export function RPCPlayground() {
  const { user } = useAuth();
  const { activeProject } = useWorkspace();
  const [selectedChain, setSelectedChain] = useState<number>(1);
  const [method, setMethod] = useState<string>("eth_blockNumber");
  const [customMethod, setCustomMethod] = useState(false);
  const [params, setParams] = useState("[]");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);

  const chain = useMemo(() => getChainById(selectedChain), [selectedChain]);

  const resetToPreset = useCallback(() => {
    setCustomMethod(false);
    setParams("[]");
    setResult(null);
  }, []);

  const pickPreset = useCallback((name: string, presetParams: string) => {
    setMethod(name);
    setParams(presetParams);
    setCustomMethod(false);
    setResult(null);
  }, []);

  const handleExecute = useCallback(async () => {
    if (!chain) {
      toast({ title: "Unknown chain", variant: "destructive" });
      return;
    }
    let parsedParams: unknown[];
    try {
      parsedParams = JSON.parse(params);
      if (!Array.isArray(parsedParams)) throw new Error("Params must be a JSON array.");
    } catch {
      toast({ title: "Invalid params", description: "Params must be a valid JSON array.", variant: "destructive" });
      return;
    }

    setRunning(true);
    const start = performance.now();
    let outcome: Result;
    try {
      const res = await fetch(chain.rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params: parsedParams }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
      if (data.error) throw new Error(data.error.message || "RPC error");
      const latency = Math.round(performance.now() - start);
      outcome = { ok: true, raw: data.result, latencyMs: latency };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      const msg = err instanceof Error ? err.message : "RPC request failed";
      outcome = { ok: false, error: msg, latencyMs: latency };
    } finally {
      setRunning(false);
    }

    setResult(outcome);
    setHistory((h) => [outcome, ...h.slice(0, 9)]);

    // Log to Supabase for the realtime dashboard (best-effort, non-blocking).
    if (user) {
      try {
        await supabase.from("rpc_logs").insert({
          user_id: user.id,
          method,
          provider: chain.name.toLowerCase(),
          chain_id: chain.id,
          status: outcome.ok ? "200" : "error",
          latency_ms: outcome.latencyMs,
          error_message: outcome.ok ? null : outcome.error ?? null,
        });
      } catch {
        /* logs are best-effort */
      }
      try {
        await supabase.from("usage_metrics").insert({
          user_id: user.id,
          project_id: activeProject?.id ?? null,
          chain_id: chain.id,
          method,
          status: outcome.ok ? "success" : "error",
          duration_ms: outcome.latencyMs,
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* usage metrics are best-effort */
      }
    }
  }, [chain, method, params, user, activeProject]);

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() =>
      toast({ title: "Copied to clipboard" }),
    );
  };

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <Code className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-medium">RPC Playground</span>
        <span className="text-[10.5px] text-muted-foreground/70 font-mono">
          · direct public RPC
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
          {PRESET_METHODS.map((p) => (
            <button
              key={p.name}
              onClick={() => pickPreset(p.name, p.params)}
              className={cn(
                "h-7 px-2 text-[11px] font-mono border rounded-sm transition-colors",
                method === p.name && !customMethod
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
              title={p.desc}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Chain + method + params */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono mb-1 block">
              Chain
            </label>
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(Number(e.target.value))}
              className="h-8 w-full bg-transparent border border-border rounded-sm px-2 text-[13px] text-foreground focus:border-primary/50 outline-none"
            >
              {CHAINS.filter((c) => !c.testnet).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (ID: {c.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono mb-1 block">
              Method
            </label>
            <Input
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setCustomMethod(true);
              }}
              className="h-8 text-[12px] font-mono bg-transparent"
              spellCheck={false}
            />
          </div>
          <div className="md:flex md:items-end">
            {customMethod && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToPreset}
                className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Reset to preset
              </Button>
            )}
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono mb-1 block">
            Params (JSON array)
          </label>
          <Textarea
            value={params}
            onChange={(e) => setParams(e.target.value)}
            rows={3}
            spellCheck={false}
            className="font-mono text-[12px] bg-transparent"
          />
          <span className="text-[10.5px] text-muted-foreground/70">
            Example: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "latest"]
          </span>
        </div>

        <Button
          onClick={handleExecute}
          disabled={running || !chain}
          size="sm"
          className="h-8 text-[12px] gap-1.5"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Executing…" : "Execute RPC call"}
        </Button>

        {/* Result */}
        {result && (
          <div className="space-y-2 pt-1">
            {result.ok ? (
              <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/5 p-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {method} · {result.latencyMs}ms
                    </span>
                    <button
                      onClick={() => copy(JSON.stringify(result.raw, null, 2))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <pre className="mt-1 text-[12px] font-mono text-foreground whitespace-pre-wrap break-all">
                    {typeof result.raw === "string"
                      ? result.raw
                      : JSON.stringify(result.raw, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="text-[12px] font-mono">{result.error}</span>
              </div>
            )}

            {history.length > 1 && (
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer select-none">Recent calls</summary>
                <div className="space-y-1 pt-1">
                  {history.slice(1).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
                      <span className={cn("h-1.5 w-1.5 rounded-full", h.ok ? "bg-success" : "bg-destructive")} />
                      <span className="truncate">
                        {h.ok ? JSON.stringify(h.raw)?.slice(0, 40) : h.error}
                      </span>
                      <span className="text-muted-foreground/60 ml-auto">{h.latencyMs}ms</span>
                      <button onClick={() => copy(h.ok ? JSON.stringify(h.raw, null, 2) : h.error ?? "")}>
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
