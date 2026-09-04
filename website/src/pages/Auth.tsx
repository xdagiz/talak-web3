import { useState, useEffect } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, ArrowRight, ShieldCheck, Zap, KeyRound } from "lucide-react";
import { StackedLogo } from "@/components/StackedLogo";
import { TalakMark } from "@/components/TalakMark";
import { CodeBlock } from "@/components/CodeBlock";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WALLET_LOGOS } from "@/components/WalletLogos";
import { CHAINS } from "@/data/chains";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SIWE_PREVIEW = `talak-web3 wants you to sign in with your Ethereum account:
0xA1B2…c3D4

Authenticate to talak-web3 and unlock the dashboard.

URI: https://talak-web3.dev
Version: 1
Chain ID: 1
Nonce: 9f3c2e1a-4b7d-48a6-bd16-1e2f3a4b5c6d
Issued At: ${new Date().toISOString()}`;

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "login";
  const plan = searchParams.get("plan");
  const redirect = searchParams.get("redirect");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(mode === "signup" ? "signup" : "login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    if (mode === "signup") {
      setActiveTab("signup");
    } else {
      setActiveTab("login");
    }
  }, [mode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to={redirect || "/dashboard"} replace />;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectTo = redirect ? `${window.location.origin}${redirect}` : window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unable to start Google sign-in.";
      toast({ title: "Google sign-in failed", description: msg, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast({ title: "Welcome back!" });
      // Navigation will be handled by the Navigate component above
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Invalid credentials.";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(signupEmail, signupPassword, signupName);
      toast({ title: "Account created", description: "Check your email to confirm your account." });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Could not create account.";
      toast({ title: "Signup failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col lg:flex-row overflow-hidden">
      {/* ───────── LEFT: brand / marketing panel ───────── */}
      <aside className="relative lg:flex-1 lg:max-w-[58%] border-b lg:border-b-0 lg:border-r border-border bg-card/40 overflow-hidden">
        {/* ambient grid lines */}
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
        {/* radial glow */}
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
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to site
            </Link>
          </div>

          {/* Headline */}
          <div className="mt-12 lg:mt-20 max-w-[520px]">
            <p className="text-[12px] uppercase tracking-[0.18em] font-mono text-foreground/50 mb-5">
              <span className="text-foreground/65">⌥</span> sign in · sign up
            </p>
            <h1 className="text-[clamp(1.8rem,3.4vw,2.9rem)] font-[500] leading-[1.1] tracking-[-0.035em]">
              The Web3 control plane,<br />in one account.
            </h1>
            <p className="mt-5 text-[14px] text-muted-foreground leading-relaxed max-w-[440px]">
              SIWE auth, multi-chain RPC failover, and realtime telemetry — all behind a single
              talak-web3 login. No vendor lock, no juggling dashboards.
            </p>

            {/* Feature pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { Icon: ShieldCheck, label: "EIP-4361 SIWE" },
                { Icon: Zap,         label: "Realtime dashboard" },
                { Icon: KeyRound,    label: "Per-key RPC quotas" },
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

          {/* Terminal-style SIWE preview */}
          <div className="mt-10 hidden md:block max-w-[560px]">
            <div className="rounded-md border border-border bg-background/60 backdrop-blur-sm overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 h-8 px-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                </div>
                <span className="ml-2 text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  siwe-message.txt
                </span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground/70">
                  signed locally · never leaves your wallet
                </span>
              </div>
              <CodeBlock
                code={SIWE_PREVIEW}
                language="ts"
                showLineNumbers={false}
                className="border-0 rounded-none bg-transparent text-[11.5px]"
              />
            </div>
          </div>

          {/* Wallet logos + chain pills strip */}
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

      {/* ───────── RIGHT: auth form ───────── */}
      <main className="relative flex-1 flex flex-col">
        {/* Top-right utilities */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-2">
          <ThemeToggle />
        </div>
        <Link
          to="/"
          className="sm:hidden absolute top-5 left-5 z-10 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px] space-y-7">
            {/* Mark + welcome */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-md border border-border bg-card/50 flex items-center justify-center">
                <TalakMark className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[20px] font-medium tracking-[-0.02em]">
                  Welcome to talak-web3
                </h2>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  Sign in to your account or create a new one.
                </p>
              </div>
            </div>

            {/* Google */}
            <Button
              variant="outline"
              className="w-full h-10 gap-2 text-[13px]"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10.5px] uppercase tracking-[0.16em]">
                <span className="bg-background px-3 text-muted-foreground font-mono">or with email</span>
              </div>
            </div>

            {/* Email auth */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 h-9 p-0.5">
                <TabsTrigger value="login" className="text-[12px]">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="text-[12px]">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Email</Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px]">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-[10.5px] text-muted-foreground hover:text-foreground"
                        style={{ color: "var(--brand-cyan)" }}
                      >
                        Forgot?
                      </Link>
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <Button type="submit" className="w-full h-9 text-[13px] gap-1.5" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Sign in
                    {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignup} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Full name</Label>
                    <Input
                      type="text"
                      placeholder="Jane Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      autoComplete="name"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Email</Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Password</Label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <Button type="submit" className="w-full h-9 text-[13px] gap-1.5" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create account
                    {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                  <p className="text-[10.5px] text-muted-foreground leading-snug pt-1">
                    By creating an account you agree to the talak-web3{" "}
                    <Link to="/" className="underline underline-offset-2 hover:text-foreground">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/" className="underline underline-offset-2 hover:text-foreground">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              </TabsContent>
            </Tabs>
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
