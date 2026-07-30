export interface ScaffoldTemplate {
  readonly id: string;
  readonly scripts: Readonly<Record<string, string>>;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly devDependencies: Readonly<Record<string, string>>;
  readonly isNextjs: boolean;
}

/** Scaffold templates for quick-start project setup, used by `@talak-web3/cli init`. */
export const Templates: Readonly<Record<string, ScaffoldTemplate>> = {
  nextjs: {
    id: "nextjs",
    scripts: {
      build: "tsc",
      typecheck: "tsc --noEmit",
      lint: "eslint src/",
      dev: "next dev",
      start: "next start",
    },
    dependencies: {
      "@talak-web3/auth": "latest",
      "@talak-web3/core": "latest",
      next: "^14.0.0",
      react: "^18.0.0",
      "react-dom": "^18.0.0",
      viem: "^2.0.0",
    },
    devDependencies: {
      "@types/react": "^18.0.0",
      "@types/react-dom": "^18.0.0",
      typescript: "^5.0.0",
    },
    isNextjs: true,
  },
  hono: {
    id: "hono",
    scripts: {
      build: "tsc",
      typecheck: "tsc --noEmit",
      lint: "eslint src/",
      dev: "tsx watch src/index.ts",
      start: "node dist/index.js",
    },
    dependencies: {
      "@talak-web3/auth": "latest",
      "@talak-web3/core": "latest",
      hono: "^4.0.0",
    },
    devDependencies: {
      tsx: "^4.0.0",
      typescript: "^5.0.0",
    },
    isNextjs: false,
  },
  react: {
    id: "react",
    scripts: {
      build: "tsc && vite build",
      typecheck: "tsc --noEmit",
      lint: "eslint src/",
      dev: "vite",
      preview: "vite preview",
    },
    dependencies: {
      "@talak-web3/auth": "latest",
      "@talak-web3/core": "latest",
      react: "^18.0.0",
      "react-dom": "^18.0.0",
    },
    devDependencies: {
      "@types/react": "^18.0.0",
      "@types/react-dom": "^18.0.0",
      typescript: "^5.0.0",
      vite: "^5.0.0",
    },
    isNextjs: false,
  },
  express: {
    id: "express",
    scripts: {
      build: "tsc",
      typecheck: "tsc --noEmit",
      lint: "eslint src/",
      dev: "tsx watch src/index.ts",
      start: "node dist/index.js",
    },
    dependencies: {
      "@talak-web3/auth": "latest",
      "@talak-web3/core": "latest",
      express: "^4.18.0",
    },
    devDependencies: {
      "@types/express": "^4.17.0",
      tsx: "^4.0.0",
      typescript: "^5.0.0",
    },
    isNextjs: false,
  },
  nestjs: {
    id: "nestjs",
    scripts: {
      build: "tsc",
      typecheck: "tsc --noEmit",
      lint: "eslint src/",
      dev: "nest start --watch",
      start: "node dist/main.js",
    },
    dependencies: {
      "@talak-web3/auth": "latest",
      "@talak-web3/core": "latest",
      "@nestjs/common": "^10.0.0",
      "@nestjs/core": "^10.0.0",
      "@nestjs/platform-express": "^10.0.0",
    },
    devDependencies: {
      "@nestjs/cli": "^10.0.0",
      tsx: "^4.0.0",
      typescript: "^5.0.0",
    },
    isNextjs: false,
  },
  sveltekit: {
    id: "sveltekit",
    scripts: {
      build: "vite build",
      typecheck: "tsc --noEmit",
      lint: "eslint src/",
      dev: "vite dev",
      preview: "vite preview",
    },
    dependencies: {
      "@talak-web3/auth": "latest",
      "@talak-web3/core": "latest",
    },
    devDependencies: {
      typescript: "^5.0.0",
      vite: "^5.0.0",
    },
    isNextjs: false,
  },
};

/** All template ids, in registry order. Derived so the list can never drift from `Templates`. */
export const TEMPLATE_IDS: readonly string[] = Object.keys(Templates);
