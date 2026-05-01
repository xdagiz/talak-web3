import { TalakWeb3Error } from "@talak-web3/errors";
import { z } from "zod";

export const RpcRequestSchema = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: z.union([z.string().max(64), z.number().int().finite()]),
    method: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9_]+$/i, {
        message: "Method contains disallowed characters (only alphanumeric and underscore allowed)",
      }),
    params: z.array(z.unknown()).max(20, { message: "Maximum 20 parameters allowed" }).default([]),
  })
  .strict();

export type RpcRequest = z.infer<typeof RpcRequestSchema>;

export function validateRpcRequest(payload: unknown): RpcRequest {
  if (typeof payload !== "object" || payload === null) {
    throw new TalakWeb3Error("Invalid RPC request: payload must be an object", {
      code: "RPC_INVALID_PAYLOAD",
      status: 400,
    });
  }

  const payloadStr = JSON.stringify(payload);
  if (payloadStr.length > 1024 * 1024) {
    throw new TalakWeb3Error("RPC payload size exceeds 1MB limit", {
      code: "RPC_PAYLOAD_TOO_LARGE",
      status: 413,
    });
  }

  const result = RpcRequestSchema.safeParse(payload);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new TalakWeb3Error(`Invalid RPC request: ${firstError?.message ?? "Schema mismatch"}`, {
      code: "RPC_VALIDATION_ERROR",
      status: 400,
      data: result.error.format(),
    });
  }

  checkDepth(result.data.params);

  return result.data;
}

function checkDepth(val: unknown, depth = 0): void {
  if (depth > 5) {
    throw new TalakWeb3Error("RPC parameters too deeply nested (max depth 5)", {
      code: "RPC_DEPTH_EXCEEDED",
      status: 400,
    });
  }

  if (Array.isArray(val)) {
    for (const item of val) checkDepth(item, depth + 1);
  } else if (typeof val === "object" && val !== null) {
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        checkDepth((val as Record<string, unknown>)[key], depth + 1);
      }
    }
  }
}
