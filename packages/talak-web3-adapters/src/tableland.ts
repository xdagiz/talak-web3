import type { TalakWeb3Context } from '@talak-web3/types';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { TablelandAdapter } from './index.js';

export class TablelandPlugin implements TablelandAdapter {
  private db: unknown;
  private initialized = false;

  constructor(private readonly ctx: TalakWeb3Context) {}

  private async ensureInit(): Promise<{ prepare(sql: string): { bind(...params: unknown[]): { all(): Promise<{ results: unknown[] }> } } }> {
    if (this.initialized && this.db) return this.db as ReturnType<TablelandPlugin['ensureInit']> extends Promise<infer T> ? T : never;

    const tablelandConfig = this.ctx.config.tableland;
    const privateKey = tablelandConfig?.privateKey ?? process.env['TABLELAND_PRIVATE_KEY'];

    if (!privateKey) {
      throw new TalakWeb3Error('TABLELAND_PRIVATE_KEY env var or config.tableland.privateKey is required', {
        code: 'TABLELAND_KEY_MISSING',
        status: 500,
      });
    }

    throw new Error('Tableland adapter requires optional dependencies: @tableland/sdk, ethers');

  }

  async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    this.ctx.hooks.emit('storage:query-start', { sql, params });

    const db = await this.ensureInit();

    try {
      const stmt = db.prepare(sql);
      const bound = stmt.bind(...params);
      const { results } = await bound.all();
      const rows = results ?? [];
      this.ctx.hooks.emit('storage:query-end', { sql, results: rows });
      return rows;
    } catch (error) {
      throw new TalakWeb3Error(`Tableland query failed: ${String(error)}`, {
        code: 'TABLELAND_QUERY_ERROR',
        status: 500,
        cause: error,
      });
    }
  }

  static setup(ctx: TalakWeb3Context): TablelandPlugin {
    const plugin = new TablelandPlugin(ctx);
    ctx.adapters = { ...ctx.adapters, tableland: plugin };
    return plugin;
  }
}
