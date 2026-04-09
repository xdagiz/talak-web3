import type { TalakWeb3Context } from '@talak-web3/types';
// Typed as any to avoid coupling to specific OpenAI SDK versions under strict TS settings.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const OpenAI: any = require('openai');
// Inline minimal error to avoid direct dependency typing issues during strict typecheck.
class TalakWeb3Error extends Error {
  code: string;
  status: number;
  constructor(message: string, opts: { code: string; status?: number }) {
    super(message);
    this.code = opts.code;
    this.status = opts.status ?? 500;
  }
}
import type { AiAgent, AgentRunInput, AgentRunOutput, ToolDefinition } from './index.js';

export class TalakWeb3AiPlugin implements AiAgent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly client: any;
  private readonly model: string;

  constructor(private ctx: TalakWeb3Context) {
    const cfg = ctx.config.ai;
    if (!cfg?.apiKey) {
      throw new TalakWeb3Error('AI config missing (config.ai.apiKey)', { code: 'AI_CONFIG_MISSING', status: 500 });
    }
    this.client = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseUrl,
    });
    this.model = cfg.model ?? 'gpt-4o-mini';
  }

  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    // cast to any to avoid tight coupling to TalakWeb3EventsMap typing
    this.ctx.hooks.emit('ai:run-start' as any, { input } as any);

    const toolMap = new Map<string, ToolDefinition>();
    for (const t of input.tools ?? []) toolMap.set(t.name, t);

    const tools: any[] = (input.tools ?? []).map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    try {
      const first = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: input.prompt }],
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });

      const choice = first.choices[0];
      const message = choice?.message;
      const text = message?.content ?? '';

      const rawToolCalls: any[] = (message as any)?.tool_calls ?? [];
      const toolCalls: { tool: string; input: unknown; output?: unknown }[] = rawToolCalls.map(tc => ({
        tool: tc.function?.name ?? String(tc.name ?? ''),
        input: safeJsonParse(tc.function?.arguments ?? tc.arguments ?? '{}'),
      }));

      // Dispatch tools (one round) then ask the model to finalize.
      if (toolCalls.length > 0) {
        const toolMessages: any[] = [];

        for (const call of toolCalls) {
          const tool = toolMap.get(call.tool);
          if (!tool) {
            throw new TalakWeb3Error(`Unknown tool: ${call.tool}`, { code: 'AI_TOOL_UNKNOWN', status: 400 });
          }
          const output = await tool.handler(call.input);
          (call as { output: unknown }).output = output;
          toolMessages.push({
            role: 'tool',
            tool_call_id: findToolCallId(message as any, call.tool) ?? call.tool,
            content: JSON.stringify(output ?? null),
          });
        }

        const second: any = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'user', content: input.prompt },
            ...((message as any)?.tool_calls && (message as any).tool_calls.length
              ? [{ role: 'assistant', tool_calls: (message as any).tool_calls, content: message.content ?? null }]
              : []),
            ...toolMessages,
          ],
        });

        const finalText = second.choices[0]?.message?.content ?? '';
        const output: AgentRunOutput = { text: finalText, toolCalls };
        this.ctx.hooks.emit('ai:run-end' as any, { output } as any);
        return output;
      }

      const output: AgentRunOutput = { text, toolCalls };
      this.ctx.hooks.emit('ai:run-end' as any, { output } as any);
      return output;
    } catch (err) {
      const output: AgentRunOutput = { text: '' };
      this.ctx.hooks.emit('ai:run-end' as any, { output } as any);
      throw err;
    }
  }

  async *runStream(input: AgentRunInput): AsyncIterable<
    | { type: 'text-delta'; delta: string }
    | { type: 'done'; output: AgentRunOutput }
  > {
    this.ctx.hooks.emit('ai:run-start' as any, { input } as any);

    const tools: any[] = (input.tools ?? []).map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    let full = '';
    const stream: AsyncIterable<any> = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: input.prompt }],
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? '';
      if (delta) {
        full += delta;
        yield { type: 'text-delta', delta };
      }
    }

    const output: AgentRunOutput = { text: full };
    this.ctx.hooks.emit('ai:run-end' as any, { output } as any);
    yield { type: 'done', output };
  }

  static setup(ctx: TalakWeb3Context) {
    const plugin = new TalakWeb3AiPlugin(ctx);
    if (!ctx.adapters) ctx.adapters = {};
    ctx.adapters['ai'] = plugin;
    return plugin;
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function findToolCallId(message: any, toolName: string): string | undefined {
  const tc = (message?.tool_calls ?? []).find((c: any) => c.function?.name === toolName || c.name === toolName);
  return tc?.id;
}
