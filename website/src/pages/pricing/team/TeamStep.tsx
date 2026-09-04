import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check, Users, Lock, AlertCircle, Loader2, RefreshCw, CreditCard, Bitcoin } from "lucide-react";
import { getStepConfig, getTierStepCount } from "@/data/step-config";
import { getPricingTier, getTierLimits, getTierSupport } from "@/data/pricing-config";
import { PaymentService, type PaymentData } from "@/services/payment-service";
import { StepGuardService, type StepAccessResult } from "@/services/step-guard";
import { recordStepProgress, completeStep } from "@/integrations/supabase/step-progress";
import { isAdminGranted } from "@/integrations/supabase/subscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { CryptoCheckout } from "@/components/CryptoCheckout";
import { StripeCheckout } from "@/components/StripeCheckout";

interface TeamStepProps {
  tierKey: string;
  stepNumber: number;
  accessResult: StepAccessResult;
  stepGuard: StepGuardService;
}

export function TeamStep({ tierKey, stepNumber, accessResult, stepGuard }: TeamStepProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | 'wire'>('card');
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [showCryptoCheckout, setShowCryptoCheckout] = useState(false);
  
  const paymentService = PaymentService.getInstance();
  const stepConfig = getStepConfig(tierKey);
  const tier = getPricingTier(tierKey);
  const grantedSub = isAdminGranted(accessResult.subscription);

  useEffect(() => {
    initializeStep();
  }, [stepNumber, tierKey]);

  const initializeStep = async () => {
    try {
      setIsLoading(true);
      setStepStartTime(Date.now());
      
      // Load existing step data only if user is authenticated
      if (user && accessResult.stepProgress) {
        // On the review step, merge data from all step rows (any state) so the
        // summary reflects what the user actually entered, including granted
        // users who filled steps out of order without marking them complete.
        const isReviewStep = stepNumber === getTierStepCount(tierKey);
        const sourceSteps = isReviewStep
          ? accessResult.stepProgress
          : accessResult.stepProgress.filter(s => s.step_number === stepNumber);

        const merged: Record<string, string> = {};
        sourceSteps
          .slice()
          .sort((a, b) => a.step_number - b.step_number)
          .forEach(s => {
            if (s.step_data) Object.assign(merged, s.step_data as Record<string, string>);
          });

        // Fall back to localStorage for org/email if step_progress has no rows.
        if (isReviewStep) {
          const savedData = localStorage.getItem(`stepData_${tierKey}`);
          if (savedData) {
            try { Object.assign(merged, JSON.parse(savedData)); }
            catch (error) { console.error('Failed to parse saved form data:', error); }
          }
        }

        setFormData(prev => ({ ...prev, ...merged }));

        const currentStepData = accessResult.stepProgress.find(s => s.step_number === stepNumber);
        if (currentStepData?.step_data) {
          setFormData(prev => ({ ...prev, ...(currentStepData.step_data as Record<string, string>) }));
          setStepCompleted(currentStepData.is_completed);
          if (currentStepData.step_data.paymentCompleted) {
            setPaymentStatus('completed');
            setTransactionId(currentStepData.step_data.transactionId);
          }
        }

        // Admin-granted users never pay, so show payment as completed.
        if (isAdminGranted(accessResult.subscription)) {
          setPaymentStatus('completed');
        }
      } else if (!user && stepNumber === 1) {
        // For unauthenticated users on Step 1, try to restore from localStorage
        const savedData = localStorage.getItem(`stepData_${tierKey}`);
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            setFormData(parsedData);
          } catch (error) {
            console.error('Failed to parse saved form data:', error);
          }
        }
      }
      
      setError(null);
    } catch (error) {
      setError('Failed to load step data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const saveStepProgress = async () => {
    // Only save progress if user is authenticated
    if (!user) {
      console.log('User not authenticated, skipping progress save');
      return;
    }

    try {
      await recordStepProgress({
        tier: tierKey,
        stepNumber,
        stepData: {
          ...formData,
          paymentCompleted: paymentStatus === 'completed',
          transactionId,
          paymentStatus,
          timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
        },
        isCompleted: stepCompleted,
        timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
      });
    } catch (error) {
      console.error('Failed to save step progress:', error);
    }
  };

  const validateStep = async (): Promise<boolean> => {
    const errors: string[] = [];

    // Dynamic validation based on step number
    switch (stepNumber) {
      case 1:
        // Payment step validation - allow completion without payment for new users
        if (!formData.billingEmail) errors.push('Billing email is required');
        if (!formData.organizationName) errors.push('Organization name is required');
        
        // Only require payment if user wants to proceed to Step 2
        // For completing Step 1 itself, payment is optional.
        // Admin-granted plans are pre-paid ($0, active) — never demand payment.
        const grantedSub = isAdminGranted(accessResult.subscription);
        if (tier?.payable && !grantedSub && accessResult.subscription && paymentStatus !== 'completed') {
          // User has subscription but payment not completed
          errors.push('Payment must be completed to proceed');
        }
        break;
      case 2:
        // API keys step validation - require active subscription
        if (!accessResult.subscription || accessResult.subscription.tier !== tierKey) {
          errors.push('Complete Step 1 payment first');
        } else if (tier?.payable && accessResult.subscription.status !== 'active' && accessResult.subscription.status !== 'trialing') {
          errors.push('Payment required to access this step');
        } else {
          if (!formData.apiKeyName) errors.push('API key name is required');
          if (!formData.apiKeyDescription) errors.push('API key description is required');
        }
        break;
      case 3:
        // Webhook step validation
        if (!accessResult.subscription || accessResult.subscription.tier !== tierKey) {
          errors.push('Complete Step 1 payment first');
        } else if (tier?.payable && accessResult.subscription.status !== 'active' && accessResult.subscription.status !== 'trialing') {
          errors.push('Payment required to access this step');
        } else {
          if (!formData.webhookUrl) errors.push('Webhook URL is required');
          if (!formData.webhookSecret) errors.push('Webhook secret is required');
        }
        break;
      case 4:
        // Team step validation
        if (!accessResult.subscription || accessResult.subscription.tier !== tierKey) {
          errors.push('Complete Step 1 payment first');
        } else if (tier?.payable && accessResult.subscription.status !== 'active' && accessResult.subscription.status !== 'trialing') {
          errors.push('Payment required to access this step');
        } else {
          if (!formData.teamMemberEmail) errors.push('Team member email is required');
          if (!formData.teamMemberRole) errors.push('Team member role is required');
        }
        break;
      case 5:
        // Final review step
        if (!accessResult.subscription || accessResult.subscription.tier !== tierKey) {
          errors.push('Complete Step 1 payment first');
        } else if (tier?.payable && accessResult.subscription.status !== 'active' && accessResult.subscription.status !== 'trialing') {
          errors.push('Payment required to access this step');
        }
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handlePaymentSuccess = (transactionId: string) => {
    setTransactionId(transactionId);
    setPaymentStatus('completed');
    setFormData(prev => ({ ...prev, paymentCompleted: true, transactionId }));
    
    // Clear step guard cache to refresh subscription status
    stepGuard.clearTierCache(tierKey);
    
    // Subscribe to real-time updates
    paymentService.subscribeToPaymentUpdates(transactionId, (update) => {
      if (update.success) {
        setPaymentStatus('completed');
        setStepCompleted(true);
        // Clear cache again when payment is confirmed
        stepGuard.clearTierCache(tierKey);
      } else {
        setPaymentStatus('failed');
        setError(update.error || 'Payment failed');
      }
    });
    
    saveStepProgress();
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('failed');
    setError(error);
  };

  const processPayment = async () => {
    if (!tier) return;

    // Open appropriate payment modal
    if (paymentMethod === 'card') {
      setShowStripeCheckout(true);
    } else if (paymentMethod === 'crypto') {
      setShowCryptoCheckout(true);
    } else if (paymentMethod === 'wire') {
      // Handle wire transfer
      setIsProcessing(true);
      setPaymentStatus('processing');
      
      try {
        const paymentData: PaymentData = {
          tier: tierKey,
          paymentMethod: 'wire',
          amountCents: Math.round(parseFloat(tier.price.replace('$', '')) * 100),
          currency: 'usd',
          billingEmail: formData.billingEmail || '',
          organizationName: formData.organizationName,
          technicalContact: formData.technicalContact
        };

        const result = await paymentService.processPayment(paymentData);
        
        if (result.success) {
          handlePaymentSuccess(result.transactionId || '');
        } else {
          setPaymentStatus('failed');
          setError(result.error || 'Payment failed');
        }
      } catch (error) {
        setPaymentStatus('failed');
        setError(error instanceof Error ? error.message : 'Payment processing failed');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const completeCurrentStep = async () => {
    const isValid = await validateStep();
    if (!isValid) return;

    // For Step 1, if user is not authenticated, redirect to auth first
    if (stepNumber === 1 && !user) {
      // Save form data to localStorage for later use
      localStorage.setItem(`stepData_${tierKey}`, JSON.stringify(formData));
      navigate('/auth?mode=signup&redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      if (user) {
        await completeStep(tierKey, stepNumber, {
          ...formData,
          completedAt: new Date().toISOString(),
          timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
        });

        setStepCompleted(true);
        await saveStepProgress();
      }

      // Clear the guard cache so the next step is re-checked with the now-completed
      // progress (a stale cache can otherwise keep blocking navigation to it).
      stepGuard.clearTierCache(tierKey);

      // Navigate to next step
      const totalSteps = await stepGuard.getTotalSteps(tierKey);
      if (stepNumber < totalSteps) {
        navigate(`/pricing/${tierKey}/step/${stepNumber + 1}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError('Failed to complete step');
    }
  };

  const completeGrantedStepOne = async () => {
    const errors: string[] = [];
    if (!formData.billingEmail) errors.push('Billing email is required');
    if (tierKey !== 'hobby' && !formData.organizationName) errors.push('Organization name is required');
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setValidationErrors([]);

    setIsProcessing(true);
    try {
      if (user) {
        await completeStep(tierKey, 1, {
          ...formData,
          paymentCompleted: true,
          adminGranted: true,
          transactionId: transactionId ?? '',
          completedAt: new Date().toISOString(),
          timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
        });
        setStepCompleted(true);
        setPaymentStatus('completed');
      }
      stepGuard.clearTierCache(tierKey);
      navigate(`/pricing/${tierKey}/step/2`);
    } catch (error) {
      setError('Failed to complete step');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishSetup = async () => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const totalSteps = getTierStepCount(tierKey);
      const baseData: Record<string, any> = {
        ...formData,
        paymentCompleted: true,
        adminGranted: grantedSub,
        completedAt: new Date().toISOString(),
        timeSpent: Math.round((Date.now() - stepStartTime) / 1000)
      };
      if (grantedSub) baseData.paymentStatus = 'completed';

      // Persist the review step's data and mark it complete.
      await completeStep(tierKey, stepNumber, baseData);

      // For admin-granted users mark the whole setup complete so the dashboard
      // stops prompting for setup completion.
      if (grantedSub) {
        for (let s = 1; s < totalSteps; s++) {
          if (s === stepNumber) continue;
          await completeStep(tierKey, s, { ...baseData, adminGranted: true });
        }
        localStorage.setItem(`stepData_${tierKey}`, JSON.stringify(formData));
      }

      stepGuard.clearTierCache(tierKey);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to finish setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepContent = () => {
    if (!stepConfig) return null;

    const currentStep = stepConfig.steps[stepNumber - 1];
    if (!currentStep) return null;

    switch (stepNumber) {
      case 1:
        return renderPaymentStep();
      case 2:
        return renderApiKeysStep();
      case 3:
        return renderWebhookStep();
      case 4:
        return renderTeamStep();
      case 5:
        return renderReviewStep();
      default:
        return <div>Step not found</div>;
    }
  };

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-[16px] font-medium mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Organization Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium mb-2">Organization Name *</label>
            <input
              type="text"
              value={formData.organizationName || ''}
              onChange={(e) => handleInputChange('organizationName', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
              placeholder="Your company name"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-2">Billing Email *</label>
            <input
              type="email"
              value={formData.billingEmail || ''}
              onChange={(e) => handleInputChange('billingEmail', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
              placeholder="billing@company.com"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-2">Technical Contact</label>
            <input
              type="email"
              value={formData.technicalContact || ''}
              onChange={(e) => handleInputChange('technicalContact', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
              placeholder="tech@company.com"
            />
          </div>
        </div>
      </div>

      {!grantedSub && tier?.payable && (
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-[16px] font-medium mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {accessResult.subscription ? 'Payment Required' : 'Setup Your Team Plan'}
          </h3>
          
          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-[12px] text-yellow-600">
                Create an account to start your Team plan setup. Your information will be saved and you can continue after signing up.
              </p>
            </div>
          )}
          
          {!accessResult.subscription && user && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-[12px] text-blue-600">
                Start your Team plan setup by completing payment. You'll be able to access all setup steps after payment.
              </p>
            </div>
          )}
          
          {paymentStatus === 'completed' ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <p className="text-[12px] text-green-600">
                  Payment successful! Transaction ID: {transactionId}
                </p>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-4">
              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-foreground">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 border rounded-md text-[11px] transition-colors ${
                      paymentMethod === 'card' 
                        ? 'border-foreground bg-foreground/10' 
                        : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 mx-auto mb-1" />
                    Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('crypto')}
                    className={`p-3 border rounded-md text-[11px] transition-colors ${
                      paymentMethod === 'crypto' 
                        ? 'border-foreground bg-foreground/10' 
                        : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    <Bitcoin className="h-4 w-4 mx-auto mb-1" />
                    Crypto
                  </button>
                  <button
                    onClick={() => setPaymentMethod('wire')}
                    className={`p-3 border rounded-md text-[11px] transition-colors ${
                      paymentMethod === 'wire' 
                        ? 'border-foreground bg-foreground/10' 
                        : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    <Users className="h-4 w-4 mx-auto mb-1" />
                    Wire
                  </button>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={processPayment}
                disabled={isProcessing}
                className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  accessResult.subscription ? 'Complete Payment' : `Start ${tier.name} Plan - ${tier.price}`
                )}
              </button>
              
              {paymentStatus === 'processing' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                    <p className="text-[12px] text-blue-600">
                      Processing payment... {transactionId && `(ID: ${transactionId})`}
                    </p>
                  </div>
                </div>
              )}
              
              <p className="text-[11px] text-muted-foreground text-center">
                {accessResult.subscription 
                  ? 'Payment required to continue with your Team plan. Cancel anytime.'
                  : `Start your ${tier.name} plan with 14-day free trial. Cancel anytime.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground text-center">
                Fill in your organization details above, then click "Complete Step" to create your account and continue with payment.
              </p>
            </div>
          )}
        </div>
      )}

      {grantedSub && (
        <div className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-6">
          <h3 className="text-[16px] font-medium mb-2 flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            Plan granted — no payment needed
          </h3>
          <p className="text-[12.5px] text-emerald-700 leading-relaxed">
            Your {tier?.name ?? tierKey} plan was granted by the team and is already active.
            No payment is required. Fill in your organization details above, then continue
            to set up your remaining configuration.
          </p>
          <div className="mt-4">
            <button
              onClick={completeGrantedStepOne}
              disabled={isProcessing}
              className="w-full h-10 bg-foreground text-background text-[13px] rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderApiKeysStep = () => (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-[16px] font-medium mb-4">API Key Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium mb-2">API Key Name *</label>
            <input
              type="text"
              value={formData.apiKeyName || ''}
              onChange={(e) => handleInputChange('apiKeyName', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
              placeholder="Production API Key"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-2">Description *</label>
            <textarea
              value={formData.apiKeyDescription || ''}
              onChange={(e) => handleInputChange('apiKeyDescription', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50 h-20"
              placeholder="Describe the purpose of this API key"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderWebhookStep = () => (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-[16px] font-medium mb-4">Webhook Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium mb-2">Webhook URL *</label>
            <input
              type="url"
              value={formData.webhookUrl || ''}
              onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
              placeholder="https://your-app.com/webhooks/talak"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-2">Webhook Secret *</label>
            <input
              type="password"
              value={formData.webhookSecret || ''}
              onChange={(e) => handleInputChange('webhookSecret', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
              placeholder="Secure webhook secret"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeamStep = () => (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-[16px] font-medium mb-4">Team Member Setup</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium mb-2">Team Member Email *</label>
            <input
              type="email"
              value={formData.teamMemberEmail || ''}
              onChange={(e) => handleInputChange('teamMemberEmail', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
              placeholder="team@company.com"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-2">Role *</label>
            <select
              value={formData.teamMemberRole || ''}
              onChange={(e) => handleInputChange('teamMemberRole', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/50"
            >
              <option value="">Select a role</option>
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="analyst">Analyst</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-[16px] font-medium mb-4">Setup Review</h3>
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-md p-4">
            <h4 className="font-medium mb-2">Configuration Summary</h4>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-[13px] font-medium mb-2">Organization</label>
                <input
                  type="text"
                  value={formData.organizationName || ''}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  placeholder="Your organization name"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-foreground/50"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2">Billing Email</label>
                <input
                  type="email"
                  value={formData.billingEmail || ''}
                  onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                  placeholder="billing@example.com"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-foreground/50"
                />
              </div>
              <p><strong>Payment Status:</strong> {paymentStatus === 'completed' ? 'Completed' : 'Pending'}</p>
            </div>
          </div>
          <button
            onClick={handleFinishSetup}
            disabled={isProcessing}
            className="w-full h-11 bg-foreground text-background text-[14px] rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-60"
          >
            {isProcessing ? 'Finishing…' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNav />
        <main className="mx-auto max-w-[900px] px-6 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!stepConfig) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNav />
        <main className="mx-auto max-w-[900px] px-6 py-16">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-[32px] font-[500] mb-4">Step Configuration Not Found</h1>
            <Link to="/pricing" className="text-blue-500 hover:text-blue-600">
              Back to Pricing
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentStep = stepConfig.steps[stepNumber - 1];
  const totalSteps = stepConfig.steps.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      
      <main className="mx-auto max-w-[900px] px-6 py-16">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <React.Fragment key={i}>
              <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-[12px] font-mono ${
                i + 1 < stepNumber 
                  ? 'bg-success text-success-foreground border-success' 
                  : i + 1 === stepNumber 
                    ? 'bg-foreground text-background border-foreground' 
                    : 'border-border text-muted-foreground'
              }`}>
                {i + 1 < stepNumber ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {i < totalSteps - 1 && <div className="h-px bg-border flex-1" />}
            </React.Fragment>
          ))}
        </div>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[32px] font-[500] tracking-[-0.03em] mb-4">
            {currentStep?.title}
          </h1>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            {currentStep?.detail}
          </p>
        </header>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-[12px] font-medium text-destructive">Please fix the following:</p>
                <ul className="mt-1 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-[11px] text-destructive">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-6">
            <p className="text-[12px] text-destructive">{error}</p>
          </div>
        )}

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => stepNumber > 1 ? navigate(`/pricing/${tierKey}/step/${stepNumber - 1}`) : navigate('/pricing')}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:border-foreground/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {stepNumber > 1 ? 'Previous' : 'Back to Pricing'}
          </button>

          <div className="flex gap-4">
            {!stepCompleted && stepNumber < totalSteps && (
              <button
                onClick={completeCurrentStep}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors"
              >
                Complete Step
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            
            {stepCompleted && stepNumber < totalSteps && (
              <button
                onClick={() => navigate(`/pricing/${tierKey}/step/${stepNumber + 1}`)}
                className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 transition-colors"
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {stepNumber === totalSteps && stepCompleted && (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Payment Modals */}
      <StripeCheckout
        open={showStripeCheckout}
        onOpenChange={setShowStripeCheckout}
        tier={{
          key: tierKey,
          name: tier?.name || 'Team',
          price: tier?.price || '$15.99',
          cadence: tier?.cadence || '/ user / mo',
          blurb: tier?.blurb || 'For shipping product teams.'
        }}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      <CryptoCheckout
        open={showCryptoCheckout}
        onOpenChange={setShowCryptoCheckout}
        tier={{
          key: tierKey,
          name: tier?.name || 'Team',
          price: tier?.price || '$15.99',
          cadence: tier?.cadence || '/ user / mo',
          blurb: tier?.blurb || 'For shipping product teams.'
        }}
        onSuccess={(transactionId) => {
          // Update payment data with form information
          const paymentData = {
            tier: tierKey,
            paymentMethod: 'crypto' as const,
            amountCents: Math.round(parseFloat(tier?.price?.replace('$', '') || '15.99') * 100),
            currency: 'usd',
            billingEmail: formData.billingEmail || '',
            organizationName: formData.organizationName,
            technicalContact: formData.technicalContact,
            transactionId
          };
          
          // Process payment with form data
          paymentService.processPayment(paymentData).then(result => {
            if (result.success) {
              handlePaymentSuccess(transactionId);
            } else {
              handlePaymentError(result.error || 'Payment failed');
            }
          });
        }}
        onError={handlePaymentError}
      />

      <Footer />
    </div>
  );
}
