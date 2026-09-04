export type IntegrationKey =
  | "react"
  | "next"
  | "node"
  | "vue"
  | "wagmi"
  | "ethers";

export type Integration = {
  key: IntegrationKey;
  slug: string;
  label: string;
  tagline: string;
  description: string;
  install: string;
  usageFile: string;
  usage: string;
  features: string[];
  requirements: string[];
  docsHref?: string;
  icon: string;
};

export const INTEGRATIONS: Integration[] = [
  {
    key: "react",
    slug: "react",
    label: "React",
    icon: "react",
    tagline: "First-class hooks for connecting wallets and signing in.",
    description:
      "The React adapter ships a single provider and a typed hook. Wrap your tree in `<TalakProvider>` and the hook gives you everything: address, session, connect, sign-in, sign-out.",
    install: `pnpm add talak-web3 @talak-web3/react`,
    usageFile: "App.tsx",
    usage: `import { TalakProvider, useTalak } from "@talak-web3/react";

export default function App() {
  return (
    <TalakProvider apiKey={import.meta.env.VITE_TALAK_KEY!}>
      <Wallet />
    </TalakProvider>
  );
}

function Wallet() {
  const { connect, address, signIn } = useTalak();
  if (!address) return <button onClick={connect}>Connect wallet</button>;
  return <button onClick={signIn}>Sign in with Ethereum</button>;
}`,
    features: [
      "Single provider with React Suspense support",
      "Typed `useTalak()` hook",
      "Automatic session restoration on mount",
      "Works with React 18 and React 19",
    ],
    requirements: ["React 18.2 or newer", "A `VITE_TALAK_KEY` env var"],
  },
  {
    key: "next",
    slug: "nextjs",
    label: "Next.js",
    icon: "next",
    tagline: "App-router-ready provider with RSC-safe boundaries.",
    description:
      "The Next adapter exposes both a client-only provider and server helpers for verifying SIWE messages inside route handlers. RSC components see a typed session object on the request.",
    install: `pnpm add talak-web3 @talak-web3/next`,
    usageFile: "app/layout.tsx",
    usage: `import { TalakProvider } from "@talak-web3/next/client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TalakProvider apiKey={process.env.NEXT_PUBLIC_TALAK_KEY!}>
          {children}
        </TalakProvider>
      </body>
    </html>
  );
}`,
    features: [
      "App-router compatible (Next 13+)",
      "RSC-safe — server components see the verified session",
      "Route-handler helper for SIWE verification",
      "Edge runtime supported",
    ],
    requirements: ["Next.js 13 or newer", "Node 18+ runtime"],
  },
  {
    key: "node",
    slug: "node",
    label: "Node.js",
    icon: "node",
    tagline: "Server-side SDK for verifying signatures and emitting events.",
    description:
      "The base SDK runs anywhere Node runs. Use it from your API, your background workers, or your edge functions. Server-only methods (signature verification, webhook signing) live in `talak-web3/server`.",
    install: `pnpm add talak-web3`,
    usageFile: "server.ts",
    usage: `import { createTalak } from "talak-web3";

const talak = createTalak({ apiKey: process.env.TALAK_API_KEY! });

// Verify a SIWE signature server-side
const ok = await talak.auth.verifySiwe({ message, signature });

// Stream an event into your dashboard
await talak.events.emit({
  type: "tx",
  level: "success",
  message: "Order #4421 settled on-chain",
});`,
    features: [
      "Zero-dependency core (besides viem)",
      "Edge-runtime compatible (Vercel Edge, Cloudflare Workers)",
      "Webhook signature helpers",
      "Structured logging out of the box",
    ],
    requirements: ["Node 18+ or any modern edge runtime"],
  },
  {
    key: "vue",
    slug: "vue",
    label: "Vue",
    icon: "vue",
    tagline: "Plugin + composable for Vue 3 applications.",
    description:
      "The Vue plugin installs a global `$talak` and exposes a `useTalak()` composable. Type definitions are emitted for both Options and Composition API.",
    install: `pnpm add talak-web3 @talak-web3/vue`,
    usageFile: "main.ts",
    usage: `import { createApp } from "vue";
import { TalakPlugin } from "@talak-web3/vue";
import App from "./App.vue";

createApp(App)
  .use(TalakPlugin, { apiKey: import.meta.env.VITE_TALAK_KEY })
  .mount("#app");`,
    features: [
      "Vue 3 plugin with global `$talak`",
      "Composition-API composable `useTalak()`",
      "Pinia store helper for session persistence",
    ],
    requirements: ["Vue 3.3 or newer"],
  },
  {
    key: "wagmi",
    slug: "wagmi",
    label: "wagmi",
    icon: "wagmi",
    tagline: "Connector that drops into any wagmi config.",
    description:
      "If you're already on wagmi, the connector slots into your existing `createConfig` call. Sessions are surfaced through wagmi's standard hooks; no parallel state to maintain.",
    install: `pnpm add talak-web3 @talak-web3/wagmi`,
    usageFile: "wagmi.ts",
    usage: `import { createConfig } from "wagmi";
import { talakConnector } from "@talak-web3/wagmi";
import { mainnet, base, arbitrum } from "wagmi/chains";

export const config = createConfig({
  chains: [mainnet, base, arbitrum],
  connectors: [talakConnector({ apiKey: import.meta.env.VITE_TALAK_KEY })],
});`,
    features: [
      "Drops into any existing wagmi v2 config",
      "Surfaces session via standard wagmi hooks",
      "Compatible with RainbowKit, ConnectKit, etc.",
    ],
    requirements: ["wagmi 2.x"],
  },
  {
    key: "ethers",
    slug: "ethers",
    label: "ethers.js",
    icon: "ethers",
    tagline: "Drop-in JsonRpcProvider with failover and dashboard logging.",
    description:
      "If you're an ethers shop, you can keep using your existing patterns and just swap the provider URL. The SDK still gives you analytics, failover, and dashboard logging.",
    install: `pnpm add talak-web3 ethers`,
    usageFile: "rpc.ts",
    usage: `import { ethers } from "ethers";
import { createTalak } from "talak-web3";

const talak = createTalak({ apiKey: process.env.TALAK_API_KEY! });
// Failover-aware provider with automatic logging to your dashboard
const provider = new ethers.JsonRpcProvider(talak.rpc.url("eth"));

const balance = await provider.getBalance("0xabc…");`,
    features: [
      "Drop-in ethers v6 provider",
      "All RPC calls logged to your dashboard",
      "Provider failover transparent to ethers",
    ],
    requirements: ["ethers 6.x"],
  },
];

export function getIntegration(slug: string): Integration | undefined {
  return INTEGRATIONS.find((i) => i.slug === slug);
}
