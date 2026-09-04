import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PRODUCT_IMAGE_UPLOAD_HINT } from "@/lib/format";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/**
 * ตรวจ + บันทึกไฟล์รูป แล้วคืน URL path (เช่น /pawn-items/xxx.png)
 * folder: "products" หรือ "pawn-items"
 */
export async function saveUploadedImage(
  file: File,
  folder: "products" | "pawn-items"
): Promise<string> {
  if (file.size === 0) throw new Error("ไม่พบไฟล์รูป");
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("รูปภาพใหญ่เกิน 5MB");
  }
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    throw new Error(PRODUCT_IMAGE_UPLOAD_HINT);
  }

  const dir = path.join(process.cwd(), "public", folder);
  await mkdir(dir, { recursive: true });

  // ชื่อสุ่มกันชนกันและกัน path traversal จากชื่อไฟล์เดิม
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/${folder}/${filename}`;
}

/** ลบไฟล์รูปที่ระบบอัปโหลดไว้ (ไม่แตะ URL ภายนอก) */
export async function removeUploadedImage(imagePath: string | null): Promise<void> {
  if (!imagePath) return;
  const match = imagePath.match(/^\/(products|pawn-items)\/([^/]+)$/);
  if (!match) return;
  try {
    await unlink(path.join(process.cwd(), "public", match[1], match[2]));
  } catch {
    // ไฟล์อาจไม่อยู่แล้ว — ข้ามได้
  }
}