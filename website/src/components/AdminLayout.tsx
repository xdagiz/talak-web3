import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, GitBranch, Settings as SettingsIcon, Users, ArrowLeft, LogOut, Shield, BarChart3, CreditCard, FolderGit2, Wallet, MonitorSmartphone, KeyRound, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePayingCustomer } from "@/hooks/usePayingCustomer";
import { Button } from "@/components/ui/button";

const adminNav = [
  { icon: LayoutDashboard, label: "Overview",   path: "/admin" },
  { icon: BarChart3,       label: "Analytics",  path: "/admin/analytics" },
  { icon: CreditCard,      label: "Billing",    path: "/admin/billing" },
  { icon: FileText,        label: "Blog",       path: "/admin/blog" },
  { icon: GitBranch,       label: "Changelog",  path: "/admin/changelog" },
  { icon: FolderGit2,      label: "Projects",   path: "/admin/projects" },
  { icon: Wallet,          label: "Wallets",    path: "/admin/wallets" },
  { icon: MonitorSmartphone, label: "Sessions", path: "/admin/sessions" },
  { icon: KeyRound,        label: "API keys",   path: "/admin/keys" },
  { icon: Users,           label: "Members",    path: "/admin/members" },
  { icon: SettingsIcon,    label: "Site",       path: "/admin/site" },
];

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const paying = usePayingCustomer();
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-56 border-r border-border sticky top-0 h-screen">
        <div className="h-12 px-3 flex items-center gap-2 border-b border-border">
          <div className="h-6 w-6 rounded bg-foreground/10 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-foreground" />
          </div>
          <span className="text-[12px] font-medium tracking-[0.08em] uppercase">talak admin</span>
        </div>
        <nav className="flex-1 p-2 space-y-px">
          {adminNav.map(item => {
            const active = location.pathname === item.path
              || (item.path !== "/admin" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors",
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-2 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to site
          </Link>
          <div className="flex items-center gap-2 px-2 pt-1">
            <div className="h-5 w-5 rounded-full bg-foreground/10 text-[9px] font-medium flex items-center justify-center">
              {initials}
            </div>
            <span className="text-[11px] truncate flex-1 text-muted-foreground">
              {profile?.full_name || "admin"}
              {paying && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 ml-1 inline-block align-[-2px]" aria-label="Paying customer" />}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-5 w-5">
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-12 px-4 md:px-6 border-b border-border flex items-center justify-between bg-background/85 backdrop-blur-sm">
          <h1 className="text-[13px] font-medium">{title}</h1>
          <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">
            /admin{location.pathname === "/admin" ? "" : location.pathname.replace("/admin", "")}
          </span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
