import { z } from 'zod';
import { ChainSchema, PluginSchema, TalakWeb3ConfigSchema } from './schema';
export const MainnetPreset = {
    chains: [
        {
            id: 1,
            name: 'Ethereum Mainnet',
            rpcUrls: ['https://cloudflare-eth.com'],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
    ],
};
export const PolygonPreset = {
    chains: [
        {
            id: 137,
            name: 'Polygon Mainnet',
            rpcUrls: ['https://polygon-rpc.com'],
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        },
    ],
};
export class ConfigManager {
    static validate(config) {
        return TalakWeb3ConfigSchema.parse(config);
    }
    static fromPreset(preset) {
        const presets = {
            mainnet: MainnetPreset,
            polygon: PolygonPreset,
        };
        return this.validate(presets[preset]);
    }
    static merge(base, override) {
        return this.validate({ ...base, ...override });
    }
}
