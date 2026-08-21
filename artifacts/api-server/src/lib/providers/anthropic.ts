import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatResult, ProviderAdapter } from "./types.js";

export function createAnthropicAdapter(opts: {
  apiKey: string;
}): ProviderAdapter {
  const client = new Anthropic({ apiKey: opts.apiKey });

  function splitMessages(messages: ChatMessage[]) {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const rest = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    return { system: system || undefined, rest };
  }

  return {
    async chat(messages: ChatMessage[], model: string): Promise<ChatResult> {
      const { system, rest } = splitMessages(messages);
      const res = await client.messages.create({
        model,
        max_tokens: 4096,
        ...(system ? { system } : {}),
        messages: rest,
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return {
        text,
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        apiModel: res.model,
      };
    },

    async chatStream(
      messages: ChatMessage[],
      model: string,
      onChunk: (text: string) => void,
    ): Promise<ChatResult> {
      const { system, rest } = splitMessages(messages);
      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        ...(system ? { system } : {}),
        messages: rest,
      });
      let text = "";
      stream.on("text", (delta) => {
        text += delta;
        onChunk(delta);
      });
      const final = await stream.finalMessage();
      return {
        text,
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        apiModel: final.model,
      };
    },
  };
}
