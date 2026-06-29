import type { CreativeType } from "@/lib/constants";
import type { CreativeStrategy, ProductAnalysis, PromptObject } from "./schemas";

export const PRODUCT_ANALYSIS_SYSTEM_PROMPT = `
You are a senior beauty-industry product analyst. Inspect only what is reasonably visible in the supplied product image. Return precise structured data for an advertising creative director.

Rules:
- Do not invent a brand name, ingredients, efficacy, certifications, or medical claims.
- Treat audience and positioning as visual-market estimates, not facts.
- Describe colors and materials in useful art-direction language.
- premiumScore is an integer from 1 to 10 based on packaging and presentation only.
- Output must match the supplied schema exactly.
`.trim();

export const STRATEGY_SYSTEM_PROMPT = `
You are an AI creative director specializing in premium cosmetic advertising for mobile-first Instagram and TikTok placements (Reels, Stories, and the TikTok feed). Develop exactly five distinct art directions from the supplied product analysis.

The strategies must appear once each and in this exact order:
1. Hero Product
2. Lifestyle
3. Minimal Editorial
4. Benefit Focus
5. Premium Campaign Poster

Global rules:
- 9:16 vertical full-screen composition. Keep the product and key focal area centered in the safe zone, leaving the top ~12% and bottom ~18% clear of critical detail for platform UI (captions, profile, CTA buttons) and frontend overlays.
- Premium, minimalist, photorealistic beauty advertising; never copy a real brand identity.
- Use ivory, cream, beige, soft pink, rose gold, white, or matte black as appropriate to the actual product.
- Human elements (the "humanElement" field): set to "none" for Hero Product, Minimal Editorial, and Premium Campaign Poster — these stay pure product with no people.
- For Lifestyle and Benefit Focus only, you MAY introduce a tasteful application/result human element WHEN the product type makes it natural: nail products -> manicured fingertips/nails wearing the exact polish color; lip products -> lips wearing the shade; foundation/powder/blush/bronzer -> a single cheek or jawline of natural premium skin; mascara/eyeliner -> a single eye and lash line; skincare -> a fingertip or cheek showing texture/glow. Otherwise set "none".
- When used, humanElement must describe an elegant MACRO CLOSE-CROP only (just nails/fingertips, just lips, a single cheek, a single eye). Never full hands, full faces, or bodies. Natural, flawless-but-real, diverse skin; keep the actual product visible in frame where natural and match any applied color to the product.
- Avoid clutter, neon, clip art, cartoon styling, and cheap gradients.
- Reserve quiet negative space for frontend-applied logo, headline, subheadline, and CTA. Do not ask the image model to render text.
- Benefit Focus may suggest one conservative visual benefit, but must not invent clinical or performance claims. If no benefit is visible, use a product-experience benefit such as “Everyday ritual”.
- Headlines must be short, tasteful, and based only on visible or generic product truths.
- Output must match the supplied schema exactly.
`.trim();

const TEMPLATES: Record<CreativeType, string> = {
  "Hero Product": `Luxury hero product campaign. {{product}} centered as the unmistakable focal point on a sculptural cream marble pedestal. {{composition}}. {{background}}. {{lighting}} with soft grounded shadows and restrained warm metallic reflections. Camera: {{camera}}. Palette: {{palette}}. No decorative clutter; monumental product clarity; large calm whitespace in {{textPlacement}}.`,
  Lifestyle: `Editorial luxury vanity still life featuring the exact referenced {{product}}. {{composition}} in a refined, believable vanity scene. Background: {{background}}. Curated props only: {{props}}. {{lighting}}. Camera: {{camera}}. Palette: {{palette}}. Tactile premium materials, restrained storytelling, no person or body parts, intentional whitespace in {{textPlacement}}.`,
  "Minimal Editorial": `High-fashion magazine still life of the exact referenced {{product}}. {{composition}}. Expansive negative space, subtle asymmetry, {{background}}, nearly no props ({{props}}). {{lighting}}. Camera: {{camera}}. Palette: {{palette}}. Quiet editorial confidence and a tiny reserved brand area; whitespace in {{textPlacement}}.`,
  "Benefit Focus": `Single-benefit product visual featuring one large exact referenced {{product}} and no duplicates. Art direction communicates {{objective}} through material, lighting, and composition only—no rendered words or unverifiable symbols. {{composition}}. {{background}}. {{lighting}}. Props: {{props}}. Camera: {{camera}}. Palette: {{palette}}. Small clean headline space in {{textPlacement}}.`,
  "Premium Campaign Poster": `Scroll-stopping premium cosmetic campaign poster featuring the exact referenced {{product}} at large scale. {{composition}}. Luxurious {{background}} with controlled depth and elegant reflections. {{lighting}}. Props: {{props}}. Camera: {{camera}}. Palette: {{palette}}. Strong mobile hierarchy, dramatic restraint, and a clearly empty CTA area at {{ctaPlacement}}.`,
};

