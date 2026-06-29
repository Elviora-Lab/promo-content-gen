import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

type StoredImage = { url: string };

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export async function storeGeneratedImage(base64: string, publicId: string): Promise<StoredImage> {
  if (!hasCloudinaryConfig()) {
    // Local/dev: persist under public/ so the image is served and reusable. On a
    // serverless host the filesystem is read-only, so fall back to an inline data
    // URL that renders without any external storage (configure Cloudinary for
    // durable, CDN-backed delivery in production).
    try {
      const outputDir = path.join(process.cwd(), "public", "generated");
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(path.join(outputDir, `${publicId}.png`), Buffer.from(base64, "base64"));
      return { url: `/generated/${publicId}.png` };
    } catch {
      return { url: `data:image/png;base64,${base64}` };
    }
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const result = await cloudinary.uploader.upload(`data:image/png;base64,${base64}`, {
    resource_type: "image",
    folder: "atelier/creatives",
    public_id: publicId,
    overwrite: true,
  });

  return { url: result.secure_url };
}
