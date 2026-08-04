import { defineConfig } from "vitest/config";

import { packageTestConfig } from "../../vitest.config";

export default defineConfig(
  packageTestConfig({ thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 } }),
);
