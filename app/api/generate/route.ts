import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ZodError } from "zod";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { runCreativePipeline } from "@/lib/ai/pipeline";
import { GenerationModeSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return isPng || isJpeg || isWebp;
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Submit the product image as multipart form data." }, { status: 400 });
    }

    const formData = await request.formData();
    const image = formData.get("image");
    const modeValue = formData.get("mode");
    const forceImagesValue = formData.get("forceImages");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Please upload a product image." }, { status: 400 });
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(image.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return NextResponse.json({ error: "Use a PNG, JPG, or WebP image." }, { status: 415 });
    }
    if (image.size === 0 || image.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be smaller than 10 MB." }, { status: 413 });
    }
    if (!(await hasValidImageSignature(image))) {
      return NextResponse.json({ error: "The uploaded file is not a valid image." }, { status: 415 });
    }

    const mode = GenerationModeSchema.parse(typeof modeValue === "string" ? modeValue : "draft");
    const forceImages = typeof forceImagesValue === "string" ? forceImagesValue === "true" : false;
    const result = await runCreativePipeline(image, { mode, forceImages });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Creative pipeline failed", error);

    if (error instanceof OpenAI.APIError) {
      const status = error.status === 429 ? 429 : 502;
      const message = error.status === 429
        ? "The studio is at capacity. Please wait a moment and try again."
        : "The AI studio could not complete this generation. Please try again.";
      return NextResponse.json({ error: message }, { status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "The AI returned an invalid creative plan. Please try again." }, { status: 502 });
    }

    const message = error instanceof Error && (
      error.message.includes("OPENAI_API_KEY") ||
      error.message.includes("GEMINI_API_KEY") ||
      error.message.includes("AI_IMAGE_PROVIDER")
    )
      ? error.message
      : "Something went wrong while creating the campaign.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
