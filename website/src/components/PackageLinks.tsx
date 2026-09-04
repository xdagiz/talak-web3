import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

import npmLogo from "@/assets/logos/npm.png";
import githubLogo from "@/assets/logos/github.png";

interface Props {
  github: string;
  npm: string;
  size?: "sm" | "md";
  className?: string;
}

function NpmIcon({ className }: { className?: string }) {
  return <img src={npmLogo} alt="npm" className={cn("object-contain", className)} />;
}

function GitHubIcon({ className }: { className?: string }) {
  return <img src={githubLogo} alt="GitHub" className={cn("object-contain", className)} />;
}

export function PackageLinks({ github, npm, size = "sm", className = "" }: Props) {
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const padding = size === "sm" ? "h-7 px-2 text-[11px]" : "h-9 px-3 text-[12.5px]";
  return (
    <div className={`inline-flex items-center gap-1 ${className}`} onClick={e => e.stopPropagation()}>
      <a
        href={npm}
        target="_blank"
        rel="noreferrer"
        title="View on npm"
        className={`inline-flex items-center gap-1.5 ${padding} border border-border text-foreground/65 hover:text-foreground hover:border-foreground/40 transition-colors font-mono`}
        aria-label="View on npm"
      >
        <NpmIcon className={icon} />
        <span>npm</span>
      </a>
      <a
        href={github}
        target="_blank"
        rel="noreferrer"
        title="View source on GitHub"
        className={`inline-flex items-center gap-1.5 ${padding} border border-border text-foreground/65 hover:text-foreground hover:border-foreground/40 transition-colors font-mono`}
        aria-label="View source on GitHub"
      >
        <GitHubIcon className={icon} />
        <span>source</span>
      </a>
    </div>
  );
}

export { GitHubIcon, NpmIcon };

export function ExternalLinkSmall({ className }: { className?: string }) {
  return <ExternalLink className={className ?? "h-3 w-3"} />;
}
