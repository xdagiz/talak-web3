import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2, Shield, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/contexts/AdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const { user, loading, signIn } = useAuth();
  const { toast } = useToast();
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const denied = new URLSearchParams(location.search).get("denied") === "1";

  useEffect(() => {
    document.title = "Admin · talak-web3";
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user && isAdmin === true) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast({ title: "Signed in", description: "Verifying admin role…" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign in.";
      toast({ title: "Sign-in failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[720px] grid md:grid-cols-2 border border-border rounded-md overflow-hidden">
        <div className="hidden md:flex flex-col justify-between p-8 bg-card/40 border-r border-border">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-foreground/10 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-foreground" />
              </div>
              <span className="text-[12px] font-medium tracking-[0.08em] uppercase text-foreground">
                talak-web3
              </span>
            </div>
            <h2 className="text-[24px] font-medium tracking-[-0.03em] leading-tight">
              Creator access for the admin console.
            </h2>
            <p className="text-[13px] text-muted-foreground max-w-[260px]">
              Manage blog posts, site settings, and members from a private talak-web3 workspace.
            </p>
          </div>
          <div className="space-y-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-foreground/30" /> Blog publishing</div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-foreground/30" /> Site control</div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-foreground/30" /> Admin-only routing</div>
          </div>
        </div>
        <div className="w-full p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-foreground/10 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-foreground" />
              </div>
              <span className="text-[12px] font-medium tracking-[0.08em] uppercase text-foreground">
                talak admin
              </span>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Restricted area. Sign in with an account that has the <code className="font-mono text-foreground">admin</code> role.
            </p>
          </div>

          {denied && (
            <div className="flex items-start gap-2 p-3 border border-destructive/30 bg-destructive/5 rounded text-[12px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
              <span>This account is signed in but does not have the admin role.</span>
            </div>
          )}

          {user && isAdmin === false && !denied && (
            <div className="flex items-start gap-2 p-3 border border-border bg-muted/40 rounded text-[12px] text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
              <span>Signed in as {user.email} — admin role not detected.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[12px]">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-8 text-[13px]"
                placeholder="admin@talak.dev"
                disabled={Boolean(user)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-8 text-[13px]"
                placeholder="••••••••"
                disabled={Boolean(user)}
              />
            </div>
            <Button type="submit" className="w-full h-8 text-[13px]" disabled={submitting || Boolean(user)}>
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {user ? "Already signed in" : "Sign in to admin"}
            </Button>
          </form>

          <div className="text-[11px] text-muted-foreground space-y-1">
            <p>
              Admin access is granted by inserting a row into <code className="font-mono">user_roles</code>{" "}
              with role <code className="font-mono">admin</code>.
            </p>
            <Link to="/" className="inline-flex items-center gap-1 text-foreground/70 hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
