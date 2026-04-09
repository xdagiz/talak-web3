import { talakWeb3 } from 'talak-web3';
import { MainnetPreset } from 'talak-web3/presets';

export const app = talakWeb3({
  ...MainnetPreset,
  auth: {
    domain: process.env.SIWE_DOMAIN || 'localhost:3000',
    secret: process.env.JWT_SECRET!,
  },
});

// Initialize on startup
await app.init();
