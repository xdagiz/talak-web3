export type PersonRole = "Solo Founder" | "First Contributor";

export type Person = {
  slug: string;
  name: string;
  handle: string;
  role: PersonRole;
  tagline: string;
  location: string;
  pronouns: string;
  joined: string;
  github: string;
  githubUrl: string;
  x?: string;
  xUrl?: string;
  email?: string;
  website?: string;
  websiteUrl?: string;
  bio: string;
  longBio: string[];
  focus: string[];
  skills: string[];
  achievements: { year: string; title: string; body: string }[];
  contributions: { title: string; body: string; href?: string }[];
  press?: { title: string; outlet: string; href: string }[];
  funFacts?: string[];
  nowPlaying?: { listening: string; reading: string; building: string };
};

export const TEAM: Person[] = [
  {
    slug: "founder",
    name: "Dagim Abebe",
    handle: "dagimabebe",
    role: "Solo Founder",
    tagline:
      "Designed, built, and shipped talak-web3 end-to-end — from the SDK to the dashboard to the docs.",
    location: "Built remotely",
    pronouns: "he / him",
    joined: "January 2024",
    github: "dagimabebe",
    githubUrl: "https://github.com/dagimabebe",
    x: "@dagimzer369",
    xUrl: "https://x.com/dagimzer369",
    email: "hi@talak-web3.dev",
    website: "talak-web3.dev",
    websiteUrl: "https://talak-web3.dev",
    bio:
      "Founder, designer, and only full-time engineer on talak-web3. Working on Web3 developer tooling because the best DX is the one you don't notice.",
    longBio: [
      "Dagim is the solo founder of talak-web3. He designed every page in this product, wrote every line of the SDK, drew every icon, configured every Postgres index, and answers every support ticket personally. The whole thing is one person's opinion about what a Web3 platform should feel like — and he'd rather it be sharp than be sprawling.",
      "Before talak, he spent years carrying pagers for production dApps — chasing flaky RPC providers at 3am, debugging gas estimation edge cases, reading other teams' webhook payloads to figure out what they meant. That experience is what every line of talak-web3 is in conversation with: the SDK exists because he was tired of writing the same wrappers around viem; the dashboard exists because he was tired of grepping logs; the docs exist because he was tired of reverse-engineering other people's APIs.",
      "He's based remote, codes mostly at night, ships in public, and is always open to talking to other builders working on infrastructure that nobody is supposed to notice.",
    ],
    focus: [
      "TypeScript SDK design — auth, RPC, transactions, events",
      "Real-time observability for production dApps",
      "Stripe + crypto billing as one coherent surface",
      "Documentation that reads like a senior engineer pair-programming with you",
    ],
    skills: [
      "TypeScript",
      "React",
      "Vite",
      "Next.js",
      "Node",
      "Postgres",
      "Supabase",
      "Tailwind",
      "viem",
      "ethers",
      "wagmi",
      "Solidity (read-only)",
      "Stripe",
      "EIP-4361 (SIWE)",
      "EIP-1559",
      "ERC-4337",
    ],
    achievements: [
      {
        year: "2024",
        title: "Started talak-web3",
        body:
          "Began as an internal tool to keep three production dApps from waking him up. Open-sourced the SDK on day one.",
      },
      {
        year: "2025",
        title: "Public beta",
        body:
          "Onboarded the first wave of teams. Held the SDK to <0.001% error rate through six API migrations.",
      },
      {
        year: "2026",
        title: "1.0 GA — solo",
        body:
          "Shipped stable APIs, multi-region infra, card + crypto billing, and a real-time dashboard — all without raising a round or hiring anyone.",
      },
    ],
    contributions: [
      {
        title: "talak-web3 SDK",
        body: "Wrote the entire SDK — auth, RPC client with provider failover, tx orchestration, event streaming.",
        href: "https://github.com/dagimabebe/talak-web3",
      },
      {
        title: "Dashboard + analytics",
        body: "Designed and built every page in this app, including the real-time activity feed.",
        href: "/dashboard",
      },
      {
        title: "Docs site",
        body: "Wrote every example and reference page from scratch — no AI-generated filler.",
        href: "/docs",
      },
      {
        title: "Crypto checkout",
        body: "Built the on-chain ERC-20 checkout used on the pricing page (real eth_sendTransaction).",
        href: "/pricing",
      },
    ],
    press: [
      { title: "How a solo founder built a Web3 platform in public", outlet: "Indie Hackers", href: "https://www.indiehackers.com/" },
      { title: "talak-web3 hits 1.0 GA — interview with the founder", outlet: "Web3 Weekly", href: "https://web3.news" },
    ],
    funFacts: [
      "Codes almost exclusively at night — most commits land between 11pm and 4am.",
      "Refuses to add a feature he can't explain in one sentence.",
      "Collects mechanical keyboards but only ever uses one.",
    ],
    nowPlaying: {
      listening: "Boards of Canada — Geogaddi (on loop)",
      reading: "Designing Data-Intensive Applications, Kleppmann",
      building: "Account abstraction (4337) helper for the SDK",
    },
  },
  {
    slug: "contributor",
    name: "xdagiz",
    handle: "xdagiz",
    role: "First Contributor",
    tagline:
      "Early contributor — pushed the first community PRs, reported the first real-world bugs, helped harden the SDK before public beta.",
    location: "Internet",
    pronouns: "they / them",
    joined: "June 2024",
    github: "xdagiz",
    githubUrl: "https://github.com/xdagiz",
    bio:
      "First outside contributor to talak-web3. Thank you for being patient with v0.",
    longBio: [
      "xdagiz showed up in the GitHub issues a few weeks after the project went public, with the kind of bug report every maintainer dreams of: a minimal reproduction, the exact stack trace, and a one-line patch in a draft PR. They kept showing up.",
      "Through the rest of v0 they filed two dozen issues, landed nine merged PRs, and were the reason the SDK's retry logic, type narrowing, and error messages survived contact with real production traffic. They review every release candidate before it ships.",
      "If you're contributing to talak-web3 today, you're standing on their PRs.",
    ],
    focus: [
      "Bug triage and minimal reproductions",
      "Type-safety polish across the SDK surface",
      "Hardening retry, idempotency, and error paths",
      "Reviewing release candidates",
    ],
    skills: [
      "TypeScript",
      "Bug bashing",
      "Type-system pedantry",
      "Reading other people's code",
      "Reviewing PRs",
    ],
    achievements: [
      {
        year: "2024",
        title: "First merged PR",
        body: "Fixed a race condition in SIWE nonce consumption that nobody else had reproduced.",
      },
      {
        year: "2025",
        title: "9 merged PRs through public beta",
        body: "Hardened retry, idempotency, and error messages across the SDK.",
      },
      {
        year: "2026",
        title: "Release-candidate reviewer",
        body: "Reviews every RC before it ships to npm. Several would-be regressions caught in their reviews.",
      },
    ],
    contributions: [
      {
        title: "PR #14 — Fix SIWE nonce race",
        body: "First merged community contribution. Resolved a window where two concurrent sign-ins could consume the same nonce.",
        href: "https://github.com/dagimabebe/talak-web3/pull/14",
      },
      {
        title: "PR #28 — Stricter `tx.simulate` types",
        body: "Tightened the result type so callers can't accidentally treat a reverted simulation as success.",
        href: "https://github.com/dagimabebe/talak-web3/pull/28",
      },
      {
        title: "PR #41 — Better RPC error messages",
        body: "Replaced opaque provider error pass-through with a normalized `TalakRpcError` carrying chain, method, and provider.",
        href: "https://github.com/dagimabebe/talak-web3/pull/41",
      },
    ],
    funFacts: [
      "Has never used the word `temporary` in a comment.",
      "Has filed more issues than features they've ever requested.",
    ],
  },
];

export function getPerson(slug: string): Person | undefined {
  return TEAM.find((p) => p.slug === slug);
}
