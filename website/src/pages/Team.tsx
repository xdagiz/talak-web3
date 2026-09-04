import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Users,
  Link2 as LinkIcon,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  UserPlus,
  Mail,
  Clock,
  Crown,
  X,
} from "lucide-react";

type TeamMember = {
  user_id: string;
  full_name: string;
  avatar_url: string;
  job_title: string;
  role: string;
  invited_by: string | null;
  invited_by_name: string | null;
  joined_at: string;
};

type PendingInvite = {
  id: string;
  project_id: string;
  project_name: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by_name: string;
};

const INVITE_ROLES = [
  { value: "editor", label: "Editor", hint: "Full access to keys, webhooks & calls" },
  { value: "admin", label: "Admin", hint: "Editor access + member management" },
  { value: "viewer", label: "Viewer", hint: "Read-only access" },
] as const;

const roleBadge = (role: string) => {
  const base = "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm";
  if (role === "owner")
    return (
      <span className={`${base} bg-amber-500/15 text-amber-600 dark:text-amber-400`}>
        <Crown className="h-3 w-3" /> owner
      </span>
    );
  if (role === "admin")
    return (
      <span className={`${base} bg-foreground/10 text-foreground`}>
        <ShieldCheck className="h-3 w-3" /> admin
      </span>
    );
  if (role === "viewer")
    return (
      <span className={`${base} bg-foreground/5 text-muted-foreground border border-border`}>
        viewer
      </span>
    );
  return (
    <span className={`${base} border border-border text-muted-foreground`}>
      editor
    </span>
  );
};

export default function Team() {
  const { user } = useAuth();
  const { activeProject } = useWorkspace();
  const navigate = useNavigate();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("editor");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const projectId = activeProject?.id ?? null;

  const refresh = useCallback(async () => {
    if (!projectId) {
      setMembers([]);
      setInvites([]);
      setLoading(false);
      return;
    }
    try {
      const [m, i] = await Promise.all([
        supabase.rpc("get_project_team", { _project_id: projectId }),
        supabase.rpc("get_pending_invites"),
      ]);
      if (m.error) throw new Error(m.error.message);
      if (i.error) throw new Error(i.error.message);
      setMembers((m.data as TeamMember[] | null) ?? []);
      setInvites((i.data as PendingInvite[] | null) ?? []);
    } catch (err) {
      toast({
        title: "Could not load team",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    document.title = "Team · talak-web3";
    refresh();
    const ch = supabase
      .channel("team-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_invites" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_members" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const buildInviteLink = (token: string) => `${window.location.origin}/invite/${token}`;

  const onCopy = async (id: string, token: string) => {
    await navigator.clipboard.writeText(buildInviteLink(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc("create_team_invite", {
        _project_id: projectId,
        _email: mail,
        _role: role,
      });
      if (error) throw error;
      const invite = data as { id: string; token: string } | null;
      setEmail("");
      setRole("editor");
      toast({ title: "Invite created", description: `${mail} can now join with the invite link.` });
      await refresh();
      if (invite?.token) onCopy(invite.id, invite.token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create invite.";
      const friendly = {
        team_invite_active: "There is already a pending invite for this email in the project.",
        team_invite_invalid_email: "Enter a valid email address.",
        team_invite_invalid_role: "Invalid role selected.",
        team_invite_forbidden: "You can only invite into projects you own.",
      } as Record<string, string>;
      toast({
        title: "Invite failed",
        description: friendly[msg.replace(/^.*?: /, "")] ?? msg,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const revokeInvite = async (id: string, emailAddress: string) => {
    const { error } = await supabase.rpc("revoke_team_invite", { _invite_id: id });
    if (error) {
      toast({ title: "Could not revoke invite", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invite revoked", description: `Removed the invite for ${emailAddress}.` });
    refresh();
  };

  const initials = (name: string) =>
    (name || "?")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 md:px-6 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <h1 className="text-[13px] font-medium">Team</h1>
            {activeProject && (
              <span className="ml-1 text-[11.5px] text-muted-foreground truncate max-w-[220px]">
                · {activeProject.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 max-w-[1000px]">
          {!projectId ? (
            <div className="border border-dashed border-border p-10 text-center max-w-[520px] mx-auto mt-8">
              <Users className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-[14px] font-medium mb-1">No project yet</h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">
                Team invites are scoped to a project. Create a project first, then invite your teammates.
              </p>
              <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>
                Go to projects
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-[18px] font-medium tracking-[-0.02em] mb-1">Team members</h2>
                <p className="text-[13px] text-muted-foreground leading-[1.7]">
                  Invite teammates to <span className="text-foreground/80">{activeProject.name}</span>. Members can
                  create projects resources, generate API keys, and (depending on their role) manage the team.
                </p>
              </div>

              {/* Invite form */}
              <form
                onSubmit={sendInvite}
                className="border border-border rounded-md p-4 mb-6 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-foreground/70" />
                  <h3 className="text-[13px] font-medium">Invite by email</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2.5">
                  <div className="flex-1 w-full sm:max-w-[280px] space-y-1">
                    <Label htmlFor="invite-email" className="text-[11.5px] text-muted-foreground">
                      Email address
                    </Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="teammate@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="w-full sm:w-[170px] space-y-1">
                    <Label className="text-[11.5px] text-muted-foreground">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-9 text-[12.5px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-[12.5px]">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" size="sm" className="h-9 text-[12px] gap-1.5 shrink-0" disabled={sending}>
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    Send invite
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {INVITE_ROLES.find((r) => r.value === role)?.hint}. The invite link expires after 7 days.
                </p>
              </form>

              {/* Pending invites */}
              {invites.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-[0.08em] mb-2">
                    Pending invites
                  </h3>
                  <div className="border border-border divide-y divide-border rounded-md overflow-hidden">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium truncate">{inv.email}</span>
                            {roleBadge(inv.role)}
                          </div>
                          <p className="text-[11.5px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNowStrict(new Date(inv.expires_at))} left
                            {inv.invited_by_name ? ` · by ${inv.invited_by_name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1.5 border border-border rounded-md px-2 h-8 bg-background max-w-[240px]">
                            <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[11px] font-mono text-muted-foreground truncate">
                              /invite/{inv.token.slice(0, 12)}…
                            </span>
                          </div>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => onCopy(inv.id, inv.token)}>
                            {copiedId === inv.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => revokeInvite(inv.id, inv.email)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members list */}
              <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-[0.08em] mb-2">
                Members
              </h3>
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <div className="border border-dashed border-border p-10 text-center max-w-[520px] mx-auto">
                  <Users className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-[14px] font-medium mb-1">No members found</h3>
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                    Send your first invite above to bring teammates into this project.
                  </p>
                </div>
              ) : (
                <div className="border border-border divide-y divide-border rounded-md overflow-hidden">
                  {members.map((m) => {
                    const isSelf = m.user_id === user?.id;
                    return (
                      <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-8 w-8 rounded-full bg-foreground/10 flex items-center justify-center text-[11px] font-medium shrink-0 overflow-hidden">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials(m.full_name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-medium truncate">{m.full_name || "(no name)"}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">
                                you
                              </span>
                            )}
                            {roleBadge(m.role)}
                          </div>
                          <p className="text-[11.5px] text-muted-foreground truncate">
                            {m.invited_by_name && m.role !== "owner" ? (
                              <Link to="/team" className="hover:underline">
                                Invited by {m.invited_by_name}
                              </Link>
                            ) : (
                              m.job_title || "—"
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}