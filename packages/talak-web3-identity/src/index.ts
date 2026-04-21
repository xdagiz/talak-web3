import type { CeramicAdapter } from "@talak-web3/adapters";

export type UnifiedProfile = {
  did?: string;
  ens?: string;
  address?: string;
};

export class IdentityService {
  constructor(private readonly ceramic?: CeramicAdapter) {}

  async ensureCeramicProfile(input: { did: string }): Promise<{ id: string }> {
    if (!this.ceramic) return { id: "disabled" };
    return this.ceramic.createProfile({ did: input.did });
  }
}
