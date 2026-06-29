import "server-only";
import type { GenerationMode } from "./schemas";

export type StructuredProviderId = "gemini" | "openai";
export type ImageProviderId = "openai";
export type ImageQuality = "low" | "medium" | "high";

export type ProviderSelection<TProvider extends string> = {
  provider: TProvider;
  model: string;
};

export type ImageSettings = {
  size: string;
  quality: ImageQuality;
  concurrency: number;
};

export type AiRuntime = {
  mode: GenerationMode;
  vision: ProviderSelection<StructuredProviderId>;
  planner: ProviderSelection<StructuredProviderId>;
  image: ProviderSelection<ImageProviderId> & ImageSettings;
};

function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function pickStructuredProvider(envValue: string | undefined): StructuredProviderId {
  if (envValue === "gemini" || envValue === "openai") {
    return envValue;
  }

  if (hasGeminiKey()) return "gemini";
  return "openai";
}

function normalizeModelOverride(provider: StructuredProviderId, envValue: string | undefined) {
  const trimmed = envValue?.trim();
  if (!trimmed) return undefined;

  // Users sometimes place the provider id in the model field.
  // In that case we should treat it as "use the provider default model".
  if (trimmed === "openai" || trimmed === "gemini" || trimmed === "default") {
    return undefined;
  }

  // If the override obviously points at the other provider, ignore it.
  if (provider === "openai" && trimmed.startsWith("gemini")) {
    return undefined;
  }
  if (provider === "gemini" && trimmed.startsWith("gpt-")) {
    return undefined;
  }

  return trimmed;
}

function resolveStructuredModel(provider: StructuredProviderId, envValue: string | undefined, fallback: string) {
  const override = normalizeModelOverride(provider, envValue);
  if (override) return override;

  if (provider === "gemini") {
    return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }

  return fallback;
}

export function resolveAiRuntime(mode: GenerationMode): AiRuntime {
  const visionProvider = pickStructuredProvider(process.env.AI_VISION_PROVIDER);
  const plannerProvider = pickStructuredProvider(process.env.AI_LLM_PROVIDER);
  const imageProvider = process.env.AI_IMAGE_PROVIDER;

  if (visionProvider === "gemini" && !hasGeminiKey() && !hasOpenAIKey()) {
    throw new Error("GEMINI_API_KEY or OPENAI_API_KEY must be configured on the server.");
  }
  if (plannerProvider === "gemini" && !hasGeminiKey() && !hasOpenAIKey()) {
    throw new Error("GEMINI_API_KEY or OPENAI_API_KEY must be configured on the server.");
  }
  if (imageProvider && imageProvider !== "openai") {
    throw new Error(`Unsupported AI_IMAGE_PROVIDER "${imageProvider}". This version currently implements the OpenAI image adapter only.`);
  }
  if (!hasOpenAIKey()) {
    throw new Error("OPENAI_API_KEY is required for image generation in this version.");
  }

  return {
    mode,
    vision: {
      provider: visionProvider,
      model: resolveStructuredModel(visionProvider, process.env.AI_VISION_MODEL, process.env.OPENAI_VISION_MODEL ?? "gpt-5.4-mini"),
    },
    planner: {
      provider: plannerProvider,
      model: resolveStructuredModel(plannerProvider, process.env.AI_LLM_MODEL ?? process.env.OPENAI_STRATEGY_MODEL, "gpt-5.4-mini"),
    },
    image: {
      provider: "openai",
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
      // 9:16 full-screen vertical for Instagram Reels/Stories and TikTok.
      // Draft stays smaller + medium quality for a cost-optimized fast render;
      // production targets native 1080x1920 at high quality for final picks.
      size: mode === "draft" ? "720x1280" : "1080x1920",
      quality: mode === "draft" ? "medium" : "high",
      concurrency: mode === "draft" ? 3 : 2,
    },
  };
}
