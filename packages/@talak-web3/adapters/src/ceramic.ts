import { TalakWeb3Error } from "@talak-web3/errors";
import type { TalakWeb3Context } from "@talak-web3/types";

import type { CeramicAdapter } from "./index.js";

interface CeramicClient {
  did: unknown;
  setDID(did: unknown): void;
}

export class CeramicPlugin implements CeramicAdapter {
  private client: CeramicClient | undefined;
  private initialized = false;

  constructor(private readonly ctx: TalakWeb3Context) {}

  private async ensureInit(): Promise<CeramicClient> {
    if (this.initialized && this.client) return this.client;

    const ceramicConfig = this.ctx.config.ceramic;
    if (!ceramicConfig) {
      throw new TalakWeb3Error("Ceramic configuration missing", {
        code: "CERAMIC_CONFIG_MISSING",
        status: 500,
      });
    }

    throw new Error(
      "Ceramic adapter requires optional dependencies: @ceramicnetwork/http-client, dids, key-did-provider-ed25519, key-did-resolver",
    );
  }

  async createProfile(input: { did: string }): Promise<{ id: string }> {
    await this.ensureInit();

    this.ctx.hooks.emit("identity:profile-create", input);

    throw new Error("Ceramic adapter requires optional dependency: @ceramicnetwork/stream-tile");
  }

  static setup(ctx: TalakWeb3Context): CeramicPlugin {
    const plugin = new CeramicPlugin(ctx);
    ctx.adapters = { ...ctx.adapters, ceramic: plugin };
    return plugin;
  }
}
