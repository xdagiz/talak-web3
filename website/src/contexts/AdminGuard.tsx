import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Calls the `has_role(_role, _user_id)` SQL function defined in
 *  migration 0001. Returns null while the check is pending. */
export function useIsAdmin(): boolean | null {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }

    (async () => {
      try {
        // Prefer RPC if available
        const rpc = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (!cancelled && !rpc.error && typeof rpc.data === "boolean") {
          setIsAdmin(rpc.data);
          return;
        }
      } catch { /* fall through */ }

      // Fallback: query user_roles directly
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(Boolean(data));
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  return isAdmin;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const location = useLocation();

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to="/admin/login?denied=1" replace />;
  return <>{children}</>;
}
