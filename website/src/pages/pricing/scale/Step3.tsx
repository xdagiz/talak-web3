import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Code, Database } from "lucide-react";

export default function ScaleStep3() {
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
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-mono">
            3
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            4
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            5
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Integrate backend API
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Connect your dApp backend to the talak-web3 API base URL with optimized configuration for high-volume workloads.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Integration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">API Base URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm font-mono"
                      value="https://api.talak-web3.dev/v1"
                      readOnly
                    />
                    <button className="px-3 py-2 border border-border rounded-md text-sm hover:border-foreground/50">
                      Copy
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Your dedicated Scale API endpoint
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Project ID</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border border-border rounded-md text-sm font-mono"
                      value="proj_scale_2024_xyz789abc456"
                      readOnly
                    />
                    <button className="px-3 py-2 border border-border rounded-md text-sm hover:border-foreground/50">
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Environment</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Backend Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Connection Pool Size</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="10">10 connections</option>
                    <option value="50">50 connections</option>
                    <option value="100">100 connections</option>
                    <option value="500">500 connections</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Request Timeout</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="5000">5 seconds</option>
                    <option value="10000">10 seconds</option>
                    <option value="30000">30 seconds</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Retry Strategy</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="exponential">Exponential Backoff</option>
                    <option value="linear">Linear Backoff</option>
                    <option value="none">No Retries</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Integration Code Examples:</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium mb-2">Node.js Backend:</p>
                  <div className="bg-muted rounded-md p-3">
                    <pre className="text-[11px] font-mono overflow-x-auto">
{`const { TalakWeb3 } = require('@dagimabebe/talak-web3');

const talak = new TalakWeb3({
  projectId: 'proj_scale_2024_xyz789abc456',
  apiKey: process.env.TALAK_API_KEY,
  baseUrl: 'https://api.talak-web3.dev/v1',
  connectionPool: {
    max: 100,
    timeout: 10000
  }
});`}
                    </pre>
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-medium mb-2">Python Backend:</p>
                  <div className="bg-muted rounded-md p-3">
                    <pre className="text-[11px] font-mono overflow-x-auto">
{`import talak_web3

client = talak_web3.TalakWeb3(
    project_id='proj_scale_2024_xyz789abc456',
    api_key=os.getenv('TALAK_API_KEY'),
    base_url='https://api.talak-web3.dev/v1',
    max_connections=100
)`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Performance Optimization
              </h3>
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Batch Requests</p>
                  <p className="text-[11px] text-muted-foreground">
                    Send up to 100 RPC calls in a single request for improved throughput.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Caching Strategy</p>
                  <p className="text-[11px] text-muted-foreground">
                    Implement Redis caching for frequently accessed data like block numbers.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Connection Management</p>
                  <p className="text-[11px] text-muted-foreground">
                    Use connection pooling and HTTP keep-alive for optimal performance.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">API Rate Limits:</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Requests per minute</span>
                  <span className="text-[13px] font-mono">30,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Concurrent connections</span>
                  <span className="text-[13px] font-mono">1,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Batch size limit</span>
                  <span className="text-[13px] font-mono">100 calls</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Payload size limit</span>
                  <span className="text-[13px] font-mono">10MB</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/scale/step/4')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                Test Integration & Continue
              </button>
              <button
                onClick={() => navigate('/pricing/scale/step/2')}
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
