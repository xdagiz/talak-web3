import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StackedLogo } from "@/components/StackedLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Mail,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  PartyPopper,
  LogOut,
} from "lucide-react";

type InviteInfo = {
  project_id: string;
  project_name: string;
  role: string;
  email: string;
  expires_at: string;
  accepted: boolean;
  expired: boolean;
  inviter_name: string;
  inviter_avatar: string;
  inviter_email: string;
};

const rolePill = (role: string) => {
  const cls =
    role === "admin"
      ? "bg-foreground/10 text-foreground"
      : "border border-border text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 text-[11px] font-mono rounded-sm ${cls}`}>
      <ShieldCheck className="h-3 w-3" />
      {role}
    </span>
  );
};

const initials = (name: string) =>
  (name || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading, signOut } = useAuth();
  const { refreshWorkspace, setActiveProjectId } = useWorkspace();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [state, setState] = useState<"loading" | "invalid" | "expired" | "accepted" | "ok">("loading");
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setState("invalid");
      return;
    }
    const { data, error } = await supabase.rpc("get_invite_by_token", { _token: token });
    if (error || !data || data.length === 0) {
      setState("invalid");
      return;
    }
    const row = data[0] as InviteInfo;
    setInvite(row);
    setState(row.accepted ? "accepted" : row.expired ? "expired" : "ok");
  }, [token]);

  useEffect(() => {
    document.title = "Team invitation · talak-web3";
    load();
  }, [load]);

  const emailMatches = user && invite ? user.email?.toLowerCase() === invite.email.toLowerCase() : false;

  const accept = async () => {
    if (!user || !invite) return;
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_team_invite", { _token: token });
      if (error) throw error;
      const result = data as { project_id: string; project_name: string; role: string };
      toast({
        title: "Welcome to the team",
        description: `You joined "${result.project_name}" as ${result.role}.`,
      });
      await refreshWorkspace();
      if (result.project_id) setActiveProjectId(result.project_id);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not accept invite.";
      const map: Record<string, string> = {
        team_invite_not_found: "This invite no longer exists.",
        team_invite_accepted: "This invite was already accepted.",
        team_invite_expired: "This invite has expired.",
        team_invite_email_mismatch: `This invite is for ${invite.email}. Sign in with that email to accept.`,
      };
      if (map[msg]) setState(msg === "team_invite_accepted" ? "accepted" : msg === "team_invite_expired" ? "expired" : "ok");
      toast({ title: "Could not accept", description: map[msg] ?? msg, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  const authUrl = `/auth?redirect=${encodeURIComponent(`/invite/${token ?? ""}`)}&mode=login`;

  const emailMismatch = Boolean(user && invite && !emailMatches);

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* ambient grid + glow, same language as the auth screen */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 0%, black 45%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[460px] w-[720px] rounded-full pointer-events-none blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, hsl(var(--foreground) / 0.10), transparent 65%)" }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* top bar */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <StackedLogo size={20} />
            <span className="text-[14px] font-bold tracking-[0.08em] uppercase">talak-web3</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to site
            </Link>
          </div>
        </header>

        {/* body */}
        <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
          {authLoading || state === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-[12px] font-mono text-muted-foreground/70">resolving invite…</p>
            </div>
          ) : state === "invalid" ? (
            <Card title="Invite not found" icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}>
              <p className="text-[13px] text-muted-foreground leading-relaxed text-center">
                This invite link doesn't exist or has been revoked.
              </p>
              <Button asChild className="w-full h-9 text-[13px]">
                <Link to="/">Back to talak-web3</Link>
              </Button>
            </Card>
          ) : state === "expired" ? (
            <Card title="This invite has expired" icon={<Clock className="h-5 w-5 text-muted-foreground" />}>
              <p className="text-[13px] text-muted-foreground leading-relaxed text-center">
                Ask whoever invited you to send a new invite.
              </p>
              <Button asChild className="w-full h-9 text-[13px]">
                <Link to="/">Back to talak-web3</Link>
              </Button>
            </Card>
          ) : state === "accepted" ? (
            <Card title="Invite already accepted" icon={<CheckCircle2 className="h-5 w-5 text-success" />}>
              <p className="text-[13px] text-muted-foreground leading-relaxed text-center">
                This invite has already been used. You're all set.
              </p>
              <Button asChild className="w-full h-9 text-[13px]">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </Card>
          ) : (
            invite && (
              <div className="w-full max-w-[440px]">
                {/* invite card */}
                <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
                  {/* header accent */}
                  <div className="h-16 relative border-b border-border overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-[0.14]"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10.5px] uppercase tracking-[0.2em] font-mono text-foreground/60">
                        team invitation
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    {/* whom / what */}
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-md border border-border bg-background flex items-center justify-center shrink-0">
                        <UserPlus className="h-5 w-5 text-foreground/80" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-[20px] font-medium tracking-[-0.02em] truncate">
                          {invite.project_name}
                        </h1>
                        <p className="text-[12.5px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          You've been invited with <span className="text-foreground/80 font-medium">{rolePill(invite.role)}</span>
                        </p>
                      </div>
                    </div>

                    {/* who invited you */}
                    <div className="mt-5 flex items-center gap-3 rounded-md border border-border bg-background/60 px-3.5 py-3">
                      <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center text-[12px] font-medium shrink-0 overflow-hidden">
                        {invite.inviter_avatar ? (
                          <img src={invite.inviter_avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(invite.inviter_name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          Invited by {invite.inviter_name || "a teammate"}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground truncate">{invite.inviter_email}</p>
                      </div>
                    </div>

                    {/* details */}
                    <div className="mt-4 space-y-2">
                      <Row icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />} label="For email" value={invite.email} />
                      <Row
                        icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        label="Expires"
                        value={formatDistanceToNowStrict(new Date(invite.expires_at))}
                      />
                    </div>

                    {/* state-dependent CTA */}
                    <div className="mt-6">
                      {emailMismatch ? (
                        <>
                          <div className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 mb-3">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[12.5px] font-medium">Wrong account</p>
                              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                                This invite is for <span className="text-foreground">{invite.email}</span> but you're
                                signed in as <span className="text-foreground">{user?.email}</span>. Sign out and sign in
                                with the invited email to accept.
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" className="w-full h-9 text-[13px] gap-1.5" onClick={() => signOut()}>
                            <LogOut className="h-3.5 w-3.5" />
                            Switch account
                          </Button>
                        </>
                      ) : user ? (
                        <Button className="w-full h-9 text-[13px] gap-1.5" onClick={accept} disabled={accepting}>
                          {accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PartyPopper className="h-3.5 w-3.5" />}
                          Accept invite
                        </Button>
                      ) : (
                        <>
                          <Button asChild className="w-full h-9 text-[13px] gap-1.5" onClick={() => navigate(authUrl)}>
                            <Link to={authUrl}>Sign in to accept</Link>
                          </Button>
                          <Button asChild variant="outline" className="w-full h-9 text-[13px] mt-2" onClick={() => navigate(authUrl)}>
                            <Link to={authUrl + "&mode=signup"}>Create an account</Link>
                          </Button>
                          <p className="mt-3 text-[11px] text-muted-foreground text-center leading-snug">
                            Accept with the email this invite was sent to — {invite.email}.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </main>

        {/* footer */}
        <footer className="px-6 sm:px-10 py-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono">© {new Date().getFullYear()} talak-web3</span>
          <Link to="/" className="hover:text-foreground transition-colors">
            talak-web3.dev
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[400px] rounded-lg border border-border bg-card/50 backdrop-blur-sm p-8 flex flex-col items-center gap-4 text-center">
      <div className="h-11 w-11 rounded-md border border-border bg-background flex items-center justify-center">{icon}</div>
      <h1 className="text-[17px] font-medium tracking-[-0.02em]">{title}</h1>
      <div className="w-full space-y-3">{children}</div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="flex items-center gap-1.5 text-muted-foreground w-28 shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-foreground/90 font-mono text-[11.5px] truncate">{value}</span>
    </div>
  );
}