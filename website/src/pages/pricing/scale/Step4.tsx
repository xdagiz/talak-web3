import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Bell, AlertTriangle } from "lucide-react";

export default function ScaleStep4() {
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
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-mono">
            4
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            5
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Set realtime alerting
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Configure activity monitoring and webhooks for proactive incident detection and response.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alert Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Alert Channels</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Email notifications</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Slack integration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">PagerDuty</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Custom webhook</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Slack Webhook URL</label>
                  <input 
                    type="url" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Alert Severity Levels</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Critical (Service down)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">High (Performance degradation)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Medium (Usage warnings)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Low (Informational)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Monitoring Metrics</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px]">Response time threshold</span>
                  <select className="px-2 py-1 border border-border rounded text-sm">
                    <option value="100">100ms</option>
                    <option value="200">200ms</option>
                    <option value="500">500ms</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px]">Error rate threshold</span>
                  <select className="px-2 py-1 border border-border rounded text-sm">
                    <option value="1">1%</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px]">Usage warning at</span>
                  <select className="px-2 py-1 border border-border rounded text-sm">
                    <option value="80">80%</option>
                    <option value="90">90%</option>
                    <option value="95">95%</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px]">Node failover timeout</span>
                  <select className="px-2 py-1 border border-border rounded text-sm">
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                    <option value="120">120s</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alert Rules
              </h3>
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">High Response Time</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Alert when avg response time &gt; 200ms for 5 minutes
                  </p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Error Rate Spike</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Alert when error rate &gt; 5% for 2 minutes
                  </p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Usage Limit Warning</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Alert when monthly usage &gt; 80% of limit
                  </p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Node Failover</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Alert when automatic failover occurs
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Incident Response:</h3>
              <div className="space-y-3">
                <div className="border border-border rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Automated Actions</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Auto-scale connections on high load</li>
                    <li>• Route traffic to healthy nodes</li>
                    <li>• Enable caching during spikes</li>
                    <li>• Trigger backup systems</li>
                  </ul>
                </div>
                <div className="border border-border rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Escalation Rules</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Level 1: Initial alert (5 min)</li>
                    <li>• Level 2: Escalate to team (15 min)</li>
                    <li>• Level 3: Critical alert (30 min)</li>
                    <li>• Level 4: Management notification (1 hr)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/scale/step/5')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                Configure Alerts & Continue
              </button>
              <button
                onClick={() => navigate('/pricing/scale/step/3')}
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
