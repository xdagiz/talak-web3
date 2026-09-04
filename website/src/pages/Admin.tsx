import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, Users, Wallet as WalletIcon, Activity, GitBranch, BarChart3, CreditCard, FolderGit2, MonitorSmartphone, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

type Counts = {
  posts: number | null;
  changelogEntries: number | null;
  members: number | null;
  wallets: number | null;
  rpcCalls: number | null;
  keys: number | null;
  projects: number | null;
  subscriptions: number | null;
  sessions: number | null;
};

export default function Admin() {
  const [counts, setCounts] = useState<Counts>({ posts: null, changelogEntries: null, members: null, wallets: null, rpcCalls: null, keys: null, projects: null, subscriptions: null, sessions: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Admin · talak-web3";
    let cancelled = false;
    (async () => {
      const [posts, changelogEntries, members, wallets, rpcCalls, keys, projects, subscriptions, sessions] = await Promise.all([
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("changelog_entries").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("wallets").select("id", { count: "exact", head: true }),
        supabase.from("rpc_logs").select("id", { count: "exact", head: true }),
        supabase.from("api_keys").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setCounts({
        posts: posts.count ?? 0,
        changelogEntries: changelogEntries.count ?? 0,
        members: members.count ?? 0,
        wallets: wallets.count ?? 0,
        rpcCalls: rpcCalls.count ?? 0,
        keys: keys.count ?? 0,
        projects: projects.count ?? 0,
        subscriptions: subscriptions.count ?? 0,
        sessions: sessions.count ?? 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const tiles = [
    { label: "Blog posts",   value: counts.posts,          icon: FileText,          href: "/admin/blog" },
    { label: "Changelog",    value: counts.changelogEntries, icon: GitBranch,       href: "/admin/changelog" },
    { label: "Members",      value: counts.members,        icon: Users,             href: "/admin/members" },
    { label: "Projects",     value: counts.projects,       icon: FolderGit2,        href: "/admin/projects" },
    { label: "Wallets",      value: counts.wallets,        icon: WalletIcon,        href: "/admin/wallets" },
    { label: "API keys",     value: counts.keys,           icon: KeyRound,          href: "/admin/keys" },
    { label: "Subscriptions", value: counts.subscriptions, icon: CreditCard,        href: "/admin/billing" },
    { label: "Sessions",     value: counts.sessions,       icon: MonitorSmartphone, href: "/admin/sessions" },
  ];

  return (
    <AdminLayout title="Overview">
      <div className="p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map(t => (
              <Link
                key={t.label}
                to={t.href}
                className="border border-border bg-card/30 p-4 hover:bg-card/60 transition-colors block"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono">
                    {t.label}
                  </span>
                  <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-[26px] font-mono font-medium tracking-[-0.02em]">
                  {t.value ?? "—"}
                </div>
              </Link>
            ))}
          </div>
        )}

        <section className="border border-border">
          <header className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Quick actions
            </h2>
          </header>
          <div className="divide-y divide-border">
            <ActionRow href="/admin/blog/new" label="Write a new blog post" desc="Publish or save a draft visible only to you." />
            <ActionRow href="/admin/changelog/new" label="Add a new changelog entry" desc="Document releases, patches, and security updates." />
            <ActionRow href="/admin/billing"   label="Grant a paid plan"     desc="Upgrade a user to Team/Scale/Enterprise at no charge (admin grant)." />
            <ActionRow href="/admin/analytics" label="View platform analytics" desc="RPC traffic, growth, providers, and errors across all users." />
            <ActionRow href="/admin/site"      label="Edit site settings"    desc="Hero copy, announcement bar, social links." />
            <ActionRow href="/admin/members"   label="Manage members"        desc="View users and assign the admin role." />
            <ActionRow href="/admin/keys"      label="Audit API keys"        desc="Review key scopes, activity, and revoked keys across users." />
            <ActionRow href="/dashboard"       label="Open user dashboard"   desc="See realtime SIWE / RPC activity from the user view." />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function ActionRow({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link to={href} className="flex items-center justify-between px-4 py-3 hover:bg-card/40 transition-colors">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[12px] text-muted-foreground">{desc}</p>
      </div>
      <span className="text-[11px] font-mono text-muted-foreground">{href}</span>
    </Link>
  );
}
