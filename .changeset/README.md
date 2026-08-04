# Changesets

This repo releases with [Changesets](https://github.com/changesets/changesets).
All published packages are versioned together (see `fixed` in `config.json`).

## Adding a changeset

```bash
pnpm changeset
```

Pick the bump type for `talak-web3` (all other packages follow via `fixed`)
and write a short summary. Commit the generated `.changeset/*.md` file with
your change. The `Version Packages` PR created on `main` will be updated
automatically; merging it triggers the npm publish.
