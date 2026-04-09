/**
 * talak-web3
 * (C) 2026 talak-web3 Team
 */

// Core Factory
export { talakWeb3 } from '@talak-web3/core';

// Client & Session Manager
export { 
  TalakWeb3Client, 
  InMemoryTokenStorage, 
  CookieTokenStorage 
} from '@talak-web3/client';

// Presets & Configuration
export {
  MainnetPreset,
  PolygonPreset,
  ConfigManager
} from '@talak-web3/config';

// Stable Types
export type {
  TalakWeb3Instance,
  TalakWeb3Context,
  TalakWeb3Plugin,
  TalakWeb3BaseConfig,
} from '@talak-web3/types';

export { MultiChainRouter, estimateEip1559Fees } from './multichain.js';

export type {
  TokenStorage,
  NonceResponse,
  LoginResponse,
  RefreshResponse,
  VerifyResponse
} from '@talak-web3/client';
