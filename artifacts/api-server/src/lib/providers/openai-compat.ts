/**
 * OpenAI-compatible adapter — works for OpenAI, Ollama, vLLM, and TGI
 * (any provider that speaks the OpenAI chat-completions protocol).
 */
import OpenAI from "openai";
import type { ChatMessage, ChatResult, ProviderAdapter } from "./types.js";

export function createOpenAICompatAdapter(opts: {
  apiKey: string;
  baseURL?: string;
}): ProviderAdapter {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });

  return {
    async chat(messages: ChatMessage[], model: string): Promise<ChatResult> {
      const res = await client.chat.completions.create({
        model,
        messages,
      });
      return {
        text: res.choices[0]?.message?.content ?? "",
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens,
        apiModel: res.model,
      };
    },

    async chatStream(
      messages: ChatMessage[],
      model: string,
      onChunk: (text: string) => void,
    ): Promise<ChatResult> {
      const stream = await client.chat.completions.create({
        model,
        messages,
        stream: true,
      });
      let text = "";
      let apiModel = model;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          text += delta;
          onChunk(delta);
        }
        if (chunk.model) apiModel = chunk.model;
      }
      return { text, apiModel };
    },
  };
}
