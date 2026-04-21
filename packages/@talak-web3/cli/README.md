# @talak-web3/cli

Command-line interface for scaffolding and maintaining [talak-web3](https://github.com/dagimabebe/talak-web3) projects.

## Installation

```bash
pnpm add -D @talak-web3/cli

npx talak-web3 --help
npx talak --help
```

The package publishes three binaries: **`talak`**, **`talak-web3`**, and **`create-talak-web3`** (same entry). The program name shown in help is `talak`.

## Commands

| Command | Description |
|--------|-------------|
| `init [name]` | Create a project from a template (`nextjs`, `react`, `hono`, `express`, `nestjs`, `sveltekit`). Options: `-t, --template`, `-f, --force`. |
| `add [integration]` | Add an integration to the project. `-p, --project` for a path. |
| `doctor` | Run health checks (package.json, `talak-web3` dependency, etc.). `-p, --project`. |
| `check` | Same as `doctor`. |
| `info` | Print Node version, cwd, and a short `package.json` summary. `-p, --project`. |
| `docs` | Print links to the repo, issues, and npm scope search. |
| `deps` | List `talak-web3` and `@talak-web3/*` entries from dependencies. `-p, --project`. |
| `env` | Show **whether** common env vars are set (values are never printed). |
| `generate <type> <name>` | Generate code (e.g. component, hook, api-route). `-p, --project`. |
| `dev` | Start the dev server. `-p, --port`, `-h, --host`. |

## Examples

```bash
talak-web3 init my-app --template nextjs
talak-web3 doctor
talak-web3 check -p ./apps/web
talak-web3 info
talak-web3 deps
talak-web3 env
```

## Development

```bash
pnpm --filter @talak-web3/cli build
pnpm --filter @talak-web3/cli dev
```

## License

MIT
