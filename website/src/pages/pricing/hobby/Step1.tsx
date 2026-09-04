import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Mail, User } from "lucide-react";

export default function HobbyStep1() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      
      <main className="mx-auto max-w-[900px] px-6 py-16">
        <div className="mb-8">
          <Link 
            to="/pricing/hobby/steps" 
            className="inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to setup steps
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-mono">
            1
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            2
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            3
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            4
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Create your account
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Sign up and verify your email to start using talak-web3 for your weekend dApps and side-projects.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Password</label>
                  <input 
                    type="password" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="Create a strong password"
                  />
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Verification
              </h2>
              <p className="text-[13px] text-muted-foreground mb-4">
                We'll send a verification link to your email address. Click the link to activate your account.
              </p>
              <div className="bg-muted/30 rounded-md p-3">
                <p className="text-[12px] text-muted-foreground">
                  ✓ Verification email sent automatically<br />
                  ✓ Link expires in 24 hours<br />
                  ✓ Check spam folder if not received
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">What you get with Hobby tier:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Up to 5,000 RPC calls per day</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>1 project with 1 environment</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>SIWE authentication + 8 chains</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Community Discord support</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>30-day event retention</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Ready to start?</h3>
              <p className="text-[13px] text-muted-foreground mb-4">
                No credit card required. Start building immediately with free tier benefits.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/pricing/hobby/step/2')}
                  className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
                >
                  Create Account & Continue
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
