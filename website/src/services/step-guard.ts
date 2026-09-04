import { supabase } from "@/integrations/supabase/client";
import { getStepProgress, type StepProgressRow } from "@/integrations/supabase/step-progress";
import { getMySubscription, isAdminGranted } from "@/integrations/supabase/subscriptions";
import { getPricingTier } from "@/data/pricing-config";

export interface StepAccessResult {
  allowed: boolean;
  reason?: string;
  currentStep?: number;
  completedSteps?: number[];
  subscription?: any;
  stepProgress?: StepProgressRow[];
}

export class StepGuardService {
  private static instance: StepGuardService;
  private cache = new Map<string, StepAccessResult>();

  static getInstance(): StepGuardService {
    if (!StepGuardService.instance) {
      StepGuardService.instance = new StepGuardService();
    }
    return StepGuardService.instance;
  }

  /**
   * Check if user can access a specific step
   */
  async checkStepAccess(tierKey: string, stepNumber: number): Promise<StepAccessResult> {
    const cacheKey = `${tierKey}-${stepNumber}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Special case: Allow access to Step 1 without authentication
      // Users can start setup and create account/subscription during Step 1
      if (stepNumber === 1) {
        const subscription = user ? await getMySubscription() : null;
        const stepProgress = user ? await getStepProgress(tierKey) : [];
        
        const result = { 
          allowed: true, 
          currentStep: 1,
          completedSteps: [],
          subscription,
          stepProgress 
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // For steps 2+, require authentication
      if (userError || !user) {
        const result = { allowed: false, reason: 'User not authenticated' };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Get subscription
      const subscription = await getMySubscription();
      
      // Get step progress
      const stepProgress = await getStepProgress(tierKey);
      
      // For steps 2+, check if user has active subscription for this tier
      if (!subscription || subscription.tier !== tierKey) {
        const result = { 
          allowed: false, 
          reason: `Complete Step 1 first to create your ${tierKey} subscription`,
          subscription 
        };
        this.cache.set(cacheKey, result);
        return result;
      }
      
      // Admin-granted subscriptions are already considered paid: the user filled
      // payment in the grant itself (charged $0), so skip the payment requirement.
      const granted = isAdminGranted(subscription);

      // Check if subscription is paid for paid tiers (for steps 2+)
      const tier = getPricingTier(tierKey);
      if (tier?.payable && !granted && subscription.status !== 'active' && subscription.status !== 'trialing') {
        const result = { 
          allowed: false, 
          reason: 'Complete payment in Step 1 to continue',
          subscription,
          stepProgress 
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Calculate completed steps
      const completedSteps = stepProgress
        .filter(step => step.is_completed)
        .map(step => step.step_number)
        .sort((a, b) => a - b);

      const currentStep = Math.max(0, ...completedSteps) + 1;

      // For admin-granted users the payment step is pre-satisfied and the setup
      // steps are purely informational, so they may fill any step in any order
      // (no payment-driven sequential lock). Skip the "must complete earlier
      // steps first" gate for them.
      if (!granted && stepNumber > currentStep) {
        const result = { 
          allowed: false, 
          reason: `Complete step ${currentStep} first`,
          currentStep,
          completedSteps,
          subscription,
          stepProgress 
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      const result = { 
        allowed: true, 
        currentStep,
        completedSteps,
        subscription,
        stepProgress 
      };
      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Step access check error:', error);
      const result = { 
        allowed: false, 
        reason: 'Failed to verify step access' 
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * Get the next available step for user
   */
  async getNextStep(tierKey: string): Promise<number> {
    const accessResult = await this.checkStepAccess(tierKey, 1);
    return accessResult.currentStep || 1;
  }

  /**
   * Check if user has completed all steps for a tier
   */
  async isTierCompleted(tierKey: string): Promise<boolean> {
    const tier = getPricingTier(tierKey);
    if (!tier) return false;

    const totalSteps = await this.getTotalSteps(tierKey);
    const accessResult = await this.checkStepAccess(tierKey, totalSteps);
    
    return accessResult.completedSteps?.length === totalSteps;
  }

  /**
   * Get total steps for a tier
   */
  async getTotalSteps(tierKey: string): Promise<number> {
    const tier = getPricingTier(tierKey);
    if (!tier) return 0;

    // Get step count from step config
    const { getTierStepCount } = await import("@/data/step-config");
    return getTierStepCount(tierKey);
  }

  /**
   * Clear cache for a specific tier
   */
  clearTierCache(tierKey: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${tierKey}-`));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Validate step completion requirements
   */
  async validateStepCompletion(tierKey: string, stepNumber: number): Promise<{ valid: boolean; requirements: string[] }> {
    const requirements: string[] = [];

    // Get step progress
    const stepProgress = await getStepProgress(tierKey);
    
    // Check if previous steps are completed
    for (let i = 1; i < stepNumber; i++) {
      const step = stepProgress.find(s => s.step_number === i);
      if (!step || !step.is_completed) {
        requirements.push(`Step ${i} must be completed first`);
      }
    }

    // Check payment requirements for step 1 of paid tiers
    if (stepNumber === 1) {
      const tier = getPricingTier(tierKey);
      const subscription = await getMySubscription();
      const granted = isAdminGranted(subscription);

      if (tier?.payable && !granted && (!subscription || subscription.status === 'pending')) {
        requirements.push('Payment must be completed to proceed');
      }
    }

    // Check specific step requirements
    const stepData = stepProgress.find(s => s.step_number === stepNumber);
    if (stepData?.step_data) {
      const data = stepData.step_data as any;

      // Validate required fields based on step
      if (stepNumber === 1) {
        const subscription = await getMySubscription();
        const granted = isAdminGranted(subscription);
        if (!data.billingEmail) requirements.push('Billing email is required');
        if (tierKey !== 'hobby' && !data.organizationName) {
          requirements.push('Organization name is required');
        }
        if (!granted && !data.paymentCompleted && tierKey !== 'hobby') {
          requirements.push('Payment must be completed');
        }
      }
    }

    return {
      valid: requirements.length === 0,
      requirements
    };
  }

  /**
   * Get step completion percentage
   */
  async getCompletionPercentage(tierKey: string): Promise<number> {
    const totalSteps = await this.getTotalSteps(tierKey);
    const accessResult = await this.checkStepAccess(tierKey, 1);
    const completedSteps = accessResult.completedSteps?.length || 0;
    
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Get step navigation info
   */
  async getStepNavigation(tierKey: string, currentStep: number): Promise<{
    canGoBack: boolean;
    canGoForward: boolean;
    nextStep?: number;
    previousStep?: number;
    isLastStep: boolean;
  }> {
    const totalSteps = await this.getTotalSteps(tierKey);
    const accessResult = await this.checkStepAccess(tierKey, currentStep);
    
    const canGoBack = currentStep > 1;
    const canGoForward = accessResult.completedSteps?.includes(currentStep);
    const nextStep = canGoForward ? currentStep + 1 : undefined;
    const previousStep = currentStep > 1 ? currentStep - 1 : undefined;
    const isLastStep = currentStep === totalSteps;

    return {
      canGoBack,
      canGoForward,
      nextStep,
      previousStep,
      isLastStep
    };
  }
}
