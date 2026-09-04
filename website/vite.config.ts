import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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
        "@talak-web3/client": path.resolve(__dirname, "../packages/client/src"),
        "@talak-web3/core": path.resolve(__dirname, "../packages/core/src"),
        "@talak-web3/auth": path.resolve(__dirname, "../packages/auth/src"),
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
      proxy: {
        // Dev convenience only: forward talak-web3 API calls to the local
        // Hono backend so the TalakWeb3Client can reach it during development.
        // Production static hosts serve the SPA directly (no backend needed).
        "/auth": {
          target: "http://localhost:8787",
          changeOrigin: true,
        },
        "/rpc": {
          target: "http://localhost:8787",
          changeOrigin: true,
        },
        "/integrations": {
          target: "http://localhost:8787",
          changeOrigin: true,
        },
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
