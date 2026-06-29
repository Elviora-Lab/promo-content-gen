import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

// Serverless platforms (Vercel/AWS Lambda) expose a read-only filesystem except
// for the OS temp dir, so route the cache there instead of the project directory.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const CACHE_ROOT = isServerless
  ? path.join(os.tmpdir(), "atelier-cache")
  : path.join(process.cwd(), ".cache", "atelier");

export function hashParts(...parts: Array<string | Buffer>) {
  const hash = createHash("sha256");

  for (const part of parts) {
    hash.update(part);
  }

  return hash.digest("hex");
}

async function ensureDir(...segments: string[]) {
  const dir = path.join(CACHE_ROOT, ...segments);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function cacheFilePath(stage: string, key: string) {
  return path.join(CACHE_ROOT, stage, `${key}.json`);
}

export async function readJsonCache<T>(stage: string, key: string, schema: z.ZodType<T>) {
  try {
    const filePath = cacheFilePath(stage, key);
    const raw = await fs.readFile(filePath, "utf8");
    return schema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeJsonCache(stage: string, key: string, value: unknown) {
  // Caching is a best-effort optimization; never let a read-only/full filesystem
  // break the generation pipeline.
  try {
    const dir = await ensureDir(stage);
    await fs.writeFile(path.join(dir, `${key}.json`), JSON.stringify(value, null, 2), "utf8");
  } catch (error) {
    console.warn(`Skipping ${stage} cache write:`, error instanceof Error ? error.message : error);
  }
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function publicImagePath(fileName: string) {
  return path.join(process.cwd(), "public", "generated", fileName);
}
