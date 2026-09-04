import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Wallet as WalletIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getChainById } from "@/data/chains";

type Wallet = {
  id: string;
  address: string;
  chain_id: number;
  user_id: string;
  is_primary: boolean;
  label: string | null;
  created_at: string;
};

type Owner = { user_id: string; full_name: string | null };

export default function AdminWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [owners, setOwners] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Wallets · admin";
    Promise.all([
      supabase.from("wallets").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id,full_name"),
    ]).then(([w, o]) => {
      setWallets((w.data as Wallet[]) ?? []);
      const om = new Map<string, string>();
      ((o.data as Owner[] | null) ?? []).forEach(ow => om.set(ow.user_id, ow.full_name ?? "(no name)"));
      setOwners(om);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query) return wallets;
    const q = query.toLowerCase();
    return wallets.filter(w =>
      w.address.toLowerCase().includes(q) ||
      (owners.get(w.user_id) ?? "").toLowerCase().includes(q) ||
      (w.label ?? "").toLowerCase().includes(q)
    );
  }, [wallets, query, owners]);

  return (
    <AdminLayout title="Wallets">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-muted-foreground">{filtered.length} of {wallets.length} wallets</p>
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search address…" className="h-8 pl-7 text-[12px] w-[240px]" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center text-[13px] text-muted-foreground">No wallets found.</div>
        ) : (
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[680px]">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Address</th>
                  <th className="text-left font-medium px-3 py-2">Label</th>
                  <th className="text-left font-medium px-3 py-2">Chain</th>
                  <th className="text-left font-medium px-3 py-2">Owner</th>
                  <th className="text-left font-medium px-3 py-2">Primary</th>
                  <th className="text-left font-medium px-3 py-2">Linked</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 font-mono text-[11.5px]">
                        <WalletIcon className="h-3 w-3 text-muted-foreground" />
                        {w.address.slice(0, 8)}…{w.address.slice(-6)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{w.label || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{getChainById(w.chain_id)?.name ?? w.chain_id}</td>
                    <td className="px-3 py-2 text-muted-foreground">{owners.get(w.user_id) ?? "—"}</td>
                    <td className="px-3 py-2">
                      {w.is_primary && <Badge className="text-[10px] bg-foreground/10 text-foreground hover:bg-foreground/15">primary</Badge>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
