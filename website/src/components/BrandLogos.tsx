import { cn } from "@/lib/utils";

import typescriptLogo from "@/assets/logos/typescript.png";
import javascriptLogo from "@/assets/logos/javascript.png";
import nodeLogo from "@/assets/logos/node.png";
import reactLogo from "@/assets/logos/react.png";
import nextLogo from "@/assets/logos/next.png";
import viteLogo from "@/assets/logos/vite.png";
import vueLogo from "@/assets/logos/vue.png";
import svelteLogo from "@/assets/logos/svelte.png";
import pythonLogo from "@/assets/logos/python.png";
import goLogo from "@/assets/logos/go.png";
import bunLogo from "@/assets/logos/bun.png";
import denoLogo from "@/assets/logos/deno.png";
import solidityLogo from "@/assets/logos/solidity.png";

interface LogoProps {
  className?: string;
}

const base = "h-7 w-7";

function makeLogo(src: string, alt: string) {
  return function Logo({ className }: LogoProps) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("object-contain", className ?? base)}
        loading="lazy"
      />
    );
  };
}

export const TypeScriptLogo = makeLogo(typescriptLogo, "TypeScript");
export const JavaScriptLogo = makeLogo(javascriptLogo, "JavaScript");
export const NodeLogo = makeLogo(nodeLogo, "Node.js");
export const ReactLogo = makeLogo(reactLogo, "React");
export const NextjsLogo = makeLogo(nextLogo, "Next.js");
export const ViteLogo = makeLogo(viteLogo, "Vite");
export const VueLogo = makeLogo(vueLogo, "Vue");
export const SvelteLogo = makeLogo(svelteLogo, "Svelte");
export const PythonLogo = makeLogo(pythonLogo, "Python");
export const GoLogo = makeLogo(goLogo, "Go");
export const BunLogo = makeLogo(bunLogo, "Bun");
export const DenoLogo = makeLogo(denoLogo, "Deno");
export const SolidityLogo = makeLogo(solidityLogo, "Solidity");

export const FRAMEWORK_LOGOS = [
  { name: "TypeScript", Logo: TypeScriptLogo, href: "https://www.typescriptlang.org" },
  { name: "JavaScript", Logo: JavaScriptLogo, href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
  { name: "Node.js",    Logo: NodeLogo,       href: "https://nodejs.org" },
  { name: "React",      Logo: ReactLogo,      href: "https://react.dev" },
  { name: "Next.js",    Logo: NextjsLogo,     href: "https://nextjs.org" },
  { name: "Vite",       Logo: ViteLogo,       href: "https://vite.dev" },
  { name: "Vue",        Logo: VueLogo,        href: "https://vuejs.org" },
  { name: "Svelte",     Logo: SvelteLogo,     href: "https://svelte.dev" },
  { name: "Python",     Logo: PythonLogo,     href: "https://www.python.org" },
  { name: "Go",         Logo: GoLogo,         href: "https://go.dev" },
  { name: "Bun",        Logo: BunLogo,        href: "https://bun.sh" },
  { name: "Deno",       Logo: DenoLogo,       href: "https://deno.com" },
  { name: "Solidity",   Logo: SolidityLogo,   href: "https://soliditylang.org" },
];