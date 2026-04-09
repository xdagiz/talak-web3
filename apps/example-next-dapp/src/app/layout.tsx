import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'TalakWeb3 Example Dapp',
  description: 'Example Next.js dapp using talak-web3',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui' }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

