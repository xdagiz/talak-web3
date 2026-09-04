import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Lock, AlertCircle, Loader2 } from "lucide-react";
import { StepGuardService, type StepAccessResult } from "@/services/step-guard";
import { Link } from "react-router-dom";

interface StepRouterProps {
  tierKey: string;
  stepComponents: React.ComponentType<any>[];
}

export function StepRouter({ tierKey, stepComponents }: StepRouterProps) {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const navigate = useNavigate();
  const [accessResult, setAccessResult] = useState<StepAccessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const stepGuard = StepGuardService.getInstance();

  useEffect(() => {
    checkAccess();
  }, [stepNumber, tierKey]);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const stepNum = parseInt(stepNumber || '1');
      const result = await stepGuard.checkStepAccess(tierKey, stepNum);
      setAccessResult(result);

      // Redirect if not allowed
      if (!result.allowed && result.currentStep) {
        navigate(`/pricing/${tierKey}/step/${result.currentStep}`);
      }
    } catch (error) {
      console.error('Access check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  if (!accessResult?.allowed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNav />
        <main className="mx-auto max-w-[900px] px-6 py-16">
          <div className="text-center">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-[32px] font-[500] mb-4">Access Restricted</h1>
            <p className="text-[16px] text-muted-foreground mb-6">
              {accessResult?.reason || 'You cannot access this step yet.'}
            </p>
            <div className="space-y-4">
              {accessResult?.subscription && (
                <div className="bg-muted/30 rounded-lg p-4 text-left max-w-md mx-auto">
                  <h3 className="font-medium mb-2">Subscription Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Tier: {accessResult.subscription.tier}<br />
                    Status: {accessResult.subscription.status}<br />
                    {accessResult.subscription.status === 'pending' && 'Payment required to proceed'}
                  </p>
                </div>
              )}
              <div className="flex gap-4 justify-center">
                <Link 
                  to="/pricing" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Pricing
                </Link>
                {accessResult?.currentStep && (
                  <Link 
                    to={`/pricing/${tierKey}/step/${accessResult.currentStep}`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:border-foreground/50 transition-colors"
                  >
                    Go to Step {accessResult.currentStep}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const stepNum = parseInt(stepNumber || '1');
  const StepComponent = stepComponents[stepNum - 1];

  if (!StepComponent) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNav />
        <main className="mx-auto max-w-[900px] px-6 py-16">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-[32px] font-[500] mb-4">Step Not Found</h1>
            <p className="text-[16px] text-muted-foreground mb-6">
              Step {stepNum} is not available for {tierKey} tier.
            </p>
            <Link 
              to="/pricing" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Pricing
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <StepComponent 
      tierKey={tierKey}
      stepNumber={stepNum}
      accessResult={accessResult}
      stepGuard={stepGuard}
    />
  );
}
