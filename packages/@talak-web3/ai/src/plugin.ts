import type {
  TalakWeb3Context,
  AiAgent,
  AgentRunInput,
  AgentRunOutput,
  ToolDefinition,
} from "@talak-web3/types";
import OpenAI from "openai";

class AiError extends Error {
  code: string;
  status: number;
  constructor(message: string, opts: { code: string; status?: number }) {
    super(message);
    this.name = "AiError";
    this.code = opts.code;
    this.status = opts.status ?? 500;
  }
}

export class TalakWeb3AiPlugin implements AiAgent {
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly mockMode: boolean;

  constructor(private ctx: TalakWeb3Context) {
    const cfg = ctx.config.ai;
    this.mockMode = !cfg?.apiKey && process.env["NODE_ENV"] === "test";
    if (!cfg?.apiKey && !this.mockMode) {
      throw new AiError("AI config missing (config.ai.apiKey)", {
        code: "AI_CONFIG_MISSING",
        status: 500,
      });
    }
    this.client = this.mockMode
      ? null
      : new OpenAI({
          apiKey: cfg?.apiKey ?? "",
          baseURL: cfg?.baseUrl,
        });
    this.model = cfg?.model ?? "gpt-4o-mini";
  }

  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    this.ctx.hooks.emit("ai:run-start", { input });

    const normalizedTools = normalizeTools(input.tools ?? []);

    if (this.mockMode) {
      const toolCalls = normalizedTools
        .slice(0, 1)
        .map((t) => ({ tool: t.name, input: {} as unknown }));
      const output: AgentRunOutput = { text: `Mock response: ${input.prompt}`, toolCalls };
      this.ctx.hooks.emit("ai:run-end", { output });
      return output;
    }

    if (!this.client) {
      throw new AiError("AI client not initialized", {
        code: "AI_CLIENT_NOT_INITIALIZED",
        status: 500,
      });
    }

    const toolMap = new Map<string, ToolDefinition>();
    for (const t of normalizedTools) toolMap.set(t.name, t);

    const tools: OpenAI.Chat.ChatCompletionTool[] = normalizedTools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: t.parameters,
      },
    }));

    try {
      const first = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: input.prompt }],
        tools: tools,
      });

      const choice = first.choices[0];
      if (!choice) {
        throw new Error("No completion choices returned");
      }
      const message = choice.message;
      if (!message) {
        throw new Error("No message in completion choice");
      }
      const text = message.content ?? "";

      const rawToolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      const toolCalls: { tool: string; input: unknown; output?: unknown }[] = [];

      for (const tc of rawToolCalls) {
        if (tc.type === "function" && tc.function) {
          toolCalls.push({
            tool: tc.function.name,
            input: safeJsonParse(tc.function.arguments ?? "{}"),
          });
        }
      }

      if (toolCalls.length > 0) {
        const toolMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

        for (const call of toolCalls) {
          const tool = toolMap.get(call.tool);
          if (!tool) {
            throw new AiError(`Unknown tool: ${call.tool}`, {
              code: "AI_TOOL_UNKNOWN",
              status: 400,
            });
          }
          const output = await tool.handler(call.input);
          (call as { output: unknown }).output = output;
          toolMessages.push({
            role: "tool" as const,
            tool_call_id: findToolCallId(message, call.tool) ?? call.tool,
            content: JSON.stringify(output ?? null),
          });
        }

        const second = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: "user", content: input.prompt },
            ...(message.tool_calls && message.tool_calls.length > 0
              ? [
                  {
                    role: "assistant" as const,
                    tool_calls: message.tool_calls,
                    content: message.content ?? null,
                  },
                ]
              : []),
            ...toolMessages,
          ],
        });

        const finalText = second.choices[0]?.message?.content ?? "";
        const output: AgentRunOutput = { text: finalText, toolCalls };
        this.ctx.hooks.emit("ai:run-end", { output });
        return output;
      }

      const output: AgentRunOutput = { text, toolCalls };
      this.ctx.hooks.emit("ai:run-end", { output });
      return output;
    } catch (err) {
      const output: AgentRunOutput = { text: "" };
      this.ctx.hooks.emit("ai:run-end", { output });
      throw err;
    }
  }

  async *runStream(
    input: AgentRunInput,
  ): AsyncIterable<
    { type: "text-delta"; delta: string } | { type: "done"; output: AgentRunOutput }
  > {
    this.ctx.hooks.emit("ai:run-start", { input });

    const tools: OpenAI.Chat.ChatCompletionTool[] = (input.tools ?? []).map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: t.parameters,
      },
    }));

    let full = "";
    const stream = await this.client!.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: input.prompt }],
      tools: tools,
      stream: true,
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? "";
      if (delta) {
        full += delta;
        yield { type: "text-delta", delta };
      }
    }

    const output: AgentRunOutput = { text: full };
    this.ctx.hooks.emit("ai:run-end", { output });
    yield { type: "done", output };
  }

  static setup(ctx: TalakWeb3Context) {
    const plugin = new TalakWeb3AiPlugin(ctx);
    if (!ctx.adapters) ctx.adapters = {};
    ctx.adapters["ai"] = plugin;
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

function findToolCallId(
  message: OpenAI.Chat.ChatCompletionMessage,
  toolName: string,
): string | undefined {
  const tc = (message?.tool_calls ?? []).find(
    (c: OpenAI.Chat.ChatCompletionMessageToolCall) =>
      c.type === "function" && c.function.name === toolName,
  );
  return tc?.id;
}

function normalizeTools(tools: unknown[]): ToolDefinition[] {
  return tools.map((tool) => {
    if (typeof tool === "string") {
      return {
        name: tool,
        description: `${tool} tool`,
        parameters: { type: "object", properties: {} },
        handler: async () => ({ ok: true }),
      };
    }
    return tool as ToolDefinition;
  });
}
