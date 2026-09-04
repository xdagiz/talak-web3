import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, FileText, Shield } from "lucide-react";

export default function EnterpriseStep1() {
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
            Scope requirements
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Review compliance, data residency, and integration needs for your enterprise deployment.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Requirements Assessment
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Organization Size</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="small">Small (50-500 employees)</option>
                    <option value="medium">Medium (500-5000 employees)</option>
                    <option value="large">Large (5000+ employees)</option>
                    <option value="enterprise">Enterprise (10000+ employees)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Industry Sector</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="finance">Financial Services</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="government">Government</option>
                    <option value="technology">Technology</option>
                    <option value="retail">Retail & E-commerce</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Expected Transaction Volume</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="low">Low (&lt; 1M/month)</option>
                    <option value="medium">Medium (1M-10M/month)</option>
                    <option value="high">High (10M-100M/month)</option>
                    <option value="ultra">Ultra (100M+/month)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Primary Use Cases</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">DeFi protocols</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">NFT platforms</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Gaming & Metaverse</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Supply chain</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Digital identity</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Technical Requirements</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Deployment Preference</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="cloud">Cloud (AWS, GCP, Azure)</option>
                    <option value="onprem">On-premises</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="vpc">Private VPC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Integration Requirements</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">SAP integration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Salesforce integration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Custom ERP systems</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">API gateway integration</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance & Security
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Required Compliance Standards</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">SOC 2 Type II</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">ISO 27001</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">GDPR</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">HIPAA</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">PCI DSS</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Data Residency Requirements</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="global">Global (no restrictions)</option>
                    <option value="us">United States only</option>
                    <option value="eu">European Union only</option>
                    <option value="specific">Specific countries</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Security Clearance Level</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="standard">Standard commercial</option>
                    <option value="federal">Federal contractor</option>
                    <option value="defense">Defense contractor</option>
                    <option value="classified">Classified systems</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Enterprise Features:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Unlimited everything</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>On-prem or VPC deployment</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Custom contracts & DPA</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Security review + pen test</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Indefinite event retention</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Dedicated solutions architect</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Next Steps:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full border border-border inline-flex items-center justify-center text-[11px] font-mono">
                    2
                  </div>
                  <span className="text-[13px]">Architecture workshop</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full border border-border inline-flex items-center justify-center text-[11px] font-mono">
                    3
                  </div>
                  <span className="text-[13px]">Security review</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full border border-border inline-flex items-center justify-center text-[11px] font-mono">
                    4
                  </div>
                  <span className="text-[13px]">Migration & cutover</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/enterprise/step/2')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                Submit Requirements & Continue
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Our enterprise team will review your requirements and contact you within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
