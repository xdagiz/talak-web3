import { z } from 'zod';
export const ChainSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    rpcUrls: z.array(z.string().url()).min(1),
    nativeCurrency: z.object({
        name: z.string(),
        symbol: z.string(),
        decimals: z.number().int().default(18),
    }),
    blockExplorers: z.array(z.object({
        name: z.string(),
        url: z.string().url(),
    })).optional(),
    testnet: z.boolean().default(false),
});
export const PluginSchema = z.object({
    name: z.string(),
    version: z.string(),
    setup: z.function(),
    teardown: z.function().optional(),
}).passthrough();
export const TalakWeb3ConfigSchema = z.object({
    chains: z.array(ChainSchema).default([]),
    plugins: z.array(z.any()).default([]),
    auth: z.object({
        domain: z.string().optional(),
        uri: z.string().url().optional(),
        version: z.string().default('1'),
    }).optional(),
    rpc: z.object({
        retries: z.number().int().default(7),
        timeout: z.number().int().default(10000),
    }).default({ retries: 7, timeout: 10000 }),
    debug: z.boolean().default(false),
    allowedOrigins: z.array(z.string()).optional(),
    ai: z.object({
        apiKey: z.string().min(1),
        baseUrl: z.string().url().optional(),
        model: z.string().optional(),
    }).optional(),
    ceramic: z.object({
        nodeUrl: z.string().url(),
        seed: z.string().optional(),
    }).optional(),
    tableland: z.object({
        privateKey: z.string().optional(),
        network: z.string().optional(),
    }).optional(),
});
//# sourceMappingURL=schema.js.map