import "server-only";
import { createClient } from "@supabase/supabase-js";
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
 * Bucket ใน Supabase Storage — ต้องสร้างเป็น Public bucket ชื่อ "pawn-images"
 * (Dashboard → Storage → New bucket → ชื่อ pawn-images → Public)
 * โฟลเดอร์ใน bucket: products/ และ pawn-items/
 */
const BUCKET = "pawn-images";

// รูปแบบ URL ที่ supabase-js สร้างให้: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
const PUBLIC_URL_MARKER = "/storage/v1/object/public/";let storage: ReturnType<typeof createClient>["storage"] | null = null;

/** สร้าง Supabase client (service role — ใช้ฝั่ง server เท่านั้น) แบบ lazy */
function getStorage() {
  if (storage) return storage;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment — " +
        "ตั้งค่าในไฟล์ .env ก่อนอัปโหลดรูป (ดู README หัวข้อ Supabase Storage)"
    );
  }
  storage = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
  return storage;
}

/**
 * ตรวจ + อัปโหลดรูปไปยัง Supabase Storage แล้วคืน public URL
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

  // ชื่อสุ่มกันชนกันและกัน path traversal จากชื่อไฟล์เดิม
  const objectPath = `${folder}/${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getStorage()
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[storage] upload failed:", error.message);
    throw new Error(
      "อัปโหลดรูปไม่สำเร็จ — ตรวจสอบ Supabase Storage (bucket ต้องชื่อ pawn-images และเป็น Public)"
    );
  }

  const { data } = getStorage().from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

/** ลบรูปออกจาก Supabase Storage — ถ้าเป็น URL ภายนอก/static path ให้ข้าม */
export async function removeUploadedImage(imagePath: string | null): Promise<void> {
  if (!imagePath) return;
  const markerIdx = imagePath.indexOf(PUBLIC_URL_MARKER);
  if (markerIdx === -1) return; // ไม่ใช่รูปที่อยู่ใน Storage (เช่น seed SVG ใน /public)

  try {
    const afterMarker = imagePath
      .slice(markerIdx + PUBLIC_URL_MARKER.length)
      .split("?")[0];
    const [bucket, ...objectPath] = afterMarker.split("/");
    if (bucket !== BUCKET || objectPath.length === 0) return;
    await getStorage().from(bucket).remove([objectPath.join("/")]);
  } catch {
    // ไฟล์อาจไม่อยู่แล้ว — ข้ามได้
  }
}