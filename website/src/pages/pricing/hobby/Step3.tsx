import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Terminal, Package } from "lucide-react";

export default function HobbyStep3() {
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
            Install the SDK
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Add talak-web3 to your project and connect your app with your project ID.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Installation Commands
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium mb-2">Using npm:</p>
                  <div className="bg-muted rounded-md p-3">
                    <code className="text-[12px] font-mono">npm install @dagimabebe/talak-web3</code>
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-medium mb-2">Using yarn:</p>
                  <div className="bg-muted rounded-md p-3">
                    <code className="text-[12px] font-mono">yarn add @dagimabebe/talak-web3</code>
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-medium mb-2">Using pnpm:</p>
                  <div className="bg-muted rounded-md p-3">
                    <code className="text-[12px] font-mono">pnpm add @dagimabebe/talak-web3</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Basic Setup Code
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium mb-2">Import and initialize:</p>
                  <div className="bg-muted rounded-md p-3">
                    <pre className="text-[11px] font-mono overflow-x-auto">
{`import { TalakWeb3 } from '@dagimabebe/talak-web3';

const talak = new TalakWeb3({
  projectId: 'proj_hobby_2024_abc123def456',
  apiKey: 'your-api-key-here'
});`}
                    </pre>
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-medium mb-2">Example usage:</p>
                  <div className="bg-muted rounded-md p-3">
                    <pre className="text-[11px] font-mono overflow-x-auto">
{`// Get account balance
const balance = await talak.rpc.getBalance(
  '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
);

// Send transaction
const txHash = await talak.rpc.sendTransaction({
  to: '0x...',
  value: '1000000000000000000'
});`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">SDK Features:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>TypeScript support with full type definitions</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Multi-chain support (8 major networks)</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Built-in error handling and retries</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Event tracking and analytics</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>SIWE authentication helpers</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Installation Verification:</h3>
              <div className="space-y-3">
                <div className="bg-background border border-border rounded p-3">
                  <p className="text-[12px] font-mono mb-2">Test your installation:</p>
                  <div className="bg-muted rounded p-2">
                    <code className="text-[11px] font-mono">npx talak-web3 test</code>
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Run the test command to verify your SDK installation and project connection.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/hobby/step/4')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                SDK Installed & Continue
              </button>
              <button
                onClick={() => navigate('/pricing/hobby/step/2')}
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
