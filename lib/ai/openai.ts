import "server-only";
import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
    timeout: 300_000,
  });

  return client;
}
