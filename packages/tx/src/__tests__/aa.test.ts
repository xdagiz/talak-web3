import { AccountAbstractionClient, ENTRY_POINT_V07 } from "@talak-web3/tx";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const rpcResults: unknown[][] = [];
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  rpcResults.length = 0;
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async () => {
    const body = rpcResults.shift() ?? ["0x0"];
    return {
      ok: true,
      status: 200,
      json: async () => {
        if (body instanceof Array && body[0] === "__error") {
          throw new Error(String(body[1] ?? "fetch failed"));
        }
        return { jsonrpc: "2.0", id: 1, result: body[0] ?? "0x0" };
      },
    } as Response;
  }) as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createClient(
  opts: Partial<ConstructorParameters<typeof AccountAbstractionClient>[0]> = {},
) {
  return new AccountAbstractionClient({
    bundlerUrl: "http://localhost:3000",
    sender: "0x1234567890abcdef1234567890abcdef12345678",
    sign: vi.fn(async () => "0xsignature" as const),
    chainId: 1,
    ...opts,
  });
}

describe("AccountAbstractionClient", () => {
  describe("buildCallData", () => {
    it("encodes function selector and args", () => {
      const client = createClient();
      const calldata = client.buildCallData(
        "0xabcdef1234567890abcdef1234567890abcdef12",
        0n,
        "0xdeadbeef",
      );
      expect(calldata).toBeDefined();
      expect(typeof calldata).toBe("string");
      expect(calldata.startsWith("0x")).toBe(true);
    });
  });

  describe("getNonce", () => {
    it("fetches nonce from bundler via RPC", async () => {
      rpcResults.push(["0x0"]);
      const client = createClient();
      const nonce = await client.getNonce();
      expect(nonce).toBe("0x0");
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe("sendGasless", () => {
    it("builds calldata, gets nonce, signs, and sends", async () => {
      rpcResults.push(
        ["0x0"],
        [{ callGasLimit: "0x5208", verificationGasLimit: "0x186a0", preVerificationGas: "0x5208" }],
        [{ maxFeePerGas: "0x3b9aca00", maxPriorityFeePerGas: "0x3b9aca00" }],
        [{ hash: "0xop-hash" }],
      );
      const client = createClient();
      const hash = await client.sendGasless(
        "0xabcdef1234567890abcdef1234567890abcdef12",
        "0xdeadbeef",
      );
      expect(hash).toBe("0xop-hash");
      expect(client["opts"].sign).toHaveBeenCalled();
    });

    it("paymaster path: fills fee fields from the bundler when the sponsor omits them", async () => {
      const pmAndData = "0x" + "11".repeat(20) + "00".repeat(16) + "00".repeat(16);
      rpcResults.push(
        ["0x0"], // getNonce eth_call
        [
          {
            paymasterAndData: pmAndData,
            callGasLimit: "0x5208",
            verificationGasLimit: "0x186a0",
            preVerificationGas: "0x5208",
          },
        ],
        [{ maxFeePerGas: "0x3b9aca00", maxPriorityFeePerGas: "0x3b9aca00" }],
        [{ hash: "0xop-hash" }],
      );
      const client = createClient({ paymasterUrl: "http://localhost:3001" });
      const hash = await client.sendGasless(
        "0xabcdef1234567890abcdef1234567890abcdef12",
        "0xdeadbeef",
      );
      expect(hash).toBe("0xop-hash");

      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const sendBody = JSON.parse(String(calls.at(-1)?.[1]?.body)) as {
        method: string;
        params: [
          { maxFeePerGas?: string; maxPriorityFeePerGas?: string; paymasterAndData?: string },
        ];
      };
      expect(sendBody.method).toBe("eth_sendUserOperation");
      expect(sendBody.params[0].maxFeePerGas).toBe("0x3b9aca00");
      expect(sendBody.params[0].maxPriorityFeePerGas).toBe("0x3b9aca00");
      expect(sendBody.params[0].paymasterAndData).toBe(pmAndData);
    });

    it("paymaster path: paymaster-provided fee overrides win over bundler fees", async () => {
      const pmAndData = "0x" + "11".repeat(20) + "00".repeat(16) + "00".repeat(16);
      rpcResults.push(
        ["0x0"], // getNonce eth_call
        [
          {
            paymasterAndData: pmAndData,
            callGasLimit: "0x5208",
            verificationGasLimit: "0x186a0",
            preVerificationGas: "0x5208",
            maxFeePerGas: "0xdeadbeef",
            maxPriorityFeePerGas: "0xbeef",
          },
        ],
        [{ maxFeePerGas: "0x3b9aca00", maxPriorityFeePerGas: "0x3b9aca00" }],
        [{ hash: "0xop-hash" }],
      );
      const client = createClient({ paymasterUrl: "http://localhost:3001" });
      const hash = await client.sendGasless(
        "0xabcdef1234567890abcdef1234567890abcdef12",
        "0xdeadbeef",
      );
      expect(hash).toBe("0xop-hash");

      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const sendBody = JSON.parse(String(calls.at(-1)?.[1]?.body)) as {
        method: string;
        params: [{ maxFeePerGas?: string; maxPriorityFeePerGas?: string }];
      };
      expect(sendBody.params[0].maxFeePerGas).toBe("0xdeadbeef");
      expect(sendBody.params[0].maxPriorityFeePerGas).toBe("0xbeef");
    });
  });

  describe("hashUserOp v0.7 paymaster decoding (regression)", () => {
    it("v0.7: two distinct paymasterAndData values hash differently", () => {
      const client = createClient({ version: "v0.7", entryPoint: ENTRY_POINT_V07 });
      const opBase = {
        sender: "0x1234567890abcdef1234567890abcdef12345678" as const,
        nonce: "0x1" as const,
        initCode: "0x" as const,
        callData: "0xdeadbeef" as const,
        callGasLimit: "0x5208" as const,
        verificationGasLimit: "0x186a0" as const,
        preVerificationGas: "0x5208" as const,
        maxFeePerGas: "0x3b9aca00" as const,
        maxPriorityFeePerGas: "0x3b9aca00" as const,
        signature: "0x" as const,
      };
      const pmA =
        "0x" + "1111111111111111111111111111111111111111" + "0".repeat(32) + "0".repeat(32) + "ab";
      const pmB =
        "0x" + "2222222222222222222222222222222222222222" + "0".repeat(32) + "0".repeat(32) + "ab";
      const hashA = (client as unknown as { hashUserOp(op: unknown): string }).hashUserOp({
        ...opBase,
        paymasterAndData: pmA,
      });
      const hashB = (client as unknown as { hashUserOp(op: unknown): string }).hashUserOp({
        ...opBase,
        paymasterAndData: pmB,
      });
      expect(hashA).not.toBe(hashB);
    });

    it("v0.6: two distinct paymasterAndData values hash differently (sanity)", () => {
      const client = createClient({ version: "v0.6" });
      const opBase = {
        sender: "0x1234567890abcdef1234567890abcdef12345678" as const,
        nonce: "0x1" as const,
        initCode: "0x" as const,
        callData: "0xdeadbeef" as const,
        callGasLimit: "0x5208" as const,
        verificationGasLimit: "0x186a0" as const,
        preVerificationGas: "0x5208" as const,
        maxFeePerGas: "0x3b9aca00" as const,
        maxPriorityFeePerGas: "0x3b9aca00" as const,
        signature: "0x" as const,
      };
      const pmA = "0x" + "11".repeat(20);
      const pmB = "0x" + "22".repeat(20);
      const hashA = (client as unknown as { hashUserOp(op: unknown): string }).hashUserOp({
        ...opBase,
        paymasterAndData: pmA,
      });
      const hashB = (client as unknown as { hashUserOp(op: unknown): string }).hashUserOp({
        ...opBase,
        paymasterAndData: pmB,
      });
      expect(hashA).not.toBe(hashB);
    });
  });
});
