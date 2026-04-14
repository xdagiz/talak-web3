# Contributing to talak-web3

Thanks for contributing to `talak-web3`.
This project prioritizes deterministic behavior, security, and clear operational guarantees.

## Getting Started

1. Fork the repository and create a feature branch.
2. Use Node.js `>=20.12.0`.
3. Use `pnpm` `>=9`.
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