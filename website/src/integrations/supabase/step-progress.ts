import { supabase } from "./client";
import type { Database } from "./types";

export type StepProgressRow = Database["public"]["Tables"]["step_progress"]["Row"];
export type StepProgressInsert = Database["public"]["Tables"]["step_progress"]["Insert"];

export type TierKey = "hobby" | "team" | "scale" | "enterprise";

export interface StepProgressData {
  tier: TierKey;
  stepNumber: number;
  stepData: Record<string, any>;
  isCompleted: boolean;
  timeSpent?: number;
}

/**
 * Records step progress for the current user
 */
export async function recordStepProgress(
  input: StepProgressData
): Promise<StepProgressRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[step-progress] no authenticated user — skipping write");
    return null;
  }

  // Check if step progress already exists
  const { data: existing } = await supabase
    .from("step_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("tier", input.tier)
    .eq("step_number", input.stepNumber)
    .single();

  const payload: StepProgressInsert = {
    user_id: user.id,
    tier: input.tier,
    step_number: input.stepNumber,
    step_data: input.stepData,
    is_completed: input.isCompleted,
    time_spent: input.timeSpent,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from("step_progress")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    result = { data, error };
  } else {
    // Insert new record
    payload.created_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("step_progress")
      .insert(payload)
      .select("*")
      .single();
    result = { data, error };
  }

  if (result.error) {
    console.error("[step-progress] recordStepProgress failed", result.error.message);
    return null;
  }
  return result.data;
}

/**
 * Gets all step progress for the current user and tier
 */
export async function getStepProgress(tier: TierKey): Promise<StepProgressRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("step_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("tier", tier)
    .order("step_number", { ascending: true });

  if (error) {
    console.warn("[step-progress] getStepProgress failed", error.message);
    return [];
  }
  return data || [];
}

/**
 * Gets the current step number for a tier (highest completed step + 1)
 */
export async function getCurrentStep(tier: TierKey): Promise<number> {
  const progress = await getStepProgress(tier);
  const completedSteps = progress.filter(step => step.is_completed);
  if (completedSteps.length === 0) return 1;
  
  const highestCompleted = Math.max(...completedSteps.map(step => step.step_number));
  return highestCompleted + 1;
}

/**
 * Marks a step as completed
 */
export async function completeStep(
  tier: TierKey,
  stepNumber: number,
  stepData?: Record<string, any>
): Promise<boolean> {
  const result = await recordStepProgress({
    tier,
    stepNumber,
    stepData: stepData || {},
    isCompleted: true,
  });
  return result !== null;
}

/**
 * Gets completion percentage for a tier
 */
export async function getTierCompletion(tier: TierKey, totalSteps: number): Promise<number> {
  const progress = await getStepProgress(tier);
  const completedSteps = progress.filter(step => step.is_completed);
  return Math.round((completedSteps.length / totalSteps) * 100);
}
