import { z } from "zod";
import { CREATIVE_TYPES } from "@/lib/constants";

export const GenerationModeSchema = z.enum(["draft", "production"]);

export const ProductAnalysisSchema = z.object({
  category: z.string(),
  productType: z.string(),
  packagingType: z.string(),
  primaryColors: z.array(z.string()).min(1).max(5),
  secondaryColors: z.array(z.string()).max(5),
  finish: z.string(),
  luxuryLevel: z.enum(["mass", "masstige", "premium", "luxury"]),
  targetAudience: z.string(),
  estimatedAgeGroup: z.string(),
  beautyCategory: z.string(),
  premiumScore: z.number().int().min(1).max(10),
  visualStyle: z.string(),
  brandPositioning: z.string(),
});

export const CreativeStrategySchema = z.object({
  creative: z.enum(CREATIVE_TYPES),
  objective: z.string(),
  emotion: z.string(),
  composition: z.string(),
  lighting: z.string(),
  background: z.string(),
  props: z.array(z.string()).max(7),
  cameraAngle: z.string(),
  cameraLens: z.string(),
  colorPalette: z.array(z.string()).min(2).max(7),
  textPlacement: z.string(),
  ctaPlacement: z.string(),
  suggestedHeadline: z.string().max(42),
  rationale: z.string().max(220),
  // "none" for pure product shots, otherwise a short art-direction description of
  // an elegant macro human element (e.g. painted nails, lips, cheek) for application/result shots.
  humanElement: z.string().max(180),
});

export const StrategySetSchema = z.object({
  strategies: z.array(CreativeStrategySchema).length(5),
});

export const PromptObjectSchema = CreativeStrategySchema.extend({
  prompt: z.string(),
  negativePrompt: z.array(z.string()),
});

export const GeneratedCreativeSchema = PromptObjectSchema.extend({
  id: z.string(),
  imageUrl: z.string(),
});

export const PipelineRunSchema = z.object({
  mode: GenerationModeSchema,
  productFingerprint: z.string(),
  providers: z.object({
    vision: z.string(),
    planner: z.string(),
    image: z.string(),
  }),
  cache: z.object({
    analysis: z.boolean(),
    strategies: z.boolean(),
    prompts: z.boolean(),
    images: z.boolean(),
  }),
  image: z.object({
    size: z.string(),
    quality: z.enum(["low", "medium", "high"]),
  }),
});

export const GenerationResultSchema = z.object({
  analysis: ProductAnalysisSchema,
  creatives: z.array(GeneratedCreativeSchema).length(5),
  generatedAt: z.string(),
  run: PipelineRunSchema,
});

export type GenerationMode = z.infer<typeof GenerationModeSchema>;
export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema>;
export type CreativeStrategy = z.infer<typeof CreativeStrategySchema>;
export type PromptObject = z.infer<typeof PromptObjectSchema>;
export type GeneratedCreative = z.infer<typeof GeneratedCreativeSchema>;
export type PipelineRun = z.infer<typeof PipelineRunSchema>;
export type GenerationResult = z.infer<typeof GenerationResultSchema>;
