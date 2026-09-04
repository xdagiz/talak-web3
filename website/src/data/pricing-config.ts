export interface PricingTier {
  key: string;
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  features: string[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  payable?: boolean;
  highlight?: boolean;
  popular?: boolean;
  badge?: string;
  limits?: {
    rpcCalls: string;
    projects: string;
    environments: string;
    chains: string;
    retention: string;
  };
  support?: {
    type: string;
    responseTime: string;
    channels: string[];
  };
  infrastructure?: {
    nodes: string;
    deployment: string[];
    security: string[];
    compliance: string[];
  };
}

export interface PricingConfig {
  tiers: PricingTier[];
  faq: { q: string; a: string }[];
  metadata: {
    lastUpdated: string;
    version: string;
    currency: string;
  };
}

export const PRICING_CONFIG: PricingConfig = {
  tiers: [
    {
      key: "hobby",
      name: "Hobby",
      price: "$0",
      cadence: "forever",
      blurb: "For weekend dApps and side-projects.",
      features: [
        "Up to 5,000 RPC calls / day",
        "1 project · 1 environment", 
        "SIWE auth + 8 chains",
        "Community Discord support",
        "30-day event retention",
      ],
      primaryCta: { label: "Start free", href: "/pricing/hobby/step/1" },
      limits: {
        rpcCalls: "5,000 / day",
        projects: "1",
        environments: "1",
        chains: "8",
        retention: "30 days"
      },
      support: {
        type: "Community",
        responseTime: "Best effort",
        channels: ["Discord"]
      }
    },
    {
      key: "team",
      name: "Team",
      price: "$15.99",
      cadence: "/ user / mo",
      blurb: "For shipping product teams.",
      features: [
        "1M RPC calls / month included",
        "10 projects · all environments",
        "All 30+ chains + custom RPC",
        "Webhooks + audit log",
        "90-day event retention",
        "Email support, 24h response",
      ],
      primaryCta: { label: "Start 14-day trial", href: "/pricing/team/step/1" },
      payable: true,
      highlight: true,
      popular: true,
      badge: "Most Popular",
      limits: {
        rpcCalls: "1M / month",
        projects: "10",
        environments: "All",
        chains: "30+",
        retention: "90 days"
      },
      support: {
        type: "Email",
        responseTime: "24 hours",
        channels: ["email"]
      }
    },
    {
      key: "scale",
      name: "Scale",
      price: "$99",
      cadence: "/ mo, base",
      blurb: "For high-volume production workloads.",
      features: [
        "10M RPC calls / month included",
        "Unlimited projects",
        "Dedicated RPC nodes",
        "SOC 2 Type II report",
        "1-year event retention",
        "Slack channel + 1h SLA",
      ],
      primaryCta: { label: "Start trial", href: "/pricing/scale/step/1" },
      payable: true,
      limits: {
        rpcCalls: "10M / month",
        projects: "Unlimited",
        environments: "All",
        chains: "30+",
        retention: "1 year"
      },
      support: {
        type: "Priority",
        responseTime: "1 hour",
        channels: ["Slack", "email"]
      },
      infrastructure: {
        nodes: "Dedicated",
        deployment: ["Cloud", "Multi-region"],
        security: ["DDoS protection", "Rate limiting"],
        compliance: ["SOC 2 Type II"]
      }
    },
    {
      key: "enterprise",
      name: "Enterprise",
      price: "Custom",
      blurb: "Self-hosted, audited, and tailor-fit.",
      features: [
        "Unlimited everything",
        "On-prem or VPC deployment",
        "Custom contracts & DPA",
        "Security review + pen test",
        "Indefinite event retention",
        "Dedicated solutions architect",
      ],
      primaryCta: { label: "Talk to sales", href: "/pricing/enterprise/step/1" },
      secondaryCta: { label: "Schedule demo", href: "/demo" },
      limits: {
        rpcCalls: "Unlimited",
        projects: "Unlimited",
        environments: "All",
        chains: "30+",
        retention: "Indefinite"
      },
      support: {
        type: "Dedicated",
        responseTime: "Immediate",
        channels: ["Phone", "email", "Slack", "dedicated support"]
      },
      infrastructure: {
        nodes: "Self-hosted",
        deployment: ["On-premises", "VPC", "Private cloud"],
        security: ["Custom security", "Penetration testing", "Security review"],
        compliance: ["Custom compliance", "SOC 2", "ISO 27001", "HIPAA"]
      }
    }
  ],
  faq: [
    { 
      q: "What counts as an RPC call?", 
      a: "Any request the talak.rpc client makes — eth_getBalance, eth_call, batched requests count as one per item. Subscriptions are billed per delivered message." 
    },
    { 
      q: "Can I switch plans anytime?", 
      a: "Yes. Upgrades are prorated; downgrades take effect on the next billing cycle." 
    },
    { 
      q: "How does payment work?", 
      a: "Pick a tier and pay either by card via Stripe, or with a stablecoin from your own wallet — your plan activates as soon as the payment confirms." 
    },
    { 
      q: "Do you offer non-profit or open-source pricing?", 
      a: "Yes! We offer 50% discounts for qualified non-profits and open-source projects. Contact us for details." 
    },
    { 
      q: "What's included in the trial?", 
      a: "Full access to all features of your chosen plan, including API calls, webhooks, analytics, and support. No credit card required for hobby tier." 
    },
    { 
      q: "Can I customize my plan?", 
      a: "Enterprise plans are fully customizable. For Team and Scale, we can adjust limits and features based on your specific needs." 
    }
  ],
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: "1.0.0",
    currency: "USD"
  }
};

// Helper functions to get pricing data
export const getPricingTiers = () => PRICING_CONFIG.tiers;
export const getPricingTier = (key: string) => PRICING_CONFIG.tiers.find(tier => tier.key === key);
export const getFAQ = () => PRICING_CONFIG.faq;
export const getPricingMetadata = () => PRICING_CONFIG.metadata;

// Dynamic pricing calculations
export const calculatePrice = (tierKey: string, users: number = 1, months: number = 1) => {
  const tier = getPricingTier(tierKey);
  if (!tier || tier.price === "Custom" || tier.price === "$0") return tier.price;
  
  const basePrice = parseFloat(tier.price.replace('$', ''));
  const totalPrice = basePrice * users * months;
  
  return `$${totalPrice.toFixed(2)}`;
};

export const getTierLimits = (tierKey: string) => {
  const tier = getPricingTier(tierKey);
  return tier?.limits || null;
};

export const getTierSupport = (tierKey: string) => {
  const tier = getPricingTier(tierKey);
  return tier?.support || null;
};

export const getTierInfrastructure = (tierKey: string) => {
  const tier = getPricingTier(tierKey);
  return tier?.infrastructure || null;
};
