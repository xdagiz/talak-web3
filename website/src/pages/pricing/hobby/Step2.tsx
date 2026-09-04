import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, FolderOpen, Code } from "lucide-react";

export default function HobbyStep2() {
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
            Create your first project
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Generate a project ID from the dashboard to connect your dApp with talak-web3 services.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Project Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Project Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="My Weekend dApp"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Description</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm h-20"
                    placeholder="A brief description of your project"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Environment</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Code className="h-5 w-5" />
                Project Configuration
              </h2>
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-[12px] font-mono mb-2">Generated Project ID:</p>
                  <div className="bg-background border border-border rounded p-2 font-mono text-[11px] break-all">
                    proj_hobby_2024_abc123def456
                  </div>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-[12px] font-mono mb-2">API Endpoint:</p>
                  <div className="bg-background border border-border rounded p-2 font-mono text-[11px] break-all">
                    https://api.talak-web3.dev/v1/projects/proj_hobby_2024_abc123def456
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Project Setup Benefits:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Isolated environment for your dApp</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Unique project ID for authentication</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Dedicated RPC endpoints</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Activity tracking and analytics</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Next Steps Preview:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full border border-border inline-flex items-center justify-center text-[11px] font-mono">
                    3
                  </div>
                  <span className="text-[13px]">Install talak-web3 SDK</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full border border-border inline-flex items-center justify-center text-[11px] font-mono">
                    4
                  </div>
                  <span className="text-[13px]">Send your first event</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/hobby/step/3')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                Create Project & Continue
              </button>
              <button
                onClick={() => navigate('/pricing/hobby/step/1')}
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
