import type { Metadata } from "next";
import { TalakProvider } from "talak-web3/react";

import "./globals.css";

export const metadata: Metadata = {
  title: "talak-web3 App",
  description: "Built with talak-web3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TalakProvider
          config={{
            apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
          }}
        >
          {children}
        </TalakProvider>
      </body>
    </html>
  );
}
