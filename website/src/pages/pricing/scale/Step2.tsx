import { Link, useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Server, Globe } from "lucide-react";

export default function ScaleStep2() {
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
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            5
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Provision dedicated RPC
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Configure your dedicated RPC provider strategy and failover mechanisms for high-availability infrastructure.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Server className="h-5 w-5" />
                Node Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Node Type</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="full">Full Node</option>
                    <option value="archive">Archive Node</option>
                    <option value="validator">Validator Node</option>
                    <option value="light">Light Node</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Number of Nodes</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="1">1 Node (Basic)</option>
                    <option value="3">3 Nodes (HA)</option>
                    <option value="5">5 Nodes (Enterprise)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Geographic Distribution</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="single">Single Region</option>
                    <option value="multi">Multi-Region</option>
                    <option value="global">Global Distribution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Supported Chains</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Ethereum Mainnet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" defaultChecked />
                      <span className="text-[13px]">Polygon</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Arbitrum</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="text-sm" />
                      <span className="text-[13px]">Optimism</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4">Failover Strategy</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Failover Mode</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                    <option value="weighted">Weighted Round Robin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Health Check Interval</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="30s">30 seconds</option>
                    <option value="60s">1 minute</option>
                    <option value="300s">5 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Response Timeout</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="5s">5 seconds</option>
                    <option value="10s">10 seconds</option>
                    <option value="30s">30 seconds</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Node Endpoints
              </h3>
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Primary Node</p>
                    <span className="text-[10px] bg-success/20 text-success px-2 py-1 rounded">Active</span>
                  </div>
                  <div className="bg-background border border-border rounded p-2 font-mono text-[11px] break-all">
                    https://eth-mainnet-1.talak-web3.dev/rpc
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Region: US East • Response: 45ms</p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Secondary Node</p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-1 rounded">Standby</span>
                  </div>
                  <div className="bg-background border border-border rounded p-2 font-mono text-[11px] break-all">
                    https://eth-mainnet-2.talak-web3.dev/rpc
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Region: EU West • Response: 67ms</p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Tertiary Node</p>
                    <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-1 rounded">Standby</span>
                  </div>
                  <div className="bg-background border border-border rounded p-2 font-mono text-[11px] break-all">
                    https://eth-mainnet-3.talak-web3.dev/rpc
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Region: AP Southeast • Response: 89ms</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Performance Specifications:</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Concurrent connections</span>
                  <span className="text-[13px] font-mono">10,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Requests per second</span>
                  <span className="text-[13px] font-mono">5,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Average response time</span>
                  <span className="text-[13px] font-mono">&lt;50ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Uptime SLA</span>
                  <span className="text-[13px] font-mono">99.9%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Data sync</span>
                  <span className="text-[13px] font-mono">Real-time</span>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Monitoring & Alerts:</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="text-sm" defaultChecked />
                  <span className="text-[13px]">Node health monitoring</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="text-sm" defaultChecked />
                  <span className="text-[13px]">Performance alerts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="text-sm" defaultChecked />
                  <span className="text-[13px]">Failover notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="text-sm" />
                  <span className="text-[13px]">Custom metrics dashboard</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing/scale/step/3')}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
              >
                Provision Nodes & Continue
              </button>
              <button
                onClick={() => navigate('/pricing/scale/step/1')}
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
