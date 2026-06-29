import "server-only";
import { z } from "zod";
import { CREATIVE_TYPES } from "@/lib/constants";
import {
  GeneratedCreativeSchema,
  GenerationModeSchema,
  ProductAnalysisSchema,
  PromptObjectSchema,
  StrategySetSchema,
  type CreativeStrategy,
  type GeneratedCreative,
  type GenerationMode,
  type GenerationResult,
  type ProductAnalysis,
} from "./schemas";
import {
  PRODUCT_ANALYSIS_SYSTEM_PROMPT,
  STRATEGY_SYSTEM_PROMPT,
  buildPromptObject,
} from "./prompts";
import { fileExists, hashParts, publicImagePath, readJsonCache, writeJsonCache } from "./cache";
import { createImageProvider, createLlmProvider, createVisionProvider } from "./providers";
import { resolveAiRuntime } from "./runtime";
import { storeGeneratedImage } from "./storage";

const PromptSetSchema = z.array(PromptObjectSchema).length(5);
const CreativeSetSchema = z.array(GeneratedCreativeSchema).length(5);

export type PipelineRequest = {
  mode?: GenerationMode;
  forceImages?: boolean;
};

async function analyzeProduct(file: File, buffer: Buffer, productFingerprint: string, mode: GenerationMode) {
  const runtime = resolveAiRuntime(mode);
  const provider = createVisionProvider(runtime.vision);
  const cacheKey = hashParts(productFingerprint, provider.label, PRODUCT_ANALYSIS_SYSTEM_PROMPT);
  const cached = await readJsonCache("analysis", cacheKey, ProductAnalysisSchema);

  if (cached) {
    return { analysis: cached, fromCache: true, provider: provider.label };
  }

  const analysis = await provider.analyze({
    file,
    buffer,
    systemPrompt: PRODUCT_ANALYSIS_SYSTEM_PROMPT,
    userPrompt: "Analyze this cosmetic product for creative direction.",
    schema: ProductAnalysisSchema,
  });

  await writeJsonCache("analysis", cacheKey, analysis);
  return { analysis, fromCache: false, provider: provider.label };
}

async function createStrategies(analysis: ProductAnalysis, productFingerprint: string, mode: GenerationMode) {
  const runtime = resolveAiRuntime(mode);
  const provider = createLlmProvider(runtime.planner);
  const prompt = `Product analysis:\n${JSON.stringify(analysis, null, 2)}`;
  const cacheKey = hashParts(productFingerprint, provider.label, STRATEGY_SYSTEM_PROMPT, prompt);
  const cached = await readJsonCache("strategies", cacheKey, StrategySetSchema);

  if (cached) {
    return { strategies: orderStrategies(cached.strategies), fromCache: true, provider: provider.label };
  }

  const response = await provider.generateJson({
    systemPrompt: STRATEGY_SYSTEM_PROMPT,
    userPrompt: prompt,
    schema: StrategySetSchema,
  });

  await writeJsonCache("strategies", cacheKey, response);
  return { strategies: orderStrategies(response.strategies), fromCache: false, provider: provider.label };
}

function orderStrategies(strategies: CreativeStrategy[]) {
  const byType = new Map(strategies.map((item) => [item.creative, item]));
  const ordered = CREATIVE_TYPES.map((type) => byType.get(type));
  if (ordered.some((item) => !item)) {
    throw new Error("Creative strategy did not include all five required concepts.");
  }
  return ordered as CreativeStrategy[];
}

async function buildPrompts(analysis: ProductAnalysis, strategies: CreativeStrategy[], productFingerprint: string) {
  const cacheKey = hashParts(productFingerprint, JSON.stringify(analysis), JSON.stringify(strategies));
  const cached = await readJsonCache("prompts", cacheKey, PromptSetSchema);

  if (cached) {
    return { prompts: cached, fromCache: true };
  }

  const prompts = strategies.map((strategy) => buildPromptObject(analysis, strategy));
  await writeJsonCache("prompts", cacheKey, prompts);
  return { prompts, fromCache: false };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>) {
  const output = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

async function generateImages(file: File, buffer: Buffer, prompts: z.infer<typeof PromptSetSchema>, productFingerprint: string, mode: GenerationMode, forceImages: boolean) {
  const runtime = resolveAiRuntime(mode);
  const provider = createImageProvider(runtime.image);
  let allCached = true;

  const creatives = await mapWithConcurrency(prompts, runtime.image.concurrency, async (promptObject, index): Promise<GeneratedCreative> => {
    const imageKey = hashParts(productFingerprint, mode, provider.label, runtime.image.size, runtime.image.quality, promptObject.prompt);
    const cached = !forceImages ? await readJsonCache("images", imageKey, GeneratedCreativeSchema) : null;

    if (cached) {
      const localFile = cached.imageUrl.startsWith("/generated/")
        ? await fileExists(publicImagePath(cached.imageUrl.replace("/generated/", "")))
        : true;

      if (localFile) {
        return cached;
      }
    }

    allCached = false;
    const base64 = await provider.render({
      file,
      buffer,
      prompt: promptObject.prompt,
      size: runtime.image.size,
      quality: runtime.image.quality,
    });

    const id = imageKey.slice(0, 18) || `${Date.now()}-${index + 1}`;
    const stored = await storeGeneratedImage(base64, id);
    const creative = { ...promptObject, id, imageUrl: stored.url };
    await writeJsonCache("images", imageKey, creative);
    return creative;
  });

  return { creatives: CreativeSetSchema.parse(creatives), fromCache: allCached, provider: provider.label, image: runtime.image };
}

export async function runCreativePipeline(file: File, request: PipelineRequest = {}): Promise<GenerationResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mode = GenerationModeSchema.parse(request.mode ?? "draft");
  const productFingerprint = hashParts(buffer);
  const analysisStep = await analyzeProduct(file, buffer, productFingerprint, mode);
  const strategyStep = await createStrategies(analysisStep.analysis, productFingerprint, mode);
  const promptStep = await buildPrompts(analysisStep.analysis, strategyStep.strategies, productFingerprint);
  const imageStep = await generateImages(file, buffer, promptStep.prompts, productFingerprint, mode, request.forceImages ?? false);

  return {
    analysis: analysisStep.analysis,
    creatives: imageStep.creatives,
    generatedAt: new Date().toISOString(),
    run: {
      mode,
      productFingerprint,
      providers: {
        vision: analysisStep.provider,
        planner: strategyStep.provider,
        image: imageStep.provider,
      },
      cache: {
        analysis: analysisStep.fromCache,
        strategies: strategyStep.fromCache,
        prompts: promptStep.fromCache,
        images: imageStep.fromCache,
      },
      image: {
        size: imageStep.image.size,
        quality: imageStep.image.quality,
      },
    },
  };
}
