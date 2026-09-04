import { useState } from "react";
import { AppSidebar, SidebarContent } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { StackedLogo } from "./StackedLogo";
import { Footer } from "./Footer";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./Breadcrumbs";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsBell } from "./NotificationsBell";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        collapsed ? "md:ml-12" : "md:ml-52"
      )}>
        {/* Desktop header with logo when sidebar is collapsed */}
        <header className="sticky top-0 z-40 hidden md:flex items-center h-11 border-b border-border bg-background/80 backdrop-blur-sm px-4 gap-3">
          {collapsed && (
            <div className="flex items-center gap-1.5">
              <StackedLogo size={16} />
              <span className="font-bold tracking-[0.04em] text-[13px] text-foreground">talak-web3</span>
            </div>
          )}
          <div className={cn("flex items-center", !collapsed && "flex-1")}>
            <Breadcrumbs />
          </div>
          <div className="flex-1" />
          <GlobalSearch />
          <NotificationsBell />
        </header>

        {/* Mobile header */}
        <header className="sticky top-0 z-50 flex md:hidden items-center justify-between h-11 border-b border-border bg-background px-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-52 bg-sidebar">
              <div className="flex flex-col h-full">
                <SidebarContent onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-1.5">
            <StackedLogo size={16} />
            <span className="font-bold tracking-[0.04em] text-[13px] text-foreground">talak-web3</span>
          </div>
          <div className="w-7" />
        </header>

        <main className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
          <Footer compact />
        </main>
      </div>
    </div>
  );
}
