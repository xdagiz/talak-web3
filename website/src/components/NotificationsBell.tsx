import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bell, X, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { notificationsApi, type NotificationItem } from "@/lib/api/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const POLL_MS = 15_000;
const ACK_KEY = "talak_grant_acknowledged";

interface GrantNotice {
  id: string;
  tier: string;
  message: string;
}

function loadAcknowledged(): Set<string> {
  try {
    const raw = localStorage.getItem(ACK_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveAcknowledged(set: Set<string>) {
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify([...set]));
  } catch {
    // ignore storage errors
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { activeProject } = useWorkspace();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [grant, setGrant] = useState<GrantNotice | null>(null);
  const acknowledgedRef = useRef<Set<string>>(loadAcknowledged());

  const dismissGrant = () => {
    if (grant) {
      const next = new Set(acknowledgedRef.current);
      next.add(grant.id);
      acknowledgedRef.current = next;
      saveAcknowledged(next);
    }
    setGrant(null);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function poll() {
      try {
        const [n, list] = await Promise.all([
          notificationsApi.unreadCount(user.id, activeProject?.id ?? null),
          notificationsApi.list(user.id, activeProject?.id ?? null, 8),
        ]);
        if (cancelled) return;
        setCount(n);
        setItems(list);

        // Find the newest admin-grant event. Show the modal the first time it is
        // seen (works on first load / when the site is opened), then remember it
        // so it doesn't re-prompt until the next grant.
        const top = list[0];
        if (top && top.type === "system" && top.metadata?.admin_granted === true) {
          if (!acknowledgedRef.current.has(top.id)) {
            const tier = top.message.match(/upgraded to ([A-Za-z]+)/i)?.[1] ?? "";
            setGrant({ id: top.id, tier, message: top.message });
          }
        }
      } catch {
        // ignore transient errors
      }
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user, activeProject]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-7 w-7" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.length === 0 && (
            <DropdownMenuItem disabled className="text-muted-foreground text-[12px]">
              No recent activity
            </DropdownMenuItem>
          )}
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex flex-col items-start gap-0.5 py-2"
              onClick={() => navigate(`/notifications/${item.id}`)}
            >
              <span className="line-clamp-2 whitespace-normal text-[12.5px]">{item.message}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{item.type}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/notifications")} className="justify-center text-[12px] font-medium">
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Grant modal — blurred backdrop */}
      <DialogPrimitive.Root
        open={!!grant}
        onOpenChange={(open) => { if (!open) dismissGrant(); }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 focus:outline-none">
            <div className="flex flex-col items-center text-center space-y-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-success/30 bg-success/10">
                <Sparkles className="h-7 w-7 text-success" />
              </span>
              <div className="space-y-1.5">
                <DialogPrimitive.Title className="text-xl font-[600] tracking-[-0.01em]">
                  Plan upgraded
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-[13px] text-muted-foreground leading-relaxed">
                  You're now on the{" "}
                  <span className="font-semibold text-foreground">{grant?.tier ? `${grant.tier} plan` : "new plan"}</span>.
                  An admin upgraded your account — the change is active immediately.
                </DialogPrimitive.Description>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
              {grant && (
                <Button variant="outline" size="sm" onClick={() => { dismissGrant(); navigate(`/notifications/${grant.id}`); }}>
                  View details
                </Button>
              )}
              <Button size="sm" onClick={dismissGrant}>Great, thanks</Button>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
