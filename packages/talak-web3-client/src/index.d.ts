export interface TokenStorage {
    getAccessToken(): string | null;
    setAccessToken(token: string): void;
    getRefreshToken(): string | null;
    setRefreshToken(token: string): void;
    clear(): void;
}

export declare class InMemoryTokenStorage implements TokenStorage {
    private accessToken;
    private refreshToken;
    getAccessToken(): string | null;
    setAccessToken(token: string): void;
    getRefreshToken(): string | null;
    setRefreshToken(token: string): void;
    clear(): void;
}

export declare class CookieTokenStorage implements TokenStorage {
    private accessToken;
    getAccessToken(): string | null;
    setAccessToken(token: string): void;
    getRefreshToken(): string | null;
    setRefreshToken(token: string): void;
    clear(): void;
}
export interface NonceResponse {
    nonce: string;
}
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
}
export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
}
export interface VerifyResponse {
    ok: boolean;
    payload?: {
        address: string;
        chainId: number;
    };
}
export type TalakWeb3ClientOptions = {
    baseUrl: string;
    fetch?: typeof fetch;
    storage?: TokenStorage;
};
export declare class TalakWeb3Client {
    private readonly baseUrl;
    private readonly fetchImpl;
    readonly storage: TokenStorage;
    private refreshPromise;
    constructor(opts: TalakWeb3ClientOptions);

    private request;

    private getOrStartRefresh;

    private getCsrfToken;

    getNonce(address: string): Promise<NonceResponse>;

    loginWithSiwe(message: string, signature: string): Promise<LoginResponse>;

    refresh(refreshToken: string): Promise<RefreshResponse>;

    logout(): Promise<void>;

    verifySession(): Promise<VerifyResponse>;
    getChain(id: number): Promise<unknown>;
    listChains(): Promise<unknown>;
    rpcCall(chainId: number, method: string, params: unknown[]): Promise<unknown>;
}
