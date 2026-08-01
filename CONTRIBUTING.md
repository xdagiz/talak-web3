# Contributing to talak-web3

Thanks for contributing to `talak-web3`.
This project prioritizes deterministic behavior, security, and clear operational guarantees.

## Getting Started

1. Fork the repository and create a feature branch.
2. Use Node.js `>=24`.
3. Use Corepack to manage the pinned `pnpm` version:

   ```bash
   corepack enable
   pnpm --version
   ```

4. Review `.env.example`.

## Building the Monorepo

```bash
pnpm install
pnpm build
```

## Running the Test Suite

Our continuous integration executes strict code standards.

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Running Tests for a Single Package

```bash
# Run tests for a specific package
pnpm --filter @talak-web3/core test

# Run typecheck for a single package
pnpm --filter @talak-web3/auth typecheck

# Run a specific test file
pnpm vitest run packages/core/src/__tests__/middleware.test.ts
```

## Adding a New Package

1. Create the package directory under `packages/`:
   ```bash
   mkdir -p packages/my-package/src
   ```
2. Create `packages/my-package/package.json` with the `@talak-web3/` scope.
3. Create `packages/my-package/tsconfig.json` extending the root config.
4. Create `packages/my-package/tsdown.config.ts` with entry `src/index.ts`.
5. Add the package to the root `turbo.json` pipeline if needed.
6. Add internal dependencies via `workspace:*` in `package.json`.

## Security Issue Reporting

If you discover a security vulnerability, **do not** open a public GitHub issue.

Instead, email the maintainers directly or use GitHub's private vulnerability reporting feature.
We will respond within 48 hours and coordinate a fix before any public disclosure.

## Pull Request Checklist

- Include tests for new behavior.
- Keep changes scoped and documented.
- Ensure `pnpm build`, `pnpm typecheck`, and `pnpm test` pass.
- Do not weaken security invariants listed below.

### Adversarial Auth Tests

If you change auth/session routing, your PR should pass `apps/hono-backend/src/server.test.ts` with deterministic behavior under concurrent conditions.

## Security and Architectural Invariants

Contributors must ensure that no pull request weakens the following core guarantees:

- **Authentication Determinism**: All auth flows must remain atomic and backed by Redis in production.
- **Fail-Closed Behavior**: Infrastructure degradation (Redis/RPC failure) must result in a secure fail-closed state, never a fallback to unauthenticated or unverified modes.

## Mandatory Standards

- **Type Safety**: Avoid `any` unless clearly justified and documented.
- **Test Coverage**: All new logic must include comprehensive unit and integration tests.
- **Zod Validation**: All external data inputs must be strictly validated using Zod schemas at the edge.

## Pull Request Rejection Criteria

PRs will be rejected immediately if they contain:

- **Vague Logic**: Non-deterministic behavior or "best-effort" security implementations.
- **Missing Edge-Cases**: Failure to explicitly handle Redis timeouts, network partitions, or malformed SIWE signatures.
- **Bypassing Invariants**: Any attempt to introduce in-memory fallbacks for production-critical paths.

## Code of Conduct

Please review `CODE_OF_CONDUCT.md`.

Thank you for helping **Web3** keepsecure!

make web3 talak again!

### `talak-web3`
