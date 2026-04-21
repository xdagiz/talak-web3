import { createTalakWeb3 } from 'talak-web3';
import { MainnetPreset } from 'talak-web3/presets';

export const app = createTalakWeb3({
  ...MainnetPreset,
  auth: {
    domain: process.env.SIWE_DOMAIN || 'localhost:3000',
    // Stores are mandatory (e.g. RedisNonceStore)
    nonceStore: undefined as any,
    refreshStore: undefined as any,
    revocationStore: undefined as any,
  },
});

// Initialize on startup (Mandatory)
await app.init();
