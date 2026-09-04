export type ServiceStatus = "operational" | "degraded" | "outage";

export type Service = {
  slug: string;
  name: string;
  region: string;
  uptime: number;
  latencyMs: number;
  status: ServiceStatus;
  description: string;
  endpoint?: string;
  sla: string;
};

export const SERVICES: Service[] = [
  {
    slug: "dashboard-web",
    name: "Dashboard (web)",
    region: "global edge",
    uptime: 0.99996,
    latencyMs: 38,
    status: "operational",
    description:
      "The dashboard you're looking at right now. Served from edge nodes worldwide; cached statically and revalidated on every push.",
    endpoint: "https://app.talak-web3.dev",
    sla: "99.99% monthly",
  },
  {
    slug: "api-us-east",
    name: "API (REST + RT) · us-east-1",
    region: "us-east-1",
    uptime: 0.99989,
    latencyMs: 52,
    status: "operational",
    description:
      "REST + realtime API for the Americas. Anycast-routed; hot failover to us-west-2 within 5s of region-level failure.",
    endpoint: "https://api.us-east-1.talak-web3.dev",
    sla: "99.99% monthly",
  },
  {
    slug: "api-eu-west",
    name: "API (REST + RT) · eu-west-1",
    region: "eu-west-1",
    uptime: 0.99991,
    latencyMs: 47,
    status: "operational",
    description:
      "REST + realtime API for EMEA. Hot failover to eu-central-1.",
    endpoint: "https://api.eu-west-1.talak-web3.dev",
    sla: "99.99% monthly",
  },
  {
    slug: "api-ap-southeast",
    name: "API (REST + RT) · ap-southeast-1",
    region: "ap-southeast-1",
    uptime: 0.99972,
    latencyMs: 61,
    status: "operational",
    description:
      "REST + realtime API for APAC. Hot failover to ap-northeast-1.",
    endpoint: "https://api.ap-southeast-1.talak-web3.dev",
    sla: "99.95% monthly",
  },
  {
    slug: "rpc-ethereum",
    name: "RPC pool · Ethereum",
    region: "multi",
    uptime: 0.99984,
    latencyMs: 142,
    status: "operational",
    description:
      "Pooled, multi-provider RPC for Ethereum mainnet (chain 1). Health-checked every 5s; failed providers ejected from rotation within one request budget.",
    sla: "99.95% monthly",
  },
  {
    slug: "rpc-base",
    name: "RPC pool · Base",
    region: "multi",
    uptime: 0.99980,
    latencyMs: 96,
    status: "operational",
    description:
      "Pooled, multi-provider RPC for Base (chain 8453).",
    sla: "99.95% monthly",
  },
  {
    slug: "rpc-arbitrum",
    name: "RPC pool · Arbitrum",
    region: "multi",
    uptime: 0.99977,
    latencyMs: 88,
    status: "operational",
    description:
      "Pooled, multi-provider RPC for Arbitrum One (chain 42161).",
    sla: "99.95% monthly",
  },
  {
    slug: "webhooks",
    name: "Webhook delivery",
    region: "global",
    uptime: 0.99961,
    latencyMs: 210,
    status: "operational",
    description:
      "Outbound webhook delivery with HMAC-signed payloads, exponential backoff retries (24h budget), and idempotency keys.",
    sla: "99.95% monthly",
  },
  {
    slug: "realtime",
    name: "Realtime stream",
    region: "global edge",
    uptime: 0.99988,
    latencyMs: 45,
    status: "operational",
    description:
      "Server-sent event stream powering the dashboard's Activity feed and the SDK's `talak.events.stream()` API.",
    sla: "99.99% monthly",
  },
];

export type Incident = {
  id: string;
  date: string;
  title: string;
  status: "resolved" | "monitoring" | "investigating";
  body: string;
  affected: string[];
};

export const INCIDENTS: Incident[] = [
  {
    id: "2026-04-08",
    date: "Apr 08, 2026",
    title: "Elevated webhook delivery latency in eu-west-1",
    status: "resolved",
    body: "A misconfigured rate limit caused queue back-pressure for ~38 minutes. No deliveries were lost; all events were re-delivered within 4 minutes of the fix being rolled out.",
    affected: ["webhooks"],
  },
  {
    id: "2026-03-22",
    date: "Mar 22, 2026",
    title: "Partial RPC degradation on Ethereum mainnet",
    status: "resolved",
    body: "One upstream provider returned malformed responses for ~12 minutes. Failover routed traffic to healthy providers; ~3% of requests saw +180ms latency.",
    affected: ["rpc-ethereum"],
  },
  {
    id: "2026-02-04",
    date: "Feb 04, 2026",
    title: "Brief dashboard auth outage",
    status: "resolved",
    body: "Session refresh endpoint returned 502 for 6 minutes during a deploy. Existing sessions were unaffected.",
    affected: ["dashboard-web"],
  },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
