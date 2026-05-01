import type { TalakWeb3Plugin, TalakWeb3Context } from "@talak-web3/types";

export const prometheusPlugin = (options: { prefix?: string } = {}): TalakWeb3Plugin => {
  const prefix = options.prefix || "web3";

  return {
    name: "analytics-prometheus",
    version: "1.0.0",

    async setup(ctx: TalakWeb3Context) {
      ctx.logger.info(`[INFO] Setting up ${this.name} with prefix: ${prefix}`);

      ctx.hooks.on("plugin-load", (_data: { name: string }) => {
        ctx.logger.info(`[PERFORMANCE] ${prefix}_plugin_load_total{name="${_data.name}"} 1`);
      });

      ctx.hooks.on("rpc-error", (data: { endpoint: string; error: Error; attempt: number }) => {
        ctx.logger.error(`[ERROR] ${prefix}_rpc_error_total{endpoint="${data.endpoint}"} 1`, {
          error: data.error.message,
          attempt: data.attempt,
        });
      });
    },
  };
};
