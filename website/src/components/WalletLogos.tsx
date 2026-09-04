import { cn } from "@/lib/utils";

import metamaskLogo from "@/assets/logos/metamask.png";
import walletconnectLogo from "@/assets/logos/walletconnect.png";
import coinbaseLogo from "@/assets/logos/coinbase.png";
import rainbowLogo from "@/assets/logos/rainbow.png";
import phantomLogo from "@/assets/logos/phantom.png";
import ledgerLogo from "@/assets/logos/ledger.png";
import trustwalletLogo from "@/assets/logos/trustwallet.png";
import rabbyLogo from "@/assets/logos/rabby.png";
import frameLogo from "@/assets/logos/frame.png";

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

export const MetaMaskLogo = makeLogo(metamaskLogo, "MetaMask");
export const WalletConnectLogo = makeLogo(walletconnectLogo, "WalletConnect");
export const CoinbaseWalletLogo = makeLogo(coinbaseLogo, "Coinbase Wallet");
export const RainbowLogo = makeLogo(rainbowLogo, "Rainbow");
export const PhantomLogo = makeLogo(phantomLogo, "Phantom");
export const LedgerLogo = makeLogo(ledgerLogo, "Ledger");
export const TrustWalletLogo = makeLogo(trustwalletLogo, "Trust Wallet");
export const RabbyLogo = makeLogo(rabbyLogo, "Rabby");
export const FrameLogo = makeLogo(frameLogo, "Frame");

export const WALLET_LOGOS = [
  { name: "MetaMask",        Logo: MetaMaskLogo,        href: "https://metamask.io",         connector: "metamask"     },
  { name: "WalletConnect",   Logo: WalletConnectLogo,   href: "https://walletconnect.com",   connector: "walletconnect" },
  { name: "Coinbase Wallet", Logo: CoinbaseWalletLogo,  href: "https://wallet.coinbase.com", connector: "coinbase"     },
  { name: "Rainbow",         Logo: RainbowLogo,         href: "https://rainbow.me",          connector: "rainbow"      },
  { name: "Phantom",         Logo: PhantomLogo,         href: "https://phantom.app",         connector: "phantom"      },
  { name: "Rabby",           Logo: RabbyLogo,           href: "https://rabby.io",            connector: "rabby"        },
  { name: "Frame",           Logo: FrameLogo,           href: "https://frame.sh",            connector: "frame"        },
  { name: "Ledger",          Logo: LedgerLogo,          href: "https://www.ledger.com",      connector: "ledger"       },
  { name: "Trust Wallet",    Logo: TrustWalletLogo,     href: "https://trustwallet.com",     connector: "trust"        },
];