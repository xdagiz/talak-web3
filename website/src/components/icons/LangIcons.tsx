import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

import typescriptLogo from "@/assets/logos/typescript.png";
import javascriptLogo from "@/assets/logos/javascript.png";
import npmLogo from "@/assets/logos/npm.png";

type IconProps = SVGProps<SVGSVGElement>;

export function TypeScriptIcon({ className }: { className?: string }) {
  return <img src={typescriptLogo} alt="TypeScript" className={cn("object-contain", className ?? "h-4 w-4")} />;
}

export function JavaScriptIcon({ className }: { className?: string }) {
  return <img src={javascriptLogo} alt="JavaScript" className={cn("object-contain", className ?? "h-4 w-4")} />;
}

export function BashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect width="24" height="24" rx="3" fill="#1A1A1A" />
      <path
        fill="#fff"
        d="m6.4 7.2 4 3.4-4 3.4 1-1.2 2.6-2.2-2.6-2.2-1-1.2Zm5 6.4h4v1.4h-4v-1.4Z"
      />
    </svg>
  );
}

export function EnvIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect width="24" height="24" rx="3" fill="#ECD53F" />
      <path
        fill="#000"
        d="M7.5 7h2v6.4l3.5-6.4h2v10h-2v-6.4l-3.5 6.4h-2V7Z"
      />
    </svg>
  );
}

export function JsonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect width="24" height="24" rx="3" fill="#1E1E1E" />
      <path
        fill="#FFCA28"
        d="M9 6c-1.7 0-2.5.85-2.5 2.5V11c0 1-.5 1.4-1.5 1.4v1.2c1 0 1.5.4 1.5 1.4v2.5c0 1.65.8 2.5 2.5 2.5h.5v-1.2H9c-.95 0-1.3-.4-1.3-1.4v-2.4c0-1.05-.45-1.7-1.45-1.9 1-.2 1.45-.85 1.45-1.9V8.6c0-1 .35-1.4 1.3-1.4h.5V6H9Zm6 0h-.5v1.2h.5c.95 0 1.3.4 1.3 1.4V11c0 1.05.45 1.7 1.45 1.9-1 .2-1.45.85-1.45 1.9v2.4c0 1-.35 1.4-1.3 1.4h-.5V20h.5c1.7 0 2.5-.85 2.5-2.5V15c0-1 .5-1.4 1.5-1.4v-1.2c-1 0-1.5-.4-1.5-1.4V8.5C17.5 6.85 16.7 6 15 6Z"
      />
    </svg>
  );
}

export function NpmIcon({ className }: { className?: string }) {
  return <img src={npmLogo} alt="npm" className={cn("object-contain", className ?? "h-4 w-4")} />;
}

export const LANG_ICONS: Record<string, (p: { className?: string }) => JSX.Element> = {
  ts:    TypeScriptIcon,
  tsx:   TypeScriptIcon,
  js:    JavaScriptIcon,
  jsx:   JavaScriptIcon,
  bash:  BashIcon,
  shell: BashIcon,
  sh:    BashIcon,
  env:   EnvIcon,
  json:  JsonIcon,
  npm:   NpmIcon,
};

export function LangIcon({ lang, className = "h-4 w-4" }: { lang: string; className?: string }) {
  const Comp = LANG_ICONS[lang.toLowerCase()] ?? TypeScriptIcon;
  return <Comp className={className} />;
}
