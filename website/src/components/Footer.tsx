import { Link } from "react-router-dom";
import { Twitter, Youtube } from "lucide-react";

import { cn } from "@/lib/utils";

import { TalakMark } from "./TalakMark";

import githubLogo from "@/assets/logos/github.png";
import discordLogo from "@/assets/logos/discord.png";
import telegramLogo from "@/assets/logos/telegram.png";
import farcasterLogo from "@/assets/logos/farcaster.png";
import mirrorLogo from "@/assets/logos/mirror.png";

function DiscordIcon({ className = "" }: { className?: string }) {
  return <img src={discordLogo} alt="Discord" className={cn("object-contain", className)} />;
}

function TelegramIcon({ className = "" }: { className?: string }) {
  return <img src={telegramLogo} alt="Telegram" className={cn("object-contain", className)} />;
}

function FarcasterIcon({ className = "" }: { className?: string }) {
  return <img src={farcasterLogo} alt="Farcaster" className={cn("object-contain", className)} />;
}

function MirrorIcon({ className = "" }: { className?: string }) {
  return <img src={mirrorLogo} alt="Mirror" className={cn("object-contain", className)} />;
}

function GithubIcon({ className = "" }: { className?: string }) {
  return <img src={githubLogo} alt="GitHub" className={cn("object-contain", className)} />;
}

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Packages", href: "/packages" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Status", href: "/status" },
      { label: "Roadmap", href: "/changelog#roadmap" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Install", href: "/install" },
      { label: "Quickstart", href: "/docs#quickstart" },
      { label: "API reference", href: "/docs#api" },
      { label: "SDKs", href: "/packages" },
      { label: "GitHub", href: "https://github.com/dagimabebe/talak-web3", external: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Tutorials", href: "/docs#tutorials" },
      { label: "Examples", href: "/docs#examples" },
      { label: "Templates", href: "/packages?cat=starter" },
      { label: "Community", href: "https://discord.gg/talak-web3", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/about#careers" },
      { label: "Contact", href: "mailto:hi@talak-web3.dev", external: true },
      { label: "Brand kit", href: "/about#brand" },
      { label: "Press", href: "/about#press" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Security", href: "/legal/security" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Acceptable use", href: "/legal/acceptable-use" },
    ],
  },
];

export const SOCIAL_LINKS: { label: string; href: string; Icon: (p: { className?: string }) => JSX.Element }[] = [
  { label: "GitHub",    href: "https://github.com/dagimabebe/talak-web3", Icon: GithubIcon },
  { label: "Discord",   href: "https://discord.gg/talak-web3",            Icon: DiscordIcon },
  { label: "Telegram",  href: "https://t.me/talakweb3",                   Icon: TelegramIcon },
  { label: "X",         href: "https://x.com/talakweb3",                  Icon: ({ className }) => <Twitter className={className} /> },
  { label: "YouTube",   href: "https://youtube.com/@talakweb3",           Icon: ({ className }) => <Youtube className={className} /> },
  { label: "Farcaster", href: "https://warpcast.com/talakweb3",           Icon: FarcasterIcon },
  { label: "Mirror",    href: "https://mirror.xyz/talakweb3.eth",         Icon: MirrorIcon },
];

export function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-[1200px] px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 -ml-0.5">
            <TalakMark className="h-5 w-5 text-foreground" />
            <span className="text-[12px] font-bold text-foreground uppercase tracking-[0.08em]">talak-web3</span>
          </Link>
          <SocialRow size="sm" />
          <span className="text-[12px] text-muted-foreground">© {new Date().getFullYear()} talak-web3</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 border-t border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        {/* Top row — brand + tagline + socials */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-border">
          <div className="md:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <TalakMark className="h-6 w-6 text-foreground" />
              <span className="text-[13px] font-bold text-foreground uppercase tracking-[0.08em]">
                talak-web3
              </span>
            </Link>
            <p className="text-[13px] leading-[1.7] text-muted-foreground max-w-[280px] mb-6">
              The cohesive Web3 SDK. Auth · RPC · Tx · Identity — one install, every chain.
            </p>
            <SocialRow />
            <p className="text-[11px] text-muted-foreground/70 mt-6 max-w-[280px] leading-[1.6]">
              Subscribe to <Link to="/blog" className="underline hover:text-foreground">our changelog</Link> to get
              releases and security advisories.
            </p>
          </div>

          {/* Link columns */}
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-5 gap-8">
            {COLUMNS.map(col => (
              <div key={col.title}>
                <h3 className="text-[11px] uppercase tracking-[0.14em] font-medium text-foreground mb-4">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.href + link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} talak-web3 — built with care, shipped open-source.
          </span>
          <div className="flex items-center gap-4">
            <Link to="/status" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              All systems operational
            </Link>
            <span className="text-[12px] text-muted-foreground">v1.0.12</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SocialRow({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icn = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SOCIAL_LINKS.map(s => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          aria-label={s.label}
          title={s.label}
          className={`inline-flex items-center justify-center ${dim} border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors rounded-sm`}
        >
          <s.Icon className={icn} />
        </a>
      ))}
    </div>
  );
}

export default Footer;
