import { z } from 'zod';
export declare const ChainSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    rpcUrls: z.ZodArray<z.ZodString>;
    nativeCurrency: z.ZodObject<{
        name: z.ZodString;
        symbol: z.ZodString;
        decimals: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    blockExplorers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodString;
    }, z.core.$strip>>>;
    testnet: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const PluginSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodString;
    setup: z.ZodFunction<z.core.$ZodFunctionArgs, z.core.$ZodFunctionOut>;
    teardown: z.ZodOptional<z.ZodFunction<z.core.$ZodFunctionArgs, z.core.$ZodFunctionOut>>;
}, z.core.$loose>;
export declare const TalakWeb3ConfigSchema: z.ZodObject<{
    chains: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        rpcUrls: z.ZodArray<z.ZodString>;
        nativeCurrency: z.ZodObject<{
            name: z.ZodString;
            symbol: z.ZodString;
            decimals: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        blockExplorers: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            url: z.ZodString;
        }, z.core.$strip>>>;
        testnet: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    plugins: z.ZodDefault<z.ZodArray<z.ZodAny>>;
    auth: z.ZodOptional<z.ZodObject<{
        domain: z.ZodOptional<z.ZodString>;
        uri: z.ZodOptional<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    rpc: z.ZodDefault<z.ZodObject<{
        retries: z.ZodDefault<z.ZodNumber>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    debug: z.ZodDefault<z.ZodBoolean>;
    allowedOrigins: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ai: z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodString;
        baseUrl: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    ceramic: z.ZodOptional<z.ZodObject<{
        nodeUrl: z.ZodString;
        seed: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    tableland: z.ZodOptional<z.ZodObject<{
        privateKey: z.ZodOptional<z.ZodString>;
        network: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TalakWeb3Config = z.infer<typeof TalakWeb3ConfigSchema>;
export type Chain = z.infer<typeof ChainSchema>;
