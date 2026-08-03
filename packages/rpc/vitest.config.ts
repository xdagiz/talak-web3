import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { packageTestConfig } from "../../vitest.config";

export default defineConfig({
  ...packageTestConfig({
    thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
  }),
  resolve: {
    alias: {
      "@talak-web3/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
});