const NEGATIVE_PROMPT = [
  "additional products",
  "duplicate product",
  "altered packaging shape",
  "changed cap or label",
  "invented branding",
  "rendered text or letters",
  "watermark",
  "human model",
  "hands",
  "busy composition",
  "neon colors",
  "clipart",
  "cartoon or illustration",
  "plastic-looking materials",
  "harsh shadows",
  "blurry product",
  "distorted geometry",
  "cropped product",
  "low resolution",
  "CGI or 3D render look",
  "AI artifacts",
  "waxy or overly smooth surfaces",
  "oversaturated colors",
  "flat lighting",
  "amateur snapshot",
  "HDR halos",
  "noisy or grainy",
];

function replaceVariables(template: string, values: Record<string, string>) {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => values[key] ?? "");
}

function hasHumanElement(strategy: CreativeStrategy) {
  const value = strategy.humanElement?.trim().toLowerCase();
  return Boolean(value) && value !== "none";
}

export function buildPromptObject(analysis: ProductAnalysis, strategy: CreativeStrategy): PromptObject {
  const product = `${analysis.finish} ${analysis.primaryColors.join(" and ")} ${analysis.productType} in ${analysis.packagingType}`;
  const camera = `${strategy.cameraAngle}, ${strategy.cameraLens}`;
  const withHuman = hasHumanElement(strategy);
  // When an application/result shot is intended, lift the blanket "no people" negatives
  // (still no full faces/bodies — the strategy constrains it to elegant macro crops).
  const negativePrompt = withHuman
    ? NEGATIVE_PROMPT.filter((item) => item !== "human model" && item !== "hands")
    : NEGATIVE_PROMPT;
  const variables = {
    product,
    objective: strategy.objective,
    background: strategy.background,
    lighting: strategy.lighting,
    composition: strategy.composition,
    props: strategy.props.length ? strategy.props.join(", ") : "none",
    camera,
    palette: strategy.colorPalette.join(", "),
    textPlacement: strategy.textPlacement,
    ctaPlacement: strategy.ctaPlacement,
  };

  const artDirection = replaceVariables(TEMPLATES[strategy.creative], variables);
  const humanDirection = withHuman
    ? `Application/result detail: ${strategy.humanElement}. Render as an elegant macro close-crop only — flawless but photorealistic skin with natural texture and anatomically correct hands/fingers; absolutely no full faces, full hands, or bodies. Keep the product recognizable in or beside the frame and match any applied color exactly to the product.`
    : `No people, hands, or body parts of any kind. Pure product composition.`;
  const prompt = [
    `Create a 9:16 vertical full-screen, ultra-realistic studio-quality luxury beauty advertisement for Instagram Reels/Stories and TikTok, using the uploaded image as the product identity reference.`,
    `Preserve the product exactly: silhouette, proportions, packaging, cap, label placement, visible logo, colors, and finish. The same physical product must remain immediately recognizable.`,
    artDirection,
    humanDirection,
    `Aesthetic: high-end editorial beauty photography shot on a medium-format camera with a fast prime lens, true-to-life physically based lighting, shallow natural depth of field, premium tactile materials, clean composition, soft realistic shadows, elegant controlled reflections, accurate optics, meticulous high-end retouching, and subtle filmic color grading. Photoreal, not rendered or illustrated.`,
    `Frame for mobile full-screen: keep the product and focal interest within the central safe zone, with the top ~12% and bottom ~18% kept visually calm and clear of critical detail for platform UI and later HTML text overlays.`,
    `The image itself must contain no generated typography. Leave the requested quiet areas naturally empty for later HTML text overlays.`,
    `Avoid: ${negativePrompt.join(", ")}.`,
  ].join("\n\n");

  return { ...strategy, prompt, negativePrompt: [...negativePrompt] };
}
