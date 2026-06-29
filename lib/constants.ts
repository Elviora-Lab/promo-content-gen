export const CREATIVE_TYPES = [
  "Hero Product",
  "Lifestyle",
  "Minimal Editorial",
  "Benefit Focus",
  "Premium Campaign Poster",
] as const;

export type CreativeType = (typeof CREATIVE_TYPES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const CREATIVE_META: Record<CreativeType, { number: string; short: string }> = {
  "Hero Product": { number: "01", short: "Hero" },
  Lifestyle: { number: "02", short: "Lifestyle" },
  "Minimal Editorial": { number: "03", short: "Editorial" },
  "Benefit Focus": { number: "04", short: "Benefit" },
  "Premium Campaign Poster": { number: "05", short: "Campaign" },
};
