import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  Bell, BellRing, ArrowLeft, Loader2, ChevronRight, ShieldCheck, CalendarClock, Box, Hash, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectEvent = Tables<"project_events">;

const LEVEL_DOT: Record<string, string> = {
  info:    "bg-muted-foreground",
  success: "bg-success",
  warn:    "bg-warning",
  error:   "bg-destructive",
};

const LEVEL_TEXT: Record<string, string> = {
  info:    "text-muted-foreground",
  success: "text-success",
  warn:    "text-warning",
  error:   "text-destructive",
};

const TYPE_LABEL: Record<string, string> = {
  rpc:      "RPC",
  tx:       "Transaction",
  auth:     "Auth",
  webhook:  "Webhook",
  deploy:   "Deploy",
  system:   "System",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtMeta(meta: unknown): string {
  if (meta == null) return "";
  try {
    const raw = typeof meta === "string" ? JSON.parse(meta) : meta;
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(meta);
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("project_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setEvents([]);
    } else {
      setEvents(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void refresh();
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_events", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[860px] px-6 py-10 space-y-8">
        <header className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-muted/20">
            <BellRing className="h-4.5 w-4.5 text-foreground" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Notifications</p>
            <h1 className="mt-1 text-[26px] font-[500] tracking-[-0.02em]">Inbox</h1>
          </div>
        </header>

        <p className="text-[13px] text-muted-foreground -mt-4 leading-[1.7]">
          System alerts, billing events, and activity from all your projects — newest first.
        </p>

        {events.length === 0 ? (
          <div className="border border-border rounded-md px-6 py-14 text-center text-[13px] text-muted-foreground">
            <Bell className="h-6 w-6 mx-auto mb-3 opacity-40" />
            No notifications yet. Grants, billing charges, and system alerts will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  to={`/notifications/${ev.id}`}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
                >
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", LEVEL_DOT[ev.level] ?? "bg-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted-foreground">
                        {TYPE_LABEL[ev.type] ?? ev.type}
                      </span>
                      <span className={cn("text-[11px] font-mono", LEVEL_TEXT[ev.level] ?? "text-muted-foreground")}>
                        {ev.level}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13.5px] text-foreground leading-snug">{ev.message}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{fmtDate(ev.created_at)}</span>
                      {ev.project_id && <span className="inline-flex items-center gap-1"><Box className="h-3 w-3" />project</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1.5 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}

export function NotificationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ev, setEv] = useState<ProjectEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("project_events")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { setEv(data ?? null); setLoading(false); });
  }, [id, user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!ev) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-[640px] px-6 py-16 text-center">
          <p className="text-[14px] text-muted-foreground">Notification not found.</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate("/notifications")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to inbox
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[720px] px-6 py-10 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notifications")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Inbox
        </Button>

        <div className="border border-border rounded-md overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
            <span className={cn("h-2.5 w-2.5 rounded-full", LEVEL_DOT[ev.level] ?? "bg-muted-foreground")} />
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] font-mono text-muted-foreground">
                {TYPE_LABEL[ev.type] ?? ev.type}
                <span className={LEVEL_TEXT[ev.level] ?? "text-muted-foreground"}>{ev.level}</span>
              </div>
              <h1 className="mt-1 text-[18px] font-[500] tracking-[-0.01em] leading-snug">{ev.message}</h1>
            </div>
          </div>

          <dl className="divide-y divide-border">
            <Row icon={<Hash className="h-3.5 w-3.5" />} label="ID" value={ev.id} mono />
            <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Created" value={fmtDate(ev.created_at)} />
            <Row icon={<Box className="h-3.5 w-3.5" />} label="Project" value={ev.project_id ? ev.project_id : "Global (system)"} mono={!!ev.project_id} />
            <Row icon={<MessageSquare className="h-3.5 w-3.5" />} label="Type" value={TYPE_LABEL[ev.type] ?? ev.type} />
            <Row icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Level" value={ev.level} />
          </dl>
        </div>

        {ev.metadata && Object.keys(ev.metadata as object).length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-muted-foreground mb-2">Details</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/20 px-4 py-3 text-[12px] font-mono leading-relaxed">
              {fmtMeta(ev.metadata)}
            </pre>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <dt className="w-24 shrink-0 text-[11px] uppercase tracking-[0.12em] font-mono text-muted-foreground pt-0.5">{label}</dt>
      <dd className={cn("min-w-0 flex-1 text-[13px] text-foreground break-words", mono && "font-mono")}>{value}</dd>
    </div>
  );
}
