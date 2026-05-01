import { createTalakWeb3 } from "talak-web3";
import { MainnetPreset } from "talak-web3/presets";

export const app = createTalakWeb3({
  ...MainnetPreset,
  auth: {
    domain: process.env.SIWE_DOMAIN || "localhost:3000",

    nonceStore: undefined as unknown,
    refreshStore: undefined as unknown,
    revocationStore: undefined as unknown,
  },
});

await app.init();
