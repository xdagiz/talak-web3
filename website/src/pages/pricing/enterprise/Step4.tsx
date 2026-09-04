import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, ArrowRight as ArrowRightIcon, Crown, ExternalLink } from "lucide-react";

export default function EnterpriseStep4() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      
      <main className="mx-auto max-w-[900px] px-6 py-16">
        <div className="mb-8">
          <Link 
            to="/pricing/enterprise/steps" 
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
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-mono">
            4
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Migration and cutover
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Migrate your projects and verify realtime and billing continuity for your enterprise deployment.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Migration Strategy</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Migration Approach</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="bigbang">Big bang cutover</option>
                    <option value="phased">Phased migration</option>
                    <option value="parallel">Parallel running</option>
                    <option value="bluegreen">Blue-green deployment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Migration Timeline</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="weekend">Weekend migration (48 hours)</option>
                    <option value="week">Week-long migration</option>
                    <option value="month">Month-long phased migration</option>
                    <option value="custom">Custom timeline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Rollback Plan</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="immediate">Immediate rollback</option>
                    <option value="graceful">Graceful degradation</option>
                    <option value="manual">Manual rollback process</option>
                    <option value="automated">Automated rollback triggers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Data Migration</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Historical data migration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Real-time data sync</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Incremental data migration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Data validation checks</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Cutover Planning</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Cutover Window</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="maintenance">Scheduled maintenance window</option>
                    <option value="lowtraffic">Low traffic period</option>
                    <option value="weekend">Weekend cutover</option>
                    <option value="businesshours">Business hours with hot standby</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Communication Plan</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Internal stakeholder notifications</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Customer notifications</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Public announcement</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Press release</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Success Criteria</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Zero data loss</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">&lt;5 minute downtime</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">All services operational</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Performance benchmarks met</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Migration Checklist:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Pre-migration testing complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Backup procedures verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Rollback plan documented</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Team training completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Communication plan approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Support team on standby</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Post-Migration Verification:</h3>
              <div className="space-y-3">
                <div className="border border-border rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Realtime Services</p>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>RPC endpoint connectivity</span>
                      <span className="text-success">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Event streaming</span>
                      <span className="text-success">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Webhook delivery</span>
                      <span className="text-success">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Authentication services</span>
                      <span className="text-success">✓</span>
                    </div>
                  </div>
                </div>
                <div className="border border-border rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Billing Continuity</p>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Usage tracking</span>
                      <span className="text-success">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Invoice generation</span>
                      <span className="text-success">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment processing</span>
                      <span className="text-success">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reporting accuracy</span>
                      <span className="text-success">✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Enterprise Support:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Dedicated solutions architect assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">24/7 premium support activated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Custom SLA agreements in place</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Regular review meetings scheduled</span>
                </div>
              </div>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 text-success flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Enterprise Setup Complete! 🎉
              </h3>
              <p className="text-[13px] text-muted-foreground mb-4">
                Your enterprise deployment is fully configured with custom architecture, security controls, and dedicated support ready for production.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
                >
                  Go to Enterprise Dashboard
                </button>
                <button
                  onClick={() => window.open('mailto:sales@talak-web3.dev', '_blank')}
                  className="w-full h-10 border border-border text-[13px] rounded-md hover:border-foreground/50 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Contact Solutions Architect
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/enterprise/step/3')}
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
