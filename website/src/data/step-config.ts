export interface StepConfig {
  title: string;
  subtitle: string;
  steps: { title: string; detail: string }[];
  ctaLabel: string;
  ctaHref: string;
}

export interface TierStepConfig {
  [tierKey: string]: StepConfig;
}

export const STEP_CONFIG: TierStepConfig = {
  hobby: {
    title: "Hobby setup",
    subtitle: "Get started with talak-web3 for a single project in minutes.",
    steps: [
      { title: "Create account", detail: "Sign up and verify your email in the auth flow." },
      { title: "Create your first project", detail: "Generate a project ID from the dashboard project page." },
      { title: "Install SDK", detail: "Add talak-web3 and connect your app with your project ID." },
      { title: "Emit first event", detail: "Send a test event and verify it appears in activity." },
    ],
    ctaLabel: "Start free",
    ctaHref: "/pricing/hobby/step/1",
  },
  team: {
    title: "Team rollout",
    subtitle: "Enable auth, tokens, webhooks, and billing for production teams.",
    steps: [
      { title: "Start Team trial", detail: "Activate Team plan and assign billing owner." },
      { title: "Create API keys", detail: "Generate scoped keys for backend services and CI." },
      { title: "Connect webhook endpoint", detail: "Register webhook URL and test delivery from dashboard." },
      { title: "Track live analytics", detail: "Watch RPC/auth/webhook events in real time activity stream." },
      { title: "Invite teammates", detail: "Add team members and define environment responsibilities." },
    ],
    ctaLabel: "Start Team trial",
    ctaHref: "/pricing/team/step/1",
  },
  scale: {
    title: "Scale deployment",
    subtitle: "Move high-volume workloads to dedicated, monitored talak-web3 infrastructure.",
    steps: [
      { title: "Activate Scale trial", detail: "Enable base plan with high monthly RPC allowance." },
      { title: "Provision dedicated RPC", detail: "Configure dedicated RPC provider strategy and failover." },
      { title: "Integrate backend API", detail: "Point dApp backend to talak-web3 API base URL." },
      { title: "Set realtime alerting", detail: "Use activity and webhooks for incident detection." },
      { title: "Validate billing and usage", detail: "Confirm usage counters and billing history integrity." },
    ],
    ctaLabel: "Start Scale trial",
    ctaHref: "/pricing/scale/step/1",
  },
  enterprise: {
    title: "Enterprise onboarding",
    subtitle: "Security, compliance, and custom deployment with talak-web3 support.",
    steps: [
      { title: "Scope requirements", detail: "Review compliance, data residency, and integration needs." },
      { title: "Architecture workshop", detail: "Design VPC/on-prem deployment and key management model." },
      { title: "Security review", detail: "Complete threat model, pen-test process, and controls checklist." },
      { title: "Migration and cutover", detail: "Migrate projects and verify realtime and billing continuity." },
    ],
    ctaLabel: "Talk to sales",
    ctaHref: "/pricing/enterprise/step/1",
  },
};

// Helper functions
export const getStepConfig = (tierKey: string): StepConfig | null => {
  return STEP_CONFIG[tierKey] || null;
};

export const getAllStepConfigs = (): TierStepConfig => {
  return STEP_CONFIG;
};

export const getTierSteps = (tierKey: string): { title: string; detail: string }[] => {
  const config = getStepConfig(tierKey);
  return config?.steps || [];
};

export const getTierStepCount = (tierKey: string): number => {
  const steps = getTierSteps(tierKey);
  return steps.length;
};
