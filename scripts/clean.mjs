import { rm } from "node:fs/promises";

const paths = [".turbo", "node_modules", "coverage"];

await Promise.all(
  paths.map(async (p) => {
    try {
      await rm(new URL(`../${p}`, import.meta.url), { recursive: true, force: true });
    } catch {

    }
  }),
);
