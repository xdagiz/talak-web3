import type { TalakWeb3Context } from '@talak-web3/types';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { CeramicAdapter } from './index.js';

// Type-only imports — actual modules loaded lazily to avoid require failures
// when Ceramic SDK is not installed. This makes the package tree-shakable.

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
      throw new TalakWeb3Error('Ceramic configuration missing', {
        code: 'CERAMIC_CONFIG_MISSING',
        status: 500,
      });
    }

    // Dynamic import keeps this tree-shakable
    // TODO: Install these dependencies when needed
    // const [{ CeramicClient }, { DID }, { Ed25519Provider }, keyDidResolver] = await Promise.all([
    //   import('@ceramicnetwork/http-client'),
    //   import('dids'),
    //   import('key-did-provider-ed25519'),
    //   import('key-did-resolver'),
    // ]);
    throw new Error('Ceramic adapter requires optional dependencies: @ceramicnetwork/http-client, dids, key-did-provider-ed25519, key-did-resolver');

    // const rawSeed = ceramicConfig.seed ?? process.env['CERAMIC_SEED'];
    // if (!rawSeed) {
    //   throw new TalakWeb3Error('CERAMIC_SEED env var or config.ceramic.seed is required', {
    //     code: 'CERAMIC_SEED_MISSING',
    //     status: 500,
    //   });
    // }

    // // Convert hex seed to Uint8Array
    // const seedHex = rawSeed.replace(/^0x/, '');
    // const seed = new Uint8Array(
    //   seedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)),
    // );

    // const provider = new Ed25519Provider(seed);
    // const did = new DID({ provider, resolver: keyDidResolver.getResolver() });
    // await did.authenticate();

    // const ceramic = new CeramicClient(ceramicConfig.nodeUrl);
    // ceramic.setDID(did);

    // this.client = ceramic;
    // this.initialized = true;
    // return ceramic;
  }

  async createProfile(input: { did: string }): Promise<{ id: string }> {
    const ceramic = await this.ensureInit();

    this.ctx.hooks.emit('identity:profile-create', input);

    // const { TileDocument } = await import('@ceramicnetwork/stream-tile');
    throw new Error('Ceramic adapter requires optional dependency: @ceramicnetwork/stream-tile');

    // const doc = await TileDocument.create(
    //   ceramic as any,
    //   { did: input.did, createdAt: new Date().toISOString() },
    //   { schema: undefined as any },
    // );

    // const id = doc.id.toString();
    // this.ctx.hooks.emit('identity:profile-created', { id });
    // this.ctx.logger.info(`Ceramic profile created: ${id}`);
    // return { id };
  }

  static setup(ctx: TalakWeb3Context): CeramicPlugin {
    const plugin = new CeramicPlugin(ctx);
    ctx.adapters = { ...ctx.adapters, ceramic: plugin };
    return plugin;
  }
}
