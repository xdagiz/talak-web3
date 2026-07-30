import { TalakWeb3Error, CONFIG_ERROR_CODES } from "@talak-web3/errors";

import { TalakWeb3ConfigSchema, type TalakWeb3Config, resolveAndValidateDns } from "./schema";

export * from "./schema";

export * from "./presets";

/** Validates and returns a TalakWeb3 config, throwing on invalid input. */
export function validateConfig(input: unknown): TalakWeb3Config {
  const result = TalakWeb3ConfigSchema.safeParse(input || {});

  if (!result.success) {
    throw new TalakWeb3Error("Invalid config", {
      code: CONFIG_ERROR_CODES.INVALID,
      status: 400,
      cause: result.error,
    });
  }

  return result.data;
}

/**
 * Validates config and resolves all RPC hostnames via DNS, rejecting private/loopback IPs.
 * This prevents DNS rebinding attacks where a hostname resolves to a safe IP at config
 * validation time but a malicious IP at connection time.
 *
 * Use this instead of `validateConfig` when the deployment environment may be targeted
 * by DNS rebinding (e.g., self-hosted nodes, development environments with custom RPC URLs).
 *
 * For production deployments behind TLS, `validateConfig` alone is sufficient because
 * TLS hostname verification provides equivalent protection against rebinding.
 */
export async function validateConfigWithDns(input: unknown): Promise<TalakWeb3Config> {
  const config = validateConfig(input);

  const hostnames = new Set<string>();
  for (const chain of config.chains ?? []) {
    for (const rpcUrl of chain.rpcUrls ?? []) {
      try {
        const parsed = new URL(rpcUrl);
        hostnames.add(parsed.hostname);
      } catch {
        // url already validated by the schema
      }
    }
  }

  const validations = Array.from(hostnames).map(async (hostname) => {
    await resolveAndValidateDns(hostname);
  });

  await Promise.all(validations);
  return config;
}
