import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="logo" width={24} height={24} />
          <h2 className="font-semibold text-lg">Talak Web3</h2>
        </div>
      ),
    },
    githubUrl: "https://github.com/talak-web3/talak-web3",
  };
}
