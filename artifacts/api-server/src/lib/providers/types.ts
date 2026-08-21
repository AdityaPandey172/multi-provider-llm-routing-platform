export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  apiModel: string;
}

export interface ProviderAdapter {
  chat(messages: ChatMessage[], model: string): Promise<ChatResult>;
  chatStream(
    messages: ChatMessage[],
    model: string,
    onChunk: (text: string) => void,
  ): Promise<ChatResult>;
}
