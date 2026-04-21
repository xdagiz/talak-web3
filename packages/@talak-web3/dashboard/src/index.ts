export type DashboardNavItem = { href: string; label: string };

export function getDefaultNav(): DashboardNavItem[] {
  return [
    { href: "/admin", label: "Admin" },
    { href: "/admin/analytics", label: "Analytics" }
  ];
}
