import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

import alchemyLogo from "@/assets/logos/alchemy.png";
import discordLogo from "@/assets/logos/discord.png";
import ethersLogo from "@/assets/logos/ethers.png";
import githubLogo from "@/assets/logos/github.png";
import nextLogo from "@/assets/logos/next.png";
import nodeLogo from "@/assets/logos/node.png";
import reactLogo from "@/assets/logos/react.png";
import thegraphLogo from "@/assets/logos/thegraph.png";
import vueLogo from "@/assets/logos/vue.png";
import wagmiLogo from "@/assets/logos/wagmi.png";

type BrandIconProps = {
  className?: string;
};

function makeLogo(src: string, alt: string) {
  return function BrandLogo({ className }: BrandIconProps) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("object-contain", className)}
        loading="lazy"
      />
    );
  };
}

export const brandIcons: Record<string, ComponentType<BrandIconProps>> = {
  github: makeLogo(githubLogo, "GitHub"),
  discord: makeLogo(discordLogo, "Discord"),
  thegraph: makeLogo(thegraphLogo, "The Graph"),
  alchemy: makeLogo(alchemyLogo, "Alchemy"),
  react: makeLogo(reactLogo, "React"),
  next: makeLogo(nextLogo, "Next.js"),
  node: makeLogo(nodeLogo, "Node.js"),
  vue: makeLogo(vueLogo, "Vue"),
  wagmi: makeLogo(wagmiLogo, "wagmi"),
  ethers: makeLogo(ethersLogo, "ethers.js"),
};

export const GitHubIcon = makeLogo(githubLogo, "GitHub");
export const DiscordIcon = makeLogo(discordLogo, "Discord");
export const TheGraphIcon = makeLogo(thegraphLogo, "The Graph");
export const AlchemyIcon = makeLogo(alchemyLogo, "Alchemy");
export const ReactIcon = makeLogo(reactLogo, "React");
export const NextJsIcon = makeLogo(nextLogo, "Next.js");
export const NodeJsIcon = makeLogo(nodeLogo, "Node.js");
export const VueIcon = makeLogo(vueLogo, "Vue");
export const WagmiIcon = makeLogo(wagmiLogo, "wagmi");
export const EthersIcon = makeLogo(ethersLogo, "ethers.js");