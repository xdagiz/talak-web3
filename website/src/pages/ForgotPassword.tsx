import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, MailCheck, ShieldCheck, Zap, KeyRound } from "lucide-react";
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

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setSent(true);
      toast({
        title: "Check your inbox",
        description: "We sent you a link to reset your password.",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Could not send reset email.";
      toast({ title: "Reset failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col lg:flex-row overflow-hidden">
      {/* ───────── LEFT: brand / marketing panel ───────── */}
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
          {/* Top nav */}
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

          {/* Headline */}
          <div className="mt-12 lg:mt-20 max-w-[520px]">
            <p className="text-[12px] uppercase tracking-[0.18em] font-mono text-foreground/50 mb-5">
              <span className="text-foreground/65">⌥</span> account recovery
            </p>
            <h1 className="text-[clamp(1.8rem,3.4vw,2.9rem)] font-[500] leading-[1.1] tracking-[-0.035em]">
              Locked out?<br />We'll get you back in.
            </h1>
            <p className="mt-5 text-[14px] text-muted-foreground leading-relaxed max-w-[440px]">
              Enter the email associated with your talak-web3 account and we'll send you a secure,
              single-use link to reset your password — valid for one hour.
            </p>

            {/* Feature pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { Icon: ShieldCheck, label: "Single-use link" },
                { Icon: Zap,         label: "Arrives in ~30s" },
                { Icon: KeyRound,    label: "Expires in 1 hour" },
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

          {/* Recovery flow visual */}
          <div className="mt-10 hidden md:block max-w-[560px]">
            <div className="rounded-md border border-border bg-background/60 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 h-8 px-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                </div>
                <span className="ml-2 text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  recovery-flow.txt
                </span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground/70">
                  zero-knowledge · no plaintext stored
                </span>
              </div>
              <div className="p-4 font-mono text-[11.5px] text-foreground/80 leading-[1.8] space-y-1">
                <div><span className="text-foreground/40">01</span>  enter your account email</div>
                <div><span className="text-foreground/40">02</span>  we email a single-use recovery token</div>
                <div><span className="text-foreground/40">03</span>  click → set a fresh password</div>
                <div><span className="text-foreground/40">04</span>  all other sessions are revoked</div>
              </div>
            </div>
          </div>

          {/* Wallet logos + chain pills strip */}
          <div className="mt-auto pt-10">
            <p className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-foreground/45 mb-3">
              Or sign in with the wallet you already use
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
            {/* Mark + welcome */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-md border border-border bg-card/50 flex items-center justify-center">
                {sent ? <MailCheck className="h-6 w-6" /> : <TalakMark className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="text-[20px] font-medium tracking-[-0.02em]">
                  {sent ? "Check your inbox" : "Forgot your password?"}
                </h2>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {sent
                    ? "We just sent you a recovery link."
                    : "Enter your email and we'll send a reset link."}
                </p>
              </div>
            </div>

            {sent ? (
              <div className="space-y-4">
                <div className="rounded-md border border-border p-5 text-[13px] leading-[1.7]">
                  <p className="font-medium">A reset link is on its way.</p>
                  <p className="text-muted-foreground mt-1.5">
                    Click the link in the email we just sent to{" "}
                    <span className="font-mono text-foreground">{email}</span>.
                    If you don't see it within a minute, check your spam folder.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="w-full h-10 text-[13px]"
                >
                  Send another link
                </Button>
                <p className="text-[11.5px] text-muted-foreground text-center">
                  Remembered it?{" "}
                  <Link to="/auth" className="underline underline-offset-2 hover:text-foreground">
                    Sign in instead
                  </Link>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Email</Label>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-[13px]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 text-[13px] gap-1.5"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Send reset link
                  {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
                <p className="text-[11.5px] text-muted-foreground pt-1">
                  Remember your password?{" "}
                  <Link to="/auth" className="underline underline-offset-2 hover:text-foreground">
                    Sign in instead
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
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
