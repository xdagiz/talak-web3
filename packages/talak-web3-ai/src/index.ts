/**
 * @talak-web3/ai - AI Agent System for Web3 Applications
 * 
 * Provides AI-powered agents with tool execution, streaming, and Web3 context integration.
 * Supports OpenAI-compatible providers with automatic fallback to mock mode in tests.
 * 
 * @example
 * ```typescript
 * import { TalakWeb3AiPlugin } from '@talak-web3/ai/plugin';
 * 
 * const plugin = TalakWeb3AiPlugin.setup(ctx);
 * const result = await plugin.run({
 *   prompt: 'Check my wallet balance',
 *   tools: [{ name: 'getBalance', handler: async () => '1.5 ETH' }]
 * });
 * ```
 */

export {
  TalakWeb3AiPlugin,
} from './plugin';

export {
  type AgentRunInput,
  type AgentRunOutput,
  type AiAgent,
  type ToolDefinition,
} from '@talak-web3/types';
