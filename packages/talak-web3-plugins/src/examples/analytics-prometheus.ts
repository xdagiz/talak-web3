import type { TalakWeb3Plugin, TalakWeb3Context } from '@talak-web3/types';

/**
 * [INFO] Analytics-Prometheus Plugin
 * 
 * Demonstrates how to use system-wide hooks to track operational metrics.
 */
export const prometheusPlugin = (options: { prefix?: string } = {}): TalakWeb3Plugin => {
  const prefix = options.prefix || 'web3';

  return {
    name: 'analytics-prometheus',
    version: '1.0.0',

    async setup(ctx: TalakWeb3Context) {
      ctx.logger.info(`[INFO] Setting up ${this.name} with prefix: ${prefix}`);

      // Track successful plugin loads
      ctx.hooks.on('plugin-load', (data: any) => {
        ctx.logger.info(`[PERFORMANCE] ${prefix}_plugin_load_total{name="${data.name}"} 1`);
      });

      // Track RPC errors
      ctx.hooks.on('rpc-error', (data: any) => {
        ctx.logger.error(
          `[ERROR] ${prefix}_rpc_error_total{endpoint="${data.endpoint}"} 1`,
          { error: data.error.message, attempt: data.attempt }
        );
      });

      // Track Gasless Transaction attempts (using generic event for demo)
      // ctx.hooks.on('tx:gasless-start', (data: { to: string }) => {
      //   ctx.logger.info(`[INFO] ${prefix}_tx_gasless_start_total{to="${data.to}"} 1`);
      // });

      // Track Gasless Transaction successes (using generic event for demo)
      // ctx.hooks.on('tx:gasless-complete', (data: { hash: string }) => {
      //   ctx.logger.info(`[SUCCESS] ${prefix}_tx_gasless_success_total{hash="${data.hash}"} 1`);
      // });
    },

    async onBeforeRequest(req: any) {
      // Manual middleware-style tracking if needed
    },

    teardown() {
       // Cleanup logic (e.g., stopping metric export intervals)
    }
  };
};
