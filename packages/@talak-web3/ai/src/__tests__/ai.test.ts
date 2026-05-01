import { TalakWeb3AiPlugin } from "@talak-web3/ai";
import { talakWeb3 } from "@talak-web3/core";
import { describe, it, expect, beforeEach } from "vitest";

describe("AI Plugin", () => {
  let instance: unknown;

  beforeEach(() => {
    instance = talakWeb3();
    TalakWeb3AiPlugin.setup(instance.context);
  });

  it("should run AI prompt", async () => {
    const ai = instance.context.adapters?.["ai"] as {
      run: (input: { prompt: string }) => Promise<{ text: string }>;
    };
    const result = await ai.run({ prompt: "Hello AI" });
    expect(result.text).toContain("Hello AI");
  });

  it("should emit hooks on run", async () => {
    const events: string[] = [];
    instance.context.hooks.on("ai:run-start", () => events.push("start"));
    instance.context.hooks.on("ai:run-end", () => events.push("end"));

    const ai = instance.context.adapters?.["ai"] as {
      run: (input: { prompt: string }) => Promise<unknown>;
    };
    await ai.run({ prompt: "Test hooks" });
    expect(events).toEqual(["start", "end"]);
  });

  it("should handle tool calls", async () => {
    const ai = instance.context.adapters?.["ai"] as {
      run: (input: {
        prompt: string;
        tools?: string[];
      }) => Promise<{ toolCalls?: { tool: string }[] }>;
    };
    const result = await ai.run({
      prompt: "Use tools",
      tools: ["transfer"],
    });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].tool).toBe("transfer");
  });
});
