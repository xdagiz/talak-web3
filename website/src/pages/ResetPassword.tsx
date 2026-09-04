import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, KeyRound, ShieldCheck, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StackedLogo } from "@/components/StackedLogo";
import { TalakMark } from "@/components/TalakMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WALLET_LOGOS } from "@/components/WalletLogos";
import { CHAINS } from "@/data/chains";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: "Password updated",
        description: "Sign in with your new password.",
      });
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Could not update password.";
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col lg:flex-row overflow-hidden">
      {/* ───────── LEFT: brand panel ───────── */}
      <aside className="relative lg:flex-1 lg:max-w-[58%] border-b lg:border-b-0 lg:border-r border-border bg-card/40 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at 30% 20%, black 0%, black 40%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full pointer-events-none blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, hsl(var(--foreground) / 0.10), transparent 65%)" }}
        />

        <div className="relative z-10 flex flex-col h-full p-6 sm:p-10 lg:p-14">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <StackedLogo size={20} />
              <span className="text-[14px] font-bold tracking-[0.08em] uppercase">
                talak-web3
              </span>
            </Link>
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>

          <div className="mt-12 lg:mt-20 max-w-[520px]">
            <p className="text-[12px] uppercase tracking-[0.18em] font-mono text-foreground/50 mb-5">
              <span className="text-foreground/65">⌥</span> set a new password
            </p>
            <h1 className="text-[clamp(1.8rem,3.4vw,2.9rem)] font-[500] leading-[1.1] tracking-[-0.035em]">
              Choose a new password<br />and you're back in.
            </h1>
            <p className="mt-5 text-[14px] text-muted-foreground leading-relaxed max-w-[440px]">
              Pick something at least 6 characters long. As soon as you save it, every other active
              session for your account will be signed out for safety.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { Icon: ShieldCheck, label: "Sessions revoked" },
                { Icon: Lock,        label: "Hashed with Argon2" },
                { Icon: Zap,         label: "Active immediately" },
              ].map(({ Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11.5px] font-mono border border-border bg-background/40 text-foreground/80 rounded-sm"
                >
                  <Icon className="h-3 w-3 text-foreground/55" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 hidden md:block max-w-[560px]">
            <div className="rounded-md border border-border bg-background/60 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 h-8 px-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                </div>
                <span className="ml-2 text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  password-policy.txt
                </span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground/70">
                  zero-knowledge · we never see plaintext
                </span>
              </div>
              <div className="p-4 font-mono text-[11.5px] text-foreground/80 leading-[1.8] space-y-1">
                <div><span className="text-foreground/40">·</span>  minimum 6 characters</div>
                <div><span className="text-foreground/40">·</span>  letters, numbers, symbols all welcome</div>
                <div><span className="text-foreground/40">·</span>  no enforced rotation — pick one you'll remember</div>
                <div><span className="text-foreground/40">·</span>  hashed locally before transit</div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-10">
            <p className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-foreground/45 mb-3">
              Works with the wallets &amp; chains you already use
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {WALLET_LOGOS.slice(0, 6).map((w) => (
                <div
                  key={w.name}
                  title={w.name}
                  className="flex items-center gap-1.5 text-[11px] text-foreground/70"
                >
                  <w.Logo className="h-5 w-5" />
                  <span className="hidden sm:inline">{w.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {CHAINS.filter((c) => !c.testnet).slice(0, 8).map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 h-6 px-2 text-[10.5px] font-mono border bg-background/30 text-foreground/70 rounded-sm"
                  style={{ borderColor: `${c.accent}33` }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: c.accent }}
                  />
                  {c.shortName}
                </span>
              ))}
              <span className="inline-flex items-center h-6 px-2 text-[10.5px] font-mono text-foreground/50">
                + {CHAINS.length - 8} more
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ───────── RIGHT: form ───────── */}
      <main className="relative flex-1 flex flex-col">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-2">
          <ThemeToggle />
        </div>
        <Link
          to="/auth"
          className="sm:hidden absolute top-5 left-5 z-10 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px] space-y-7">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-md border border-border bg-card/50 flex items-center justify-center">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[20px] font-medium tracking-[-0.02em]">
                  Choose a new password
                </h2>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  At least 6 characters. We'll sign you out everywhere else.
                </p>
              </div>
            </div>

            {hasSession === false && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-[12.5px] leading-[1.6] text-destructive">
                This recovery link is missing or expired.{" "}
                <Link to="/forgot-password" className="underline">Request a new one</Link>.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-[12px]">New password</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-[13px]"
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Confirm new password</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-9 text-[13px]"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || hasSession === false}
                className="w-full h-9 text-[13px] gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Update password
                {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
              <p className="text-[11.5px] text-muted-foreground pt-1">
                Changed your mind?{" "}
                <Link to="/auth" className="underline underline-offset-2 hover:text-foreground">
                  Back to sign in
                </Link>
              </p>
            </form>
          </div>
        </div>

        <footer className="border-t border-border px-6 sm:px-10 py-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono">© {new Date().getFullYear()} talak-web3</span>
          <span className="hidden sm:inline-flex items-center gap-3">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-foreground/20">·</span>
            <Link to="/packages" className="hover:text-foreground transition-colors">Packages</Link>
            <span className="text-foreground/20">·</span>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
