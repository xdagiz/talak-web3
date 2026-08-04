import { defineConfig } from "vitest/config";

import { packageTestConfig } from "../../vitest.config";

export default defineConfig(
  packageTestConfig({ thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 } }),
);
