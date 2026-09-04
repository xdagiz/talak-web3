import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  usage: "Usage",
  activity: "Activity",
  projects: "Projects",
  keys: "API Keys",
  webhooks: "Webhooks",
  integrations: "Integrations",
  billing: "Billing",
  settings: "Settings",
  admin: "Admin",
  blog: "Blog",
  docs: "Docs",
  install: "Install",
  packages: "Packages",
  pricing: "Pricing",
  status: "Status",
  changelog: "Changelog",
};

function humanize(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const location = useLocation();
  const { activeProject } = useWorkspace();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const to = "/" + segments.slice(0, i + 1).join("/");
    let label = humanize(seg);
    if (i === 0 && seg === "projects" && activeProject) {
      label = activeProject.name;
    }
    const isLast = i === segments.length - 1;
    return { to, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-muted-foreground">
      {crumbs.map((c) => (
        <span key={c.to} className="flex items-center gap-1">
          {c.isLast ? (
            <span className="text-foreground font-medium">{c.label}</span>
          ) : (
            <>
              <Link to={c.to} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
        </span>
      ))}
    </nav>
  );
}
