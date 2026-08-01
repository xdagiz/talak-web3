# @talak-web3/templates

Programmatic scaffold templates used by **`@talak-web3/cli`** when you run `talak-web3 init`. Each template is a structured definition of scripts, runtime dependencies, and dev dependencies.

## What's included

- **`nextjs`** — Next.js with React and the Next.js integration config (`isNextjs: true`).
- **`react`** — Vite + React.
- **`hono`** — Hono server.
- **`express`** — Express server.
- **`nestjs`** — NestJS server.
- **`sveltekit`** — SvelteKit with Vite.

## Usage (library)

```ts
import { Templates, TEMPLATE_IDS } from "@talak-web3/templates";

const tpl = Templates.nextjs;
tpl.scripts.dev; // "next dev"
tpl.dependencies; // runtime deps (e.g. "@talak-web3/core")
tpl.devDependencies; // dev deps (e.g. typescript)
tpl.isNextjs; // selects the Next.js variant of talak.config.ts

TEMPLATE_IDS; // ["nextjs", "hono", "react", "express", "nestjs", "sveltekit"]
```

The CLI merges the template's scripts and dependencies into the generated project's `package.json` and uses `isNextjs` to pick the `talak.config.ts` variant.

## Development

```bash
pnpm --filter @talak-web3/templates build
pnpm --filter @talak-web3/templates typecheck
pnpm --filter @talak-web3/templates test
```

## License

MIT
