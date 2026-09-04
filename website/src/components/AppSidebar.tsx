import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  Boxes,
  Shield,
  Menu,
  FolderGit2,
  KeyRound,
  Webhook,
  Activity,
  Zap,
  Receipt,
  Gauge,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  BadgeCheck,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/contexts/AdminGuard";
import { useSidebar } from "@/contexts/SidebarContext";
import { usePayingCustomer } from "@/hooks/usePayingCustomer";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StackedLogo } from "./StackedLogo";
import { ProjectSwitcher } from "./ProjectSwitcher";

type NavItem = { icon: typeof LayoutDashboard; label: string; path: string };

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: BarChart3,       label: "Analytics", path: "/analytics" },
      { icon: Gauge,           label: "Usage",     path: "/usage"     },
      { icon: Activity,        label: "Activity",  path: "/activity"  },
    ],
  },
  {
    title: "Projects",
    items: [
      { icon: FolderGit2, label: "Projects",     path: "/projects"     },
      { icon: KeyRound,   label: "API keys",     path: "/keys"         },
      { icon: Webhook,    label: "Webhooks",     path: "/webhooks"     },
      { icon: Zap,        label: "Integrations", path: "/integrations" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: Receipt,  label: "Billing",  path: "/billing"  },
      { icon: Users,    label: "Team",     path: "/team"     },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
  {
    title: "Resources",
    items: [
      { icon: Download, label: "Install",  path: "/install"  },
      { icon: Boxes,    label: "Packages", path: "/packages" },
      { icon: FileText, label: "Blog",     path: "/blog"     },
    ],
  },
];

// Backwards-compat: flat list of nav items (used elsewhere if needed)
export const navItems: NavItem[] = navGroups.flatMap(g => g.items);

export function SidebarContent({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const { toggleSidebar } = useSidebar();
  const paying = usePayingCustomer();

  const getProfilePicture = () => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    
    // Generate initials-based avatar
    const initials = profile?.full_name 
      ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user?.email?.slice(0, 2).toUpperCase();
    
    return `https://ui-avatars.com/api/?name=${initials}&background=6366f1&color=ffffff&size=32`;
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 h-11 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2 flex-1 hover:bg-sidebar-accent/40 transition-colors rounded px-1 py-0.5 -ml-1">
            <StackedLogo size={16} />
            <span className="font-bold tracking-[0.04em] text-[13px] text-sidebar-accent-foreground">
              talak-web3
            </span>
          </Link>
        )}
        <div className={cn(
          "flex items-center justify-center flex-1",
          !collapsed && "flex-none"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 hover:bg-sidebar-accent/50 transition-colors flex-shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Nav (scrollable with custom scrollbar) */}
      <nav className="flex-1 py-2 px-1.5 space-y-3 overflow-y-auto sidebar-scrollbar">
        <ProjectSwitcher collapsed={collapsed} />
        {navGroups.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/50 font-medium">
                {group.title}
              </p>
            )}
            <div className="space-y-px">
              {group.items.map(item => {
                const isActive = location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path + "/")) ||
                  (item.path !== "/" && location.pathname === item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors",
                      collapsed ? "justify-center px-0" : "",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div className="pt-2 border-t border-sidebar-border">
            <Link
              to="/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors",
                collapsed ? "justify-center px-0" : "",
                location.pathname.startsWith("/admin")
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Admin</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <div className={cn(
          "flex items-center gap-2 px-1",
          collapsed && "justify-center"
        )}>
          <Avatar className="h-5 w-5">
            <AvatarImage src={getProfilePicture()} alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[9px] leading-none">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="text-[12px] text-sidebar-foreground truncate flex-1">
              {profile?.full_name || user?.email?.split('@')[0] || "User"}
              {paying && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 ml-1.5 inline-block align-[-2px]" aria-label="Paying customer" />}
            </span>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-sidebar-foreground hover:bg-sidebar-accent h-6 w-6"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const { collapsed } = useSidebar();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="md:hidden fixed top-4 left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background/95 shadow-sm"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <aside
        className={cn(
          "fixed inset-y-02left-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border h-screen transition-all duration-300 ease-in-out md:translate-x-0",
          collapsed ? "w-16" : "w-52",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          <SidebarContent collapsed={collapsed} onNavigate={() => setOpen(false)} />
        </div>
      </aside>
      {open && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-30 bg-black/30"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
