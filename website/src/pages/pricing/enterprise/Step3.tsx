import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Shield, FileSearch } from "lucide-react";

export default function EnterpriseStep3() {
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
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-mono">
            3
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            4
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Security review
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Complete threat model, penetration testing process, and security controls checklist for enterprise deployment.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Assessment
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Security Framework</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="nist">NIST Cybersecurity Framework</option>
                    <option value="iso27001">ISO 27001</option>
                    <option value="cis">CIS Controls</option>
                    <option value="custom">Custom framework</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Threat Model Scope</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Application layer threats</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Network infrastructure threats</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Data security threats</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Social engineering threats</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Supply chain threats</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Risk Assessment Level</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="standard">Standard assessment</option>
                    <option value="enhanced">Enhanced assessment</option>
                    <option value="comprehensive">Comprehensive assessment</option>
                    <option value="continuous">Continuous monitoring</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Penetration Testing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Testing Type</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="blackbox">Black box testing</option>
                    <option value="whitebox">White box testing</option>
                    <option value="graybox">Gray box testing</option>
                    <option value="redteam">Red team assessment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Testing Scope</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Web application security</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">API security testing</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Network penetration testing</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Mobile application testing</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Social engineering testing</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Testing Frequency</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="quarterly">Quarterly</option>
                    <option value="semiannual">Semi-annual</option>
                    <option value="annual">Annual</option>
                    <option value="ondemand">On-demand</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Security Controls Checklist
              </h3>
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Access Control</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Multi-factor authentication</li>
                    <li>• Role-based access control</li>
                    <li>• Privileged access management</li>
                    <li>• Session timeout controls</li>
                  </ul>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Data Protection</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Encryption at rest (AES-256)</li>
                    <li>• Encryption in transit (TLS 1.3)</li>
                    <li>• Data loss prevention</li>
                    <li>• Data classification</li>
                  </ul>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Network Security</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Firewall configuration</li>
                    <li>• Intrusion detection system</li>
                    <li>• DDoS protection</li>
                    <li>• VPN access controls</li>
                  </ul>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Monitoring & Logging</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-foreground"></div>
                    </label>
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Security incident monitoring</li>
                    <li>• Audit logging</li>
                    <li>• Real-time alerting</li>
                    <li>• Forensic analysis tools</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Compliance Validation:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">SOC 2 Type II controls verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">ISO 27001 framework implemented</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">GDPR data protection measures</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Industry-specific compliance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-[13px]">Third-party audit readiness</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/enterprise/step/4')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                Complete Security Review & Continue
              </button>
              <button
                onClick={() => navigate('/pricing/enterprise/step/2')}
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
