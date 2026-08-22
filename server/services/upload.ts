/**
 * Media Upload Service
 * Supports Cloudinary (default) and AWS S3
 * Falls back to local /uploads for development
 */
import { createReadStream, mkdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const PROVIDER = process.env.CLOUDINARY_CLOUD_NAME
  ? "cloudinary"
  : process.env.AWS_S3_BUCKET
  ? "s3"
  : "local";

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
}

// ── Cloudinary ─────────────────────────────────────────────────────────────
async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "video" | "raw" = "auto" as any
): Promise<UploadResult> {
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `fastsewa/${folder}`,
        resource_type: resourceType,
        // Auto-compress and generate thumbnails for video
        eager:
          resourceType === "video"
            ? [{ format: "mp4", quality: "auto" }]
            : undefined,
        eager_async: true,
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );
    stream.end(buffer);
  });
}

// ── AWS S3 ─────────────────────────────────────────────────────────────────
async function uploadToS3(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string
): Promise<UploadResult> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });

  const key = `fastsewa/${folder}/${randomBytes(8).toString("hex")}-${fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    })
  );

  const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
  return { url, publicId: key, bytes: buffer.byteLength, format: mimeType };
}

// ── Local (dev fallback) ───────────────────────────────────────────────────
async function uploadLocal(
  buffer: Buffer,
  fileName: string,
  folder: string
): Promise<UploadResult> {
  const uploadDir = join(process.cwd(), "public", "uploads", folder);
  mkdirSync(uploadDir, { recursive: true });

  const safeName = `${randomBytes(8).toString("hex")}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { writeFileSync } = await import("fs");
  writeFileSync(join(uploadDir, safeName), buffer);

  return {
    url: `/uploads/${folder}/${safeName}`,
    publicId: safeName,
    bytes: buffer.byteLength,
    format: fileName.split(".").pop() || "bin",
  };
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function uploadMedia(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: "videos" | "thumbnails" | "images"
): Promise<UploadResult> {
  const isVideo = mimeType.startsWith("video/");
  const isImage = mimeType.startsWith("image/");

  if (PROVIDER === "cloudinary") {
    const resourceType = isVideo ? "video" : isImage ? "image" : "raw";
    return uploadToCloudinary(buffer, folder, resourceType);
  }

  if (PROVIDER === "s3") {
    return uploadToS3(buffer, fileName, mimeType, folder);
  }

  return uploadLocal(buffer, fileName, folder);
}

export { PROVIDER as uploadProvider };
