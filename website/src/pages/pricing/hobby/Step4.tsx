import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Zap, BarChart3, ExternalLink } from "lucide-react";

export default function HobbyStep4() {
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
            Send your first event
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Test your integration by sending a test event and verify it appears in your activity dashboard.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Test Event Code
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium mb-2">Send a test RPC call:</p>
                  <div className="bg-muted rounded-md p-3">
                    <pre className="text-[11px] font-mono overflow-x-auto">
{`// Test basic RPC call
try {
  const blockNumber = await talak.rpc.getBlockNumber();
  console.log('Current block:', blockNumber);
  
  // Track the event
  await talak.events.track({
    event: 'rpc_call_test',
    data: { blockNumber },
    timestamp: new Date().toISOString()
  });
  
  console.log('Event tracked successfully!');
} catch (error) {
  console.error('Test failed:', error);
}`}
                    </pre>
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-medium mb-2">Test SIWE authentication:</p>
                  <div className="bg-muted rounded-md p-3">
                    <pre className="text-[11px] font-mono overflow-x-auto">
{`// Test SIWE auth
import { SIWE } from '@dagimabebe/talak-web3';

const siwe = new SIWE(talak);
const message = await siwe.createMessage({
  address: '0x...',
  domain: 'your-dapp.com',
  uri: 'https://your-dapp.com',
  version: '1',
  chainId: 1
});

console.log('SIWE message created:', message);`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Verify in Dashboard
              </h2>
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Check your activity:</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Navigate to your dashboard</li>
                    <li>• Click on "Activity" tab</li>
                    <li>• Look for your test events</li>
                    <li>• Verify RPC call logs</li>
                  </ul>
                </div>
                <button className="w-full h-9 border border-border text-[12px] rounded-md hover:border-foreground/50 transition-colors flex items-center justify-center gap-2">
                  <ExternalLink className="h-3 w-3" />
                  Open Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Setup Complete! 🎉</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Account created and verified</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Project initialized with unique ID</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>SDK installed and configured</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>First events sent and verified</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Your Hobby Tier Benefits:</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Daily RPC calls</span>
                  <span className="text-[13px] font-mono">5,000 / day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Projects</span>
                  <span className="text-[13px] font-mono">1 project</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Supported chains</span>
                  <span className="text-[13px] font-mono">8 networks</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Event retention</span>
                  <span className="text-[13px] font-mono">30 days</span>
                </div>
              </div>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 text-success">Ready to build?</h3>
              <p className="text-[13px] text-muted-foreground mb-4">
                Your talak-web3 setup is complete! Start building your dApp with full access to our Web3 infrastructure.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => window.open('https://docs.talak-web3.dev', '_blank')}
                  className="w-full h-10 border border-border text-[13px] rounded-md hover:border-foreground/50 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Documentation
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/hobby/step/3')}
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
