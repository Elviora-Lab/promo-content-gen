import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

const CACHE_ROOT = path.join(process.cwd(), ".cache", "atelier");

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
  const dir = await ensureDir(stage);
  await fs.writeFile(path.join(dir, `${key}.json`), JSON.stringify(value, null, 2), "utf8");
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
