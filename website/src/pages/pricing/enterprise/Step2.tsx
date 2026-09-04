import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Users, Network } from "lucide-react";

export default function EnterpriseStep2() {
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
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-mono">
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
            Architecture workshop
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Design your VPC/on-prem deployment and key management model with our solutions architects.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Network className="h-5 w-5" />
                Infrastructure Design
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Deployment Architecture</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="single">Single region</option>
                    <option value="multi">Multi-region active-active</option>
                    <option value="hybrid">Hybrid cloud + on-prem</option>
                    <option value="edge">Edge computing distribution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Network Topology</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="star">Star topology</option>
                    <option value="mesh">Full mesh network</option>
                    <option value="hub">Hub-and-spoke</option>
                    <option value="custom">Custom topology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Load Balancing Strategy</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="round-robin">Round robin</option>
                    <option value="weighted">Weighted distribution</option>
                    <option value="geo">Geographic routing</option>
                    <option value="health">Health-based routing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">High Availability Requirements</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">99.99% uptime SLA</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Automatic failover</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Disaster recovery site</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Multi-cloud redundancy</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Storage & Database</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Database Type</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="oracle">Oracle</option>
                    <option value="sqlserver">SQL Server</option>
                    <option value="nosql">NoSQL (MongoDB/Cassandra)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Data Retention Policy</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="indefinite">Indefinite retention</option>
                    <option value="7years">7 years</option>
                    <option value="10years">10 years</option>
                    <option value="custom">Custom retention policy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Backup Strategy</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Real-time replication</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Hourly snapshots</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Cross-region backups</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Key Management Model
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Key Management System</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="aws-kms">AWS KMS</option>
                    <option value="azure-kv">Azure Key Vault</option>
                    <option value="gcp-kms">Google Cloud KMS</option>
                    <option value="hashicorp">HashiCorp Vault</option>
                    <option value="onprem">On-premises HSM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Encryption Standards</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">AES-256 encryption at rest</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">TLS 1.3 in transit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">End-to-end encryption</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Hardware security modules</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Access Control Model</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="rbac">Role-Based Access Control (RBAC)</option>
                    <option value="abac">Attribute-Based Access Control (ABAC)</option>
                    <option value="ldap">LDAP/Active Directory</option>
                    <option value="saml">SAML SSO</option>
                    <option value="oauth">OAuth 2.0/OIDC</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Workshop Schedule:</h3>
              <div className="space-y-3">
                <div className="border border-border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[12px] font-medium">Discovery Session</p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-1 rounded">2 hours</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Technical requirements gathering and stakeholder interviews
                  </p>
                </div>
                <div className="border border-border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[12px] font-medium">Architecture Design</p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-1 rounded">4 hours</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    System design and infrastructure planning
                  </p>
                </div>
                <div className="border border-border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[12px] font-medium">Security Review</p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-1 rounded">2 hours</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Security controls and compliance validation
                  </p>
                </div>
                <div className="border border-border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[12px] font-medium">Implementation Planning</p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-1 rounded">2 hours</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Project timeline and resource allocation
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/enterprise/step/3')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                Schedule Workshop & Continue
              </button>
              <button
                onClick={() => navigate('/pricing/enterprise/step/1')}
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
