import { defineConfig } from "tsdown";

import { talakWeb3Config } from "../../tsdown.base.ts";

export default defineConfig(
  talakWeb3Config({
    entry: {
      index: "src/index.ts",
      "index.react": "src/index.react.tsx",
    },
  }),
);
