import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, CreditCard, BarChart3, Crown } from "lucide-react";

export default function ScaleStep5() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      
      <main className="mx-auto max-w-[900px] px-6 py-16">
        <div className="mb-8">
          <Link 
            to="/pricing/scale/steps" 
            className="inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to setup steps
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-full bg-success text-success-foreground flex items-center justify-center text-[12px] font-mono">
            ✓
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full bg-success text-success-foreground flex items-center justify-center text-[12px] font-mono">
            ✓
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full bg-success text-success-foreground flex items-center justify-center text-[12px] font-mono">
            ✓
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full bg-success text-success-foreground flex items-center justify-center text-[12px] font-mono">
            ✓
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-mono">
            5
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Validate billing and usage
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Confirm usage counters, billing history integrity, and payment setup for your Scale infrastructure.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Setup
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Payment Method</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="card">Credit Card (Stripe)</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="wire">Wire Transfer</option>
                    <option value="po">Purchase Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Billing Frequency</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (5% discount)</option>
                    <option value="annual">Annual (10% discount)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Billing Contact</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="billing@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Purchase Order (Optional)</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="PO-12345"
                  />
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Usage Monitoring</h2>
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[12px] font-medium">Current Month Usage</p>
                    <span className="text-[12px] font-mono">2.3M / 10M</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div className="bg-foreground h-2 rounded-full" style={{width: '23%'}}></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">23% of monthly allowance</p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[12px] font-medium">Projected Monthly Cost</p>
                    <span className="text-[12px] font-mono">$127.50</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Base plan</span>
                      <span>$99.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overage (2.3M calls)</span>
                      <span>$23.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dedicated nodes</span>
                      <span>$5.50</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Usage Analytics
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-md p-3">
                    <p className="text-[11px] text-muted-foreground">Avg Daily Calls</p>
                    <p className="text-[18px] font-[500]">76,667</p>
                    <p className="text-[10px] text-success">↑ 15% vs last week</p>
                  </div>
                  <div className="bg-muted/30 rounded-md p-3">
                    <p className="text-[11px] text-muted-foreground">Peak Hour</p>
                    <p className="text-[18px] font-[500]">14:00 UTC</p>
                    <p className="text-[10px] text-muted-foreground">125K calls/hr</p>
                  </div>
                  <div className="bg-muted/30 rounded-md p-3">
                    <p className="text-[11px] text-muted-foreground">Avg Response</p>
                    <p className="text-[18px] font-[500]">42ms</p>
                    <p className="text-[10px] text-success">↓ 8% improvement</p>
                  </div>
                  <div className="bg-muted/30 rounded-md p-3">
                    <p className="text-[11px] text-muted-foreground">Uptime</p>
                    <p className="text-[18px] font-[500]">99.97%</p>
                    <p className="text-[10px] text-success">Above SLA</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Billing Validation:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Usage counters synchronized</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Billing history verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Payment method validated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Tax configuration complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Invoice schedule set</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Scale Plan Summary:</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Base monthly fee</span>
                  <span className="text-[13px] font-mono">$99.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Included RPC calls</span>
                  <span className="text-[13px] font-mono">10,000,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Overage rate</span>
                  <span className="text-[13px] font-mono">$0.01/1K calls</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">SLA guarantee</span>
                  <span className="text-[13px] font-mono">99.9%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Support response</span>
                  <span className="text-[13px] font-mono">1 hour</span>
                </div>
              </div>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 text-success flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Scale Setup Complete! 🎉
              </h3>
              <p className="text-[13px] text-muted-foreground mb-4">
                Your Scale infrastructure is fully provisioned with dedicated nodes, monitoring, alerts, and billing ready for production workloads.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
                >
                  Go to Scale Dashboard
                </button>
                <button
                  onClick={() => navigate('/billing')}
                  className="w-full h-10 border border-border text-[13px] rounded-md hover:border-foreground/50 transition-colors"
                >
                  Manage Billing
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/scale/step/4')}
                className="w-full h-10 border border-border text-[13px] rounded-md hover:border-foreground/50 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
