import "server-only";
import { z, toJSONSchema } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { toFile } from "openai/uploads";
import { getOpenAI } from "./openai";
import type { ProviderSelection } from "./runtime";
import type { ImageProviderId, ImageQuality, StructuredProviderId } from "./runtime";

type JsonRequest<T> = {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
};

type VisionRequest<T> = JsonRequest<T> & {
  file: File;
  buffer: Buffer;
};

type ImageRequest = {
  file: File;
  buffer: Buffer;
  prompt: string;
  size: string;
  quality: ImageQuality;
};

export interface VisionProvider {
  label: string;
  analyze<T>(request: VisionRequest<T>): Promise<T>;
}

export interface LLMProvider {
  label: string;
  generateJson<T>(request: JsonRequest<T>): Promise<T>;
}

export interface ImageProvider {
  label: string;
  render(request: ImageRequest): Promise<string>;
}

function asDataUrl(file: File, buffer: Buffer) {
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function stripJsonEnvelope(raw: string) {
  return raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

// Gemini's responseSchema accepts only a subset of JSON Schema. Keys like
// "$schema", "additionalProperties", and "$ref"/"definitions" cause a 400, so we
// recursively strip everything Gemini doesn't understand before sending it.
const GEMINI_SCHEMA_ALLOWED_KEYS = new Set([
  "type",
  "format",
  "description",
  "nullable",
  "enum",
  "items",
  "properties",
  "required",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "minLength",
  "maxLength",
  "pattern",
]);

function sanitizeGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(sanitizeGeminiSchema);
  }

  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (!GEMINI_SCHEMA_ALLOWED_KEYS.has(key)) {
      continue;
    }

    if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, unknown> = {};
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        props[propKey] = sanitizeGeminiSchema(propValue);
      }
      result[key] = props;
    } else if (key === "items") {
      result[key] = sanitizeGeminiSchema(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Gemini treats maxLength/maxItems as soft hints and routinely overshoots them,
// which then fails strict Zod validation. We clamp the response to the schema's
// limits before parsing so well-formed-but-slightly-long output still succeeds.
function clampToGeminiSchema(value: unknown, schema: unknown): unknown {
  if (!schema || typeof schema !== "object") {
    return value;
  }

  const node = schema as Record<string, unknown>;

  if (typeof value === "string" && typeof node.maxLength === "number" && value.length > node.maxLength) {
    return value.slice(0, node.maxLength).trimEnd();
  }

  if (Array.isArray(value)) {
    let items = value;
    if (typeof node.maxItems === "number" && items.length > node.maxItems) {
      items = items.slice(0, node.maxItems);
    }
    return items.map((item) => clampToGeminiSchema(item, node.items));
  }

  if (value && typeof value === "object" && node.properties && typeof node.properties === "object") {
    const properties = node.properties as Record<string, unknown>;
    const result: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in result) {
        result[key] = clampToGeminiSchema(result[key], childSchema);
      }
    }
    return result;
  }

  return value;
}

function ensureGeminiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return apiKey;
}

class OpenAIVisionProvider implements VisionProvider {
  label: string;

  constructor(private readonly model: string) {
    this.label = `openai:${model}`;
  }

  async analyze<T>({ systemPrompt, userPrompt, schema, file, buffer }: VisionRequest<T>) {
    const response = await getOpenAI().responses.parse({
      model: this.model,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "input_text", text: userPrompt },
            { type: "input_image", image_url: asDataUrl(file, buffer), detail: "high" },
          ],
        },
      ],
      text: { format: zodTextFormat(schema, "vision_result") },
    });

    if (!response.output_parsed) {
      throw new Error("Vision analysis returned no structured result.");
    }

    return response.output_parsed;
  }
}

class OpenAILLMProvider implements LLMProvider {
  label: string;

  constructor(private readonly model: string) {
    this.label = `openai:${model}`;
  }

  async generateJson<T>({ systemPrompt, userPrompt, schema }: JsonRequest<T>) {
    const response = await getOpenAI().responses.parse({
      model: this.model,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      text: { format: zodTextFormat(schema, "json_result") },
    });

    if (!response.output_parsed) {
      throw new Error("Creative planning returned no structured result.");
    }

    return response.output_parsed;
  }
}

class OpenAIImageProvider implements ImageProvider {
  label: string;

  constructor(private readonly model: string) {
    this.label = `openai:${model}`;
  }

  async render({ file, buffer, prompt, size, quality }: ImageRequest) {
    const reference = await toFile(buffer, file.name || "product.png", { type: file.type });
    const response = await getOpenAI().images.edit({
      model: this.model,
      image: reference,
      prompt,
      size,
      quality,
      output_format: "png",
    });

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("Image generation returned no image data.");
    }

    return base64;
  }
}

class GeminiJsonProvider {
  constructor(private readonly model: string) {}

  async requestJson<T>(parts: Array<Record<string, unknown>>, { systemPrompt, schema }: Omit<JsonRequest<T>, "userPrompt">) {
    const geminiSchema = sanitizeGeminiSchema(toJSONSchema(schema));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${ensureGeminiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: geminiSchema,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = typeof payload?.error?.message === "string" ? payload.error.message : "Gemini request failed.";
      throw new Error(message);
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
    if (!text) {
      throw new Error("Gemini returned no JSON payload.");
    }

    const parsed = JSON.parse(stripJsonEnvelope(text));
    return schema.parse(clampToGeminiSchema(parsed, geminiSchema));
  }
}

class GeminiVisionProvider implements VisionProvider {
  label: string;
  private readonly provider: GeminiJsonProvider;

  constructor(private readonly model: string) {
    this.label = `gemini:${model}`;
    this.provider = new GeminiJsonProvider(model);
  }

  async analyze<T>({ systemPrompt, userPrompt, schema, file, buffer }: VisionRequest<T>) {
    return this.provider.requestJson(
      [
        { text: userPrompt },
        { inlineData: { mimeType: file.type, data: buffer.toString("base64") } },
      ],
      { systemPrompt, schema },
    );
  }
}

class GeminiLLMProvider implements LLMProvider {
  label: string;
  private readonly provider: GeminiJsonProvider;

  constructor(private readonly model: string) {
    this.label = `gemini:${model}`;
    this.provider = new GeminiJsonProvider(model);
  }

  async generateJson<T>({ systemPrompt, userPrompt, schema }: JsonRequest<T>) {
    return this.provider.requestJson([{ text: userPrompt }], { systemPrompt, schema });
  }
}

export function createVisionProvider(selection: ProviderSelection<StructuredProviderId>): VisionProvider {
  if (selection.provider === "gemini") {
    return new GeminiVisionProvider(selection.model);
  }

  return new OpenAIVisionProvider(selection.model);
}

export function createLlmProvider(selection: ProviderSelection<StructuredProviderId>): LLMProvider {
  if (selection.provider === "gemini") {
    return new GeminiLLMProvider(selection.model);
  }

  return new OpenAILLMProvider(selection.model);
}

export function createImageProvider(selection: ProviderSelection<ImageProviderId>): ImageProvider {
  return new OpenAIImageProvider(selection.model);
}
