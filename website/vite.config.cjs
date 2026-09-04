import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const basePath = process.env.BASE_PATH || "/";

export default defineConfig(({ command }) => {
  const rawPort = process.env.PORT;
  const port = rawPort ? Number(rawPort) : 5177;

  return {
    base: basePath,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@assets": path.resolve(__dirname, "..", "..", "attached_assets"),
      },
    },
    build: {
      outDir: "dist/public",
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      port,
      allowedHosts: true,
      hmr: {
        overlay: false,
      },
    },
    preview: {
      host: "0.0.0.0",
      port,
      allowedHosts: true,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
  };
});
