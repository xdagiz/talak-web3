import { TalakWeb3Error } from "@talak-web3/errors";
import type { TalakWeb3Context } from "@talak-web3/types";

import type { StorageAdapter } from "./index.js";

export interface PinataStorageOptions {
  jwt?: string;

  gatewayBaseUrl?: string;
}

export class PinataStorageAdapter implements StorageAdapter {
  private readonly jwt: string;
  private readonly gatewayBaseUrl: string;

  constructor(
    private readonly ctx: TalakWeb3Context,
    opts: PinataStorageOptions = {},
  ) {
    this.jwt = opts.jwt ?? process.env["PINATA_JWT"] ?? "";
    if (!this.jwt) {
      throw new TalakWeb3Error("Missing Pinata JWT (set PINATA_JWT or pass opts.jwt)", {
        code: "STORAGE_PINATA_JWT_MISSING",
        status: 500,
      });
    }
    this.gatewayBaseUrl = (opts.gatewayBaseUrl ?? "https://gateway.pinata.cloud/ipfs").replace(
      /\/+$/,
      "",
    );
  }

  async put(path: string, data: Uint8Array): Promise<{ uri: string }> {
    const form = new FormData();
    const name = path.replace(/^\/+/, "") || "file.bin";
    const buffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    form.append("file", new Blob([buffer], { type: "application/octet-stream" }), name);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
      },
      body: form,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new TalakWeb3Error(`Pinata upload failed: HTTP ${res.status} ${txt}`.trim(), {
        code: "STORAGE_PUT_FAILED",
        status: 502,
      });
    }

    const json = (await res.json()) as { IpfsHash?: string };
    if (!json.IpfsHash) {
      throw new TalakWeb3Error("Pinata response missing IpfsHash", {
        code: "STORAGE_PUT_BAD_RESPONSE",
        status: 502,
      });
    }

    const uri = `ipfs://${json.IpfsHash}/${encodeURIComponent(name)}`;
    return { uri };
  }

  async get(uri: string): Promise<Uint8Array> {
    const url = uri.startsWith("ipfs://") ? this.ipfsToGatewayUrl(uri) : uri;

    const res = await fetch(url);
    if (!res.ok) {
      throw new TalakWeb3Error(`IPFS fetch failed: HTTP ${res.status}`, {
        code: "STORAGE_GET_FAILED",
        status: 502,
      });
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf;
  }

  private ipfsToGatewayUrl(ipfsUri: string): string {
    const stripped = ipfsUri.replace(/^ipfs:\/\//, "");
    return `${this.gatewayBaseUrl}/${stripped}`;
  }

  static setup(ctx: TalakWeb3Context, opts?: PinataStorageOptions): PinataStorageAdapter {
    const adapter = new PinataStorageAdapter(ctx, opts);
    ctx.adapters = { ...ctx.adapters, storage: adapter };
    return adapter;
  }
}
