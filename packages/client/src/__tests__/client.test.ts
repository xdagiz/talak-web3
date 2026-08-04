import { InMemoryTokenStorage, CookieTokenStorage, TalakWeb3Client } from "@talak-web3/client";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("InMemoryTokenStorage", () => {
  let storage: InMemoryTokenStorage;

  beforeEach(() => {
    storage = new InMemoryTokenStorage();
  });

  it("starts with null tokens", () => {
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it("stores and retrieves access token", () => {
    storage.setAccessToken("access-123");
    expect(storage.getAccessToken()).toBe("access-123");
  });

  it("stores and retrieves refresh token", () => {
    storage.setRefreshToken("refresh-456");
    expect(storage.getRefreshToken()).toBe("refresh-456");
  });

  it("clears both tokens", () => {
    storage.setAccessToken("a");
    storage.setRefreshToken("r");
    storage.clear();
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });
});

describe("TalakWeb3Client", () => {
  function createMockFetch(responses: { status?: number; body?: unknown; ok?: boolean }[]) {
    let callIndex = 0;
    return vi.fn(async () => {
      const res = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return {
        ok: res.ok ?? (res.status ?? 200) < 400,
        status: res.status ?? 200,
        json: async () => res.body ?? {},
        text: async () => JSON.stringify(res.body ?? ""),
      } as Response;
    });
  }

  describe("getNonce", () => {
    it("calls /auth/nonce with address", async () => {
      const fetchMock = createMockFetch([{ body: { nonce: "abc123" } }]);
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
      });

      const result = await client.getNonce("0x1234");
      expect(result).toEqual({ nonce: "abc123" });
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/auth/nonce",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("loginWithSiwe", () => {
    it("stores tokens on success", async () => {
      const fetchMock = createMockFetch([{ body: { accessToken: "at", refreshToken: "rt" } }]);
      const storage = new InMemoryTokenStorage();
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
        storage,
      });

      const result = await client.loginWithSiwe("siwe-msg", "sig-123");
      expect(result).toEqual({ accessToken: "at", refreshToken: "rt" });
      expect(storage.getAccessToken()).toBe("at");
      expect(storage.getRefreshToken()).toBe("rt");
    });

    it("sends the CSRF token header when a csrf_token cookie is present", async () => {
      const fetchMock = createMockFetch([{ body: { accessToken: "at", refreshToken: "rt" } }]);
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
        storage: new InMemoryTokenStorage(),
      });

      (globalThis as { document?: { cookie: string } }).document = {
        cookie: "csrf_token=csrf-abc123; other=1",
      };
      try {
        await client.loginWithSiwe("siwe-msg", "sig-123");
        expect(fetchMock).toHaveBeenCalledWith(
          "http://localhost:3000/auth/login",
          expect.objectContaining({
            headers: expect.objectContaining({ "x-csrf-token": "csrf-abc123" }),
          }),
        );
      } finally {
        delete (globalThis as { document?: unknown }).document;
      }
    });

    it("throws on failure", async () => {
      const fetchMock = createMockFetch([{ status: 401, ok: false, body: "Unauthorized" }]);
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
      });

      await expect(client.loginWithSiwe("msg", "sig")).rejects.toThrow("Login failed");
    });
  });

  describe("logout", () => {
    it("clears storage when no refresh token", async () => {
      const fetchMock = createMockFetch([]);
      const storage = new InMemoryTokenStorage();
      storage.setAccessToken("at");
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
        storage,
      });

      await client.logout();
      expect(storage.getAccessToken()).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("calls /auth/logout and clears storage", async () => {
      const fetchMock = createMockFetch([{ body: { ok: true } }]);
      const storage = new InMemoryTokenStorage();
      storage.setAccessToken("at");
      storage.setRefreshToken("rt");
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
        storage,
      });

      await client.logout();
      expect(storage.getAccessToken()).toBeNull();
      expect(storage.getRefreshToken()).toBeNull();
    });
  });

  describe("refresh", () => {
    it("stores new tokens on refresh", async () => {
      const fetchMock = createMockFetch([
        { body: { accessToken: "new-at", refreshToken: "new-rt" } },
      ]);
      const storage = new InMemoryTokenStorage();
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
        storage,
      });

      const result = await client.refresh("old-rt");
      expect(result.accessToken).toBe("new-at");
      expect(storage.getAccessToken()).toBe("new-at");
    });
  });

  describe("request deduplication", () => {
    it("deduplicates concurrent refresh calls", async () => {
      let refreshCount = 0;
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/refresh")) {
          refreshCount++;
          await new Promise((r) => setTimeout(r, 50));
          return {
            ok: true,
            status: 200,
            json: async () => ({ accessToken: "new", refreshToken: "new" }),
          } as Response;
        }
        if (String(url).includes("/auth/verify")) {
          return {
            ok: false,
            status: 401,
            json: async () => ({}),
            text: async () => "",
          } as Response;
        }
        return { ok: true, status: 200, json: async () => ({}), text: async () => "" } as Response;
      });

      const storage = new InMemoryTokenStorage();
      storage.setAccessToken("expired");
      storage.setRefreshToken("refresh-token");
      const client = new TalakWeb3Client({
        baseUrl: "http://localhost:3000",
        fetch: fetchMock as unknown as typeof fetch,
        storage,
      });

      await Promise.all([
        client.verifySession().catch(() => {}),
        client.verifySession().catch(() => {}),
        client.verifySession().catch(() => {}),
      ]);

      expect(refreshCount).toBe(1);
    });
  });
});

describe("CookieTokenStorage null setters", () => {
  it("expires the cookie when the access token is set to null", () => {
    const writes: string[] = [];
    (globalThis as { document?: { cookie: string } }).document = {
      set cookie(value: string) {
        writes.push(value);
      },
      get cookie() {
        return writes.join("; ");
      },
    };

    try {
      const storage = new CookieTokenStorage({ allowInsecureCookies: true });
      storage.setAccessToken("tok");
      writes.length = 0;
      storage.setAccessToken(null);

      const expiryWrite = writes[writes.length - 1] ?? "";
      expect(expiryWrite).toContain("talak_web3_access=");
      expect(expiryWrite).toContain("expires=Thu, 01 Jan 1970");
    } finally {
      delete (globalThis as { document?: unknown }).document;
    }
  });
});
