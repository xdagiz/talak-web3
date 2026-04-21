import type { TalakWeb3Plugin, TalakWeb3Context } from '@talak-web3/types';

export const s3AdapterPlugin = (options: { bucket: string; region: string }): TalakWeb3Plugin => {
  return {
    name: 'storage-s3-adapter',
    version: '1.0.0',

    async setup(ctx: TalakWeb3Context) {
      ctx.logger.info(`[INFO] Provisioning S3 Adapter for bucket: ${options.bucket}`);

      const s3Adapter = {
        upload: async (key: string, data: any) => {
          ctx.logger.info(`[INFO] [S3] Uploading ${key} to ${options.bucket}...`);

          return { url: `https://${options.bucket}.s3.${options.region}.amazonaws.com/${key}` };
        },
        download: async (key: string) => {
          ctx.logger.info(`[INFO] [S3] Downloading ${key} from ${options.bucket}...`);
          return Buffer.from('mock-data');
        }
      };

      if (!ctx.adapters) {
        (ctx as any).adapters = {};
      }
      ctx.adapters!['s3'] = s3Adapter;
    }
  };
};
