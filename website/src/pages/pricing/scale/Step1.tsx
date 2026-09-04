import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { StripeCheckout } from "@/components/StripeCheckout";
import { CryptoCheckout } from "@/components/CryptoCheckout";
import { recordSubscription, getMySubscription, isAdminGranted } from "@/integrations/supabase/subscriptions";
import { recordStepProgress, completeStep } from "@/integrations/supabase/step-progress";
import { getPricingTier, getTierLimits, getTierSupport, getTierInfrastructure } from "@/data/pricing-config";
import { PaymentService, type PaymentData } from "@/services/payment-service";
import { ArrowLeft, ArrowRight, Check, Zap, TrendingUp, Lock, AlertCircle, Loader2, RefreshCw } from "lucide-react";

// Add error boundary wrapper
class StepErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ScaleStep1 error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error loading step</h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'Something went wrong'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ScaleStep1Component() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [showCryptoCheckout, setShowCryptoCheckout] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());
  const [formData, setFormData] = useState({
    organizationName: '',
    expectedVolume: '',
    technicalContact: '',
    billingEmail: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [granted, setGranted] = useState(false);
  const paymentService = PaymentService.getInstance();

  useEffect(() => {
    // Detect an admin-granted (free, active) scale plan so we can skip payment.
    getMySubscription().then(sub => {
      setGranted(isAdminGranted(sub));
    }).catch(() => setGranted(false));
  }, []);

  useEffect(() => {
    // Initialize component and record step start
    const timer = setTimeout(() => {
      setIsLoading(false);
      setStepStartTime(Date.now());
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveStepProgress = async () => {
    await recordStepProgress({
      tier: 'scale',
      stepNumber: 1,
      stepData: {
        ...formData,
        paymentMethod,
        paymentCompleted
      },
      isCompleted: false,
      timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
    });
  };

  const handlePaymentSuccess = async () => {
    setPaymentCompleted(true);
    setShowStripeCheckout(false);
    setShowCryptoCheckout(false);
    
    // Record subscription in Supabase
    await recordSubscription({
      tier: 'scale',
      billingPeriod: 'monthly',
      seats: 1,
      amountCents: 9900, // $99.00
      currency: 'usd',
      paymentMethod: paymentMethod === 'card' ? 'stripe' : 'crypto',
      status: 'trialing',
      metadata: {
        paymentMethod,
        completedAt: new Date().toISOString(),
        step: 1
      }
    });
    
    // Complete step 1
    await completeStep('scale', 1, {
      paymentMethod,
      paymentCompleted: true,
      completedAt: new Date().toISOString(),
      timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
    });
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setShowStripeCheckout(false);
    setShowCryptoCheckout(false);
  };

  const completeGrantedStepOne = async () => {
    setIsProcessing(true);
    try {
      await completeStep('scale', 1, {
        ...formData,
        paymentCompleted: true,
        adminGranted: true,
        completedAt: new Date().toISOString(),
        timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
      });
      navigate('/pricing/scale/step/2');
    } catch (err) {
      setError('Failed to complete step');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading payment options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="max-w-md p-6 border border-border rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Payment Error</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-foreground text-background text-sm rounded-md hover:bg-foreground/90"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scaleTier = getPricingTier('scale') || {
    key: "scale",
    name: "Scale",
    price: "$99",
    cadence: "/ mo, base",
    blurb: "For high-volume production workloads."
  };

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
          <div className="h-px bg-border flex-1" />
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-[12px] font-mono text-muted-foreground">
            5
          </div>
        </div>

        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            Activate Scale trial
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Enable your Scale plan trial with high monthly RPC allowance and dedicated infrastructure for production workloads.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Scale Plan Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Organization Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="Your Enterprise Company"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Expected Monthly RPC Volume</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="10m-20m">10M - 20M calls</option>
                    <option value="20m-50m">20M - 50M calls</option>
                    <option value="50m+">50M+ calls</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Primary Use Case</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md text-sm">
                    <option value="defi">DeFi Application</option>
                    <option value="gaming">Blockchain Gaming</option>
                    <option value="nft">NFT Marketplace</option>
                    <option value="infrastructure">Infrastructure Service</option>
                    <option value="enterprise">Enterprise Integration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2">Technical Contact</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="tech-lead@company.com"
                  />
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h2 className="text-[18px] font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage Estimates
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Base monthly allowance</span>
                  <span className="text-[13px] font-mono">10M calls</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Overage rate</span>
                  <span className="text-[13px] font-mono">$0.01 per 1K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">Dedicated nodes</span>
                  <span className="text-[13px] font-mono">Included</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">SLA guarantee</span>
                  <span className="text-[13px] font-mono">99.9%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Scale Plan Benefits:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>10M RPC calls per month included</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Unlimited projects</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Dedicated RPC nodes</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>SOC 2 Type II report</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>1-year event retention</span>
                </li>
                <li className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                  <span>Slack channel + 1h SLA</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3">Infrastructure Features:</h3>
              <div className="space-y-3">
                <div className="border border-border rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Dedicated RPC Nodes</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Isolated infrastructure</li>
                    <li>• Custom node configuration</li>
                    <li>• Geographic distribution</li>
                    <li>• Load balancing</li>
                  </ul>
                </div>
                <div className="border border-border rounded-md p-3">
                  <p className="text-[12px] font-medium mb-2">Performance Monitoring</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    <li>• Real-time metrics</li>
                    <li>• Custom dashboards</li>
                    <li>• Performance alerts</li>
                    <li>• Historical analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-[16px] font-medium mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {granted ? 'Plan granted — no payment needed' : 'Payment Required'}
              </h3>
              <div className="space-y-3">
                {granted ? (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="text-[12px] font-medium text-emerald-800">
                            Your Scale plan was granted by the team and is already active.
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-1">
                            No payment is required. Continue to set up your Scale configuration.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={completeGrantedStepOne}
                      disabled={isProcessing}
                      className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Continue to Setup
                    </button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Your plan is active. You'll continue past payment to the remaining setup steps.
                    </p>
                  </>
                ) : (
                  <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-medium text-yellow-800">Payment Required</p>
                      <p className="text-[11px] text-yellow-700 mt-1">
                        Complete payment to activate your Scale plan and access dedicated infrastructure.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      className="text-sm" 
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                    />
                    <span className="text-[13px]">Credit Card (Stripe)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      className="text-sm" 
                      checked={paymentMethod === 'crypto'}
                      onChange={() => setPaymentMethod('crypto')}
                    />
                    <span className="text-[13px]">Cryptocurrency (USDC, USDT)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="payment" 
                      className="text-sm" 
                      checked={paymentMethod === 'wire'}
                      onChange={() => setPaymentMethod('wire')}
                    />
                    <span className="text-[13px]">Wire Transfer</span>
                  </label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px]">Trial Duration</span>
                    <span className="text-[13px] font-mono">30 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px]">Monthly Cost</span>
                    <span className="text-[13px] font-mono">$99 + usage</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px]">Setup Fee</span>
                    <span className="text-[13px] font-mono">Waived</span>
                  </div>
                </div>
                  </>
                )}
              </div>
            </div>

            {!granted && (
            <div className="space-y-3">
              {!paymentCompleted ? (
                <>
                  <button
                    onClick={() => {
                      if (paymentMethod === 'card') {
                        setShowStripeCheckout(true);
                      } else if (paymentMethod === 'crypto') {
                        setShowCryptoCheckout(true);
                      } else {
                        // Handle wire transfer
                        alert('Wire transfer instructions will be sent to your email.');
                      }
                    }}
                    className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors"
                  >
                    {paymentMethod === 'card' ? 'Pay with Credit Card' : 
                     paymentMethod === 'crypto' ? 'Pay with Cryptocurrency' : 
                     'Request Wire Transfer'}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Payment required to activate your Scale plan. No setup fees.
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/pricing/scale/step/2')}
                    className="w-full h-10 bg-success text-success-foreground text-[13px] rounded-md hover:bg-success/90 transition-colors"
                  >
                    <Check className="h-4 w-4 inline mr-2" />
                    Payment Complete - Continue Setup
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Payment successful! Your Scale plan is now active.
                  </p>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Payment Checkout Modals */}
      <StripeCheckout
        open={showStripeCheckout}
        onOpenChange={setShowStripeCheckout}
        tier={scaleTier}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
      
      <CryptoCheckout
        open={showCryptoCheckout}
        onOpenChange={setShowCryptoCheckout}
        tier={scaleTier}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
}

export default function ScaleStep1() {
  return (
    <StepErrorBoundary>
      <ScaleStep1Component />
    </StepErrorBoundary>
  );
}
