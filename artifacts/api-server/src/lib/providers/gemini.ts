import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, ChatResult, ProviderAdapter } from "./types.js";

export function createGeminiAdapter(opts: { apiKey: string }): ProviderAdapter {
  const genAI = new GoogleGenerativeAI(opts.apiKey);

  function buildChatSession(modelId: string, messages: ChatMessage[]) {
    const geminiModel = genAI.getGenerativeModel({ model: modelId });
    // Gemini history excludes the final user turn
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const chat = geminiModel.startChat({ history });
    const lastMsg = messages[messages.length - 1];
    return { chat, prompt: lastMsg?.content ?? "" };
  }

  return {
    async chat(messages: ChatMessage[], model: string): Promise<ChatResult> {
      const { chat, prompt } = buildChatSession(model, messages);
      const res = await chat.sendMessage(prompt);
      return {
        text: res.response.text(),
        apiModel: model,
      };
    },

    async chatStream(
      messages: ChatMessage[],
      model: string,
      onChunk: (text: string) => void,
    ): Promise<ChatResult> {
      const { chat, prompt } = buildChatSession(model, messages);
      const res = await chat.sendMessageStream(prompt);
      let text = "";
      for await (const chunk of res.stream) {
        const delta = chunk.text();
        if (delta) {
          text += delta;
          onChunk(delta);
        }
      }
      return { text, apiModel: model };
    },
  };
}
