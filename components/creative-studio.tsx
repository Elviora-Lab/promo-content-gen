"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, CREATIVE_META, MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { GeneratedCreative, GenerationMode, GenerationResult } from "@/lib/ai/schemas";

const STEPS = ["Reading the product", "Directing the campaign", "Building five scenes", "Finishing the artwork"];

export function CreativeStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<GenerationMode>("draft");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) return;
    const timings = [0, 8_000, 18_000, 45_000];
    const timers = timings.map((delay, index) => window.setTimeout(() => setProgressStep(index), delay));
    return () => timers.forEach(window.clearTimeout);
  }, [loading]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function chooseFile(nextFile: File) {
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(nextFile.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setError("Please choose a PNG, JPG, or WebP image.");
      return;
    }
    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setError("That image is over 10 MB. Please choose a smaller file.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setResult(null);
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function generate(options: { forceImages?: boolean } = {}) {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressStep(0);

    try {
      const body = new FormData();
      body.append("image", file);
      body.append("mode", mode);
      if (options.forceImages) {
        body.append("forceImages", "true");
      }
      const response = await fetch("/api/generate", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");
      setResult(data as GenerationResult);
      window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grain min-h-screen overflow-hidden">
      <nav className="flex h-18 items-center justify-between border-b border-black/10 px-5 md:px-10">
        <a href="#top" className="flex items-center gap-3" aria-label="Atelier home">
          <span className="serif text-[1.7rem] leading-none">Atelier</span>
          <span className="hidden rounded-full border border-black/15 px-2 py-1 text-[9px] font-bold tracking-[.16em] text-black/55 sm:block">AI STUDIO</span>
        </a>
        <div className="flex items-center gap-6 text-xs font-medium tracking-wide">
          <a href="#how-it-works" className="hidden transition-opacity hover:opacity-55 sm:block">How it works</a>
          <a href="#studio" className="flex items-center gap-2 rounded-full bg-[#1c1b19] px-4 py-2.5 text-white">
            Open studio <ArrowRight size={13} />
          </a>
        </div>
      </nav>

      <section id="top" className="relative mx-auto grid max-w-[1500px] gap-10 px-5 pb-20 pt-16 md:px-10 lg:grid-cols-[1.2fr_.8fr] lg:pb-28 lg:pt-24">
        <div className="relative z-10 animate-rise">
          <div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.23em] text-black/55">
            <span className="h-px w-8 bg-black/40" /> Beauty creative, directed by AI
          </div>
          <h1 className="max-w-[840px] text-[clamp(3.8rem,8vw,8.4rem)] font-medium leading-[.82] tracking-[-.065em]">
            One product.<br />
            <span className="serif font-normal italic tracking-[-.035em]">Five campaigns.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-[#645f58] md:text-lg">
            Upload a cosmetic product photo. Your AI creative director studies the packaging, builds the strategy, and produces five distinct Meta-ready art directions.
          </p>
          <a href="#studio" className="mt-9 inline-flex items-center gap-3 border-b border-black pb-2 text-sm font-semibold">
            Start creating <ArrowDown size={14} />
          </a>
        </div>

        <div className="relative hidden min-h-[520px] lg:block" aria-hidden="true">
          <div className="absolute right-4 top-0 h-[440px] w-[315px] rotate-[4deg] overflow-hidden bg-[#d8ccc0] shadow-[0_30px_80px_rgba(35,28,20,.12)]">
            <div className="absolute inset-x-0 top-0 p-6 text-[9px] font-bold tracking-[.22em]">FORM / LIGHT / RITUAL</div>
            <div className="absolute left-1/2 top-[44%] h-48 w-24 -translate-x-1/2 rounded-t-[3rem] bg-gradient-to-r from-[#342c2b] via-[#8b6e6a] to-[#2e2928] shadow-[0_25px_35px_rgba(27,19,18,.26)]">
              <div className="absolute left-1/2 top-7 h-20 w-[1px] bg-white/25" />
            </div>
            <span className="serif absolute bottom-7 left-6 text-3xl italic">Quiet luxury.</span>
          </div>
          <div className="absolute bottom-4 left-6 h-64 w-52 -rotate-[7deg] bg-[#232220] p-5 text-white shadow-2xl">
            <span className="text-[8px] tracking-[.25em] text-white/60">CAMPAIGN 05</span>
            <div className="absolute inset-x-5 bottom-6">
              <Sparkles size={18} strokeWidth={1} className="mb-4" />
              <p className="serif text-3xl leading-none">Made to<br />be noticed.</p>
            </div>
          </div>
          <span className="absolute right-0 top-[470px] text-[9px] font-bold uppercase tracking-[.22em] text-black/40">9:16 / Instagram &amp; TikTok</span>
        </div>
      </section>

      <section id="studio" className="border-y border-black/10 bg-[#eae3d8] px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-24">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.22em] text-black/50">The creative room</span>
            <h2 className="serif mt-5 text-5xl leading-[.95] md:text-7xl">Bring us the<br /><em>product.</em></h2>
            <p className="mt-7 max-w-sm text-sm leading-6 text-black/55">A clean, front-facing packshot works beautifully. We’ll preserve its form and visual identity across all five scenes.</p>
            <div className="mt-10 space-y-4 text-xs text-black/65">
              {["Exactly five distinct concepts", "Draft mode is default for cheaper iteration", "No people, clutter, or baked-in copy"].map((item) => (
                <div key={item} className="flex items-center gap-3"><span className="grid size-5 place-items-center rounded-full border border-black/20"><Check size={11} /></span>{item}</div>
              ))}
            </div>
          </div>

          <div>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => event.target.files?.[0] && chooseFile(event.target.files[0])} />
            {!preview ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); const dropped = event.dataTransfer.files[0]; if (dropped) chooseFile(dropped); }}
                className={`group relative flex min-h-[440px] w-full flex-col items-center justify-center overflow-hidden border border-dashed px-8 text-center transition-all ${dragging ? "border-black bg-white/70" : "border-black/25 bg-white/35 hover:border-black/60 hover:bg-white/55"}`}
              >
                <span className="mb-7 grid size-16 place-items-center rounded-full border border-black/15 bg-white/60 transition-transform group-hover:-translate-y-1"><Upload size={20} strokeWidth={1.5} /></span>
                <span className="serif text-3xl">Drop your product here</span>
                <span className="mt-3 text-xs text-black/45">or click to browse · PNG, JPG, WebP · max 10 MB</span>
                <span className="absolute bottom-5 right-6 text-[9px] font-bold tracking-[.18em] text-black/30">01 / INPUT</span>
              </button>
            ) : (
              <div className="grid min-h-[440px] bg-[#dcd3c6] md:grid-cols-[.85fr_1.15fr]">
                <div className="relative min-h-[340px] overflow-hidden bg-white/45">
                  {/* Product uploads are intentionally rendered with img so local object URLs work. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Uploaded product preview" className="h-full w-full object-contain p-8" />
                  <button type="button" onClick={clearFile} disabled={loading} aria-label="Remove image" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/80 transition-transform hover:scale-105 disabled:opacity-40"><X size={15} /></button>
                </div>
                <div className="flex flex-col justify-between p-7 md:p-9">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[.2em] text-black/40">Ready for direction</span>
                    <h3 className="serif mt-4 break-words text-3xl">{file?.name}</h3>
                    <p className="mt-3 text-xs text-black/45">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ""} · Original reference</p>
                    <div className="mt-6 rounded-[1.75rem] border border-black/10 bg-white/45 p-2">
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ["draft", "Draft", "Lower-cost, faster renders for iteration"],
                          ["production", "Production", "Higher-quality final export"],
                        ] as const).map(([value, label, copy]) => (
                          <button
                            key={value}
                            type="button"
                            disabled={loading}
                            onClick={() => setMode(value)}
                            className={`rounded-[1.25rem] px-4 py-3 text-left transition-colors ${mode === value ? "bg-[#1d1c1a] text-white" : "bg-transparent text-black/75 hover:bg-black/5"}`}
                          >
                            <span className="block text-[10px] font-bold uppercase tracking-[.18em]">{label}</span>
                            <span className={`mt-1 block text-[11px] leading-4 ${mode === value ? "text-white/65" : "text-black/45"}`}>{copy}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => generate()} disabled={loading} className="mt-10 flex w-full items-center justify-between bg-[#1d1c1a] px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-wait disabled:bg-black/65">
                    <span className="flex items-center gap-3">{loading ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} {loading ? "Directing campaign" : mode === "draft" ? "Generate draft creatives" : "Generate production creatives"}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {loading && <GenerationProgress current={progressStep} />}
            {error && (
              <div role="alert" className="mt-4 flex items-start justify-between gap-5 border border-[#9e493d]/25 bg-[#fff5f2] p-4 text-sm text-[#7e332a]">
                <span>{error}</span>
                <button onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button>
              </div>
            )}
          </div>
        </div>
      </section>

      {result && <Results result={result} onRegenerate={() => generate({ forceImages: true })} />}

      <section id="how-it-works" className="mx-auto max-w-[1320px] px-5 py-24 md:px-10 md:py-32">
        <div className="mb-14 flex items-end justify-between border-b border-black/15 pb-6">
          <h2 className="serif text-5xl md:text-6xl">From packshot to campaign.</h2>
          <span className="hidden text-[9px] font-bold tracking-[.22em] text-black/35 md:block">THE PROCESS / 01—04</span>
        </div>
        <div className="grid gap-px bg-black/15 md:grid-cols-4">
          {[
            ["01", "See", "Vision reads the product, finish, palette, audience, and visual positioning."],
            ["02", "Direct", "A creative strategy is composed for five fixed, high-performing ad angles."],
            ["03", "Craft", "Reusable prompt systems translate each direction into a controlled scene."],
            ["04", "Finish", "Five portrait artworks arrive ready for your final copy and launch."],
          ].map(([number, title, copy]) => (
            <article key={number} className="min-h-64 bg-[var(--paper)] p-7">
              <span className="text-[9px] font-bold tracking-[.2em] text-black/35">{number}</span>
              <h3 className="serif mt-12 text-3xl">{title}</h3>
              <p className="mt-4 text-xs leading-5 text-black/50">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-5 border-t border-black/10 px-5 py-8 text-[10px] uppercase tracking-[.16em] text-black/40 md:flex-row md:items-center md:justify-between md:px-10">
        <span>Atelier AI Creative Director</span>
        <div className="flex items-center gap-3">
          <span>Powered by</span>
          <span className="flex items-center gap-2 rounded-full border border-black/10 bg-black px-2.5 py-1.5 text-[9px] tracking-[.18em] text-[#e8d8bf]">
            <Image src="/brand/elviora-logo.png" alt="Elviora logo" width={20} height={20} className="size-5 rounded-full object-cover" />
            Elviora
          </span>
        </div>
        <span>Strategy · Art direction · Five final creatives</span>
      </footer>
    </main>
  );
}

function GenerationProgress({ current }: { current: number }) {
  return (
    <div className="mt-4 overflow-hidden border border-black/10 bg-white/55 p-5" aria-live="polite">
      <div className="mb-4 flex items-center justify-between text-xs"><span>{STEPS[current]}…</span><span className="text-black/35">This can take a few minutes</span></div>
      <div className="relative h-px overflow-hidden bg-black/15"><span className="loading-sweep absolute inset-y-0 left-0 w-1/3 bg-black" /></div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((step, index) => <span key={step} className={`text-[8px] uppercase tracking-wider ${index <= current ? "text-black" : "text-black/25"}`}>{String(index + 1).padStart(2, "0")}</span>)}
      </div>
    </div>
  );
}

function Results({ result, onRegenerate }: { result: GenerationResult; onRegenerate: () => void }) {
  const cacheSummary = [
    result.run.cache.analysis && "analysis",
    result.run.cache.strategies && "strategy",
    result.run.cache.prompts && "prompts",
    result.run.cache.images && "images",
  ].filter(Boolean).join(", ");

  return (
    <section id="results" className="bg-[#1d1c1a] px-5 py-20 text-white md:px-10 md:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-14 flex flex-col gap-7 border-b border-white/15 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[.22em] text-white/45">Campaign complete</span>
            <h2 className="serif mt-4 text-5xl md:text-7xl">Five ways to be <em>seen.</em></h2>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/55">
              <span className="rounded-full border border-white/15 px-3 py-2">{result.run.mode}</span>
              <span className="rounded-full border border-white/15 px-3 py-2">{result.run.image.quality} quality</span>
              <span className="rounded-full border border-white/15 px-3 py-2">{result.run.providers.vision} vision</span>
              <span className="rounded-full border border-white/15 px-3 py-2">{result.run.providers.planner} planner</span>
              <span className="rounded-full border border-white/15 px-3 py-2">{result.run.providers.image} image</span>
            </div>
            <p className="mt-4 max-w-2xl text-xs leading-5 text-white/45">
              {cacheSummary ? `Reused cached ${cacheSummary}.` : "Generated a fresh plan and image set for this run."} Use “New render” only when you want to pay for new image outputs.
            </p>
          </div>
          <button type="button" onClick={onRegenerate} className="flex w-fit items-center gap-2 border border-white/25 px-4 py-3 text-xs transition-colors hover:bg-white hover:text-black"><RefreshCw size={13} /> New render</button>
        </div>

        <AnalysisStrip result={result} />

        <div className="mt-12 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {result.creatives.map((creative, index) => <CreativeCard key={creative.id} creative={creative} index={index} />)}
        </div>
      </div>
    </section>
  );
}

function AnalysisStrip({ result }: { result: GenerationResult }) {
  const { analysis } = result;
  const facts = [
    ["Product", analysis.productType],
    ["Positioning", analysis.brandPositioning],
    ["Audience", analysis.targetAudience],
    ["Premium", `${analysis.premiumScore}/10`],
  ];
  return <div className="grid border border-white/15 sm:grid-cols-2 lg:grid-cols-4">{facts.map(([label, value]) => <div key={label} className="border-white/15 p-5 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-r sm:[&:nth-child(3)]:border-b-0 lg:[&:not(:last-child)]:border-b-0"><span className="block text-[8px] font-bold uppercase tracking-[.2em] text-white/35">{label}</span><span className="mt-2 block text-sm text-white/85">{value}</span></div>)}</div>;
}

// Tasteful default call-to-action per concept. Editable copy lives in the frontend
// (never rendered by the image model) so it stays crisp, on-brand, and spell-correct.
const CTA_LABEL: Record<string, string> = {
  "Hero Product": "Shop Now",
  Lifestyle: "Shop the Look",
  "Minimal Editorial": "Discover",
  "Benefit Focus": "Learn More",
  "Premium Campaign Poster": "Explore",
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Composite the styled headline + CTA into the actual pixels so a downloaded PNG is a
// finished, post-ready ad. Mirrors the on-screen HTML overlay proportionally.
async function renderCreativeToBlob(opts: { imageUrl: string; headline: string; cta: string; serifFont: string }) {
  const img = await loadImage(opts.imageUrl);
  const canvas = document.createElement("canvas");
  const W = (canvas.width = img.naturalWidth || 1080);
  const H = (canvas.height = img.naturalHeight || 1920);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, W, H);

  // Legibility scrim rising from the bottom.
  const scrim = ctx.createLinearGradient(0, H * 0.45, 0, H);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);

  const pad = Math.round(W * 0.08);
  const maxTextW = W - pad * 2;
  const headlineSize = Math.round(W * 0.078);
  const lineHeight = Math.round(headlineSize * 1.12);

  // CTA pill metrics (kept clear of the bottom ~13% platform-UI safe zone).
  const ctaSize = Math.round(W * 0.032);
  const ctaLabel = opts.cta.toUpperCase();
  ctx.font = `600 ${ctaSize}px system-ui, -apple-system, sans-serif`;
  const ctaTextW = ctx.measureText(ctaLabel).width;
  const pillPadX = Math.round(ctaSize * 1.1);
  const pillH = Math.round(ctaSize + ctaSize * 1.3);
  const pillW = Math.round(ctaTextW + pillPadX * 2);
  const pillTop = Math.round(H * (1 - 0.13) - pillH);

  // Headline stacks upward from just above the pill.
  ctx.font = `${headlineSize}px ${opts.serifFont}`;
  const lines = wrapLines(ctx, opts.headline, maxTextW);
  const gap = Math.round(W * 0.045);
  const lastBaseline = pillTop - gap;

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = Math.round(W * 0.02);
  ctx.shadowOffsetY = Math.round(W * 0.004);
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, lastBaseline - (lines.length - 1 - i) * lineHeight);
  });

  // CTA pill (shadow off).
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#ffffff";
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(pad, pillTop, pillW, pillH, pillH / 2);
    ctx.fill();
  } else {
    ctx.fillRect(pad, pillTop, pillW, pillH);
  }
  ctx.fillStyle = "#111111";
  ctx.font = `600 ${ctaSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(ctaLabel, pad + pillPadX, pillTop + pillH / 2 + Math.round(ctaSize * 0.05));

  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

function CreativeCard({ creative, index }: { creative: GeneratedCreative; index: number }) {
  const [open, setOpen] = useState(false);
  const [showText, setShowText] = useState(true);
  const headlineRef = useRef<HTMLParagraphElement>(null);
  const meta = CREATIVE_META[creative.creative];
  const headline = creative.suggestedHeadline?.trim();
  const cta = CTA_LABEL[creative.creative] ?? "Shop Now";

  function saveBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `atelier-${meta.short.toLowerCase()}-${creative.id}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function download() {
    const rawDownload = async () => {
      try {
        const response = await fetch(creative.imageUrl);
        saveBlob(await response.blob());
      } catch {
        window.open(creative.imageUrl, "_blank", "noopener,noreferrer");
      }
    };

    if (!showText || !headline) {
      await rawDownload();
      return;
    }

    try {
      await document.fonts.ready;
      const serifFont = headlineRef.current
        ? getComputedStyle(headlineRef.current).fontFamily
        : "Georgia, serif";
      const blob = await renderCreativeToBlob({ imageUrl: creative.imageUrl, headline, cta, serifFont });
      if (blob) {
        saveBlob(blob);
        return;
      }
      await rawDownload();
    } catch {
      // Cross-origin taint or canvas failure — fall back to the clean image.
      await rawDownload();
    }
  }

  return (
    <article className="animate-rise" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="group relative aspect-[9/16] overflow-hidden bg-white/5">
        {/* Generated URLs can be data URLs or arbitrary configured Cloudinary hosts. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={creative.imageUrl} alt={`${creative.creative} generated ad creative`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]" />
        <span className="absolute left-4 top-4 bg-black/65 px-2.5 py-1.5 text-[8px] font-bold tracking-[.18em] backdrop-blur">{meta.number} / {meta.short.toUpperCase()}</span>

        {showText && headline && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-[13%] px-[8%]">
              <p ref={headlineRef} className="serif text-[1.7rem] leading-[1.06] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">{headline}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[.18em] text-black">{cta}<ArrowRight size={12} /></span>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setShowText((value) => !value)} aria-pressed={showText} aria-label={showText ? "Hide text overlay" : "Show text overlay"} title={showText ? "Hide text overlay" : "Show text overlay"} className={`absolute right-4 top-4 grid size-9 place-items-center rounded-full shadow-lg transition ${showText ? "bg-white text-black" : "bg-black/55 text-white backdrop-blur"}`}><Type size={15} /></button>
        <button type="button" onClick={download} aria-label={`Download ${creative.creative}`} className="absolute bottom-4 right-4 grid size-11 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 shadow-xl transition-all group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"><Download size={16} /></button>
      </div>
      <div className="border-x border-b border-white/15 p-5">
        <div className="flex items-start justify-between gap-5">
          <div><h3 className="serif text-2xl">{creative.creative}</h3><p className="mt-2 text-xs text-white/45">{creative.suggestedHeadline}</p></div>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Show creative direction" className="grid size-8 place-items-center border border-white/15"><ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>
        </div>
        {open && <div className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-5 text-white/50"><p>{creative.rationale}</p><p className="mt-2"><span className="text-white/75">Direction:</span> {creative.composition} · {creative.lighting}</p></div>}
      </div>
    </article>
  );
}
