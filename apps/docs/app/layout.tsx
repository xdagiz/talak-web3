import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // TODO: change this to the actual domain in the future
  metadataBase: new URL("https://talak-web3.com"),
  title: {
    default: "Talak Web3",
    template: "%s | Talak Web3",
  },
  description:
    "Server-side SIWE authentication, RPC failover, and account abstraction for modern Web3 applications.",
  keywords: [
    "Web3",
    "SIWE",
    "Ethereum",
    "Authentication",
    "RPC",
    "Account Abstraction",
    "TypeScript",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    // TODO: change this to the actual domain in the future
    url: "https://talak-web3.com",
    siteName: "Talak Web3",
    title: "Talak Web3",
    description:
      "Server-side SIWE authentication, RPC failover, and account abstraction for modern Web3 applications.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Talak Web3",
    description:
      "Server-side SIWE authentication, RPC failover, and account abstraction for modern Web3 applications.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
