"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { db } from "@/lib/prisma";
import { removeUploadedImage, saveUploadedImage } from "@/lib/upload-image";
import { revalidatePath } from "next/cache";

export type ProductActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };


// ---------------------------------------------------------------------------
// เพิ่มสินค้า (รับ FormData — มีไฟล์รูปแนบจากเครื่องได้)
// ---------------------------------------------------------------------------

const productSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อสินค้า"),
  category: z.enum(PRODUCT_CATEGORIES, {
    error: "เลือกหมวดหมู่: สมาร์ทโฟนและแท็บเล็ต / อุปกรณ์ชาร์จ / อุปกรณ์เสียง / อื่นๆ",
  }),
  costPrice: z.coerce.number().int().min(0, "ต้นทุนไม่ถูกต้อง"),
  sellPrice: z.coerce.number().int().min(1, "ราคาขายต้องมากกว่า 0"),
  quantity: z.coerce.number().int().min(0).default(0),
  minQuantity: z.coerce.number().int().min(0).default(0),
});

export async function addProduct(
  formData: FormData
): Promise<ProductActionResult> {
  await requireAuth();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    costPrice: formData.get("costPrice"),
    sellPrice: formData.get("sellPrice"),
    quantity: formData.get("quantity"),
    minQuantity: formData.get("minQuantity"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const d = parsed.data;

  // รูปที่แนบ (ถ้ามี)
  const file = formData.get("image");
  let image: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      image = await saveUploadedImage(file, "products");
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ",
      };
    }
  }

  const created = await db.retailProduct.create({
    data: {
      name: d.name,
      category: d.category,
      costPrice: d.costPrice,
      sellPrice: d.sellPrice,
      quantity: d.quantity,
      minQuantity: d.minQuantity,
      image,
    },
  });

  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/");
  return { ok: true, id: created.id };
}

// ---------------------------------------------------------------------------
// ปรับสต็อก / ราคา
// ---------------------------------------------------------------------------

const qtySchema = z.object({
  id: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(999999),
});

const priceSchema = z.object({
  id: z.string().min(1),
  sellPrice: z.coerce.number().int().min(0, "ราคาขายไม่ถูกต้อง"),
  costPrice: z.coerce.number().int().min(0, "ต้นทุนไม่ถูกต้อง"),
});

export async function setQuantity(input: unknown): Promise<ProductActionResult> {
  await requireAuth();
  const parsed = qtySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { id, quantity } = parsed.data;
  const product = await db.retailProduct.findUnique({ where: { id } });
  if (!product) return { ok: false, error: "ไม่พบสินค้า" };

  await db.retailProduct.update({ where: { id }, data: { quantity } });
  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/");
  return { ok: true };
}

export async function updatePrices(input: unknown): Promise<ProductActionResult> {
  await requireAuth();
  const parsed = priceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { id, sellPrice, costPrice } = parsed.data;
  await db.retailProduct.update({
    where: { id },
    data: { sellPrice, costPrice },
  });
  revalidatePath("/products");
  revalidatePath("/pos");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ลบสินค้า
//  - ยังไม่เคยขาย (ไม่มี SaleItem) → ลบออกจริง + ลบไฟล์รูป
//  - เคยขายแล้ว (ต้องเก็บประวัติใบเสร็จ) → ซ่อน (archived) แทน
// ---------------------------------------------------------------------------

const idSchema = z.object({ id: z.string().min(1) });

export async function deleteProduct(
  input: unknown
): Promise<
  | { ok: true; mode: "deleted" | "archived" }
  | { ok: false; error: string }
> {
  await requireAuth();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  const { id } = parsed.data;

  const product = await db.retailProduct.findUnique({ where: { id } });
  if (!product) return { ok: false, error: "ไม่พบสินค้า" };

  const soldCount = await db.saleItem.count({
    where: { productId: id },
  });

  if (soldCount === 0) {
    await db.retailProduct.delete({ where: { id } });
    await removeUploadedImage(product.image);
    revalidatePath("/products");
    revalidatePath("/pos");
    revalidatePath("/");
    return { ok: true, mode: "deleted" };
  }

  await db.retailProduct.update({
    where: { id },
    data: { archived: true },
  });
  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/");
  return { ok: true, mode: "archived" };
}
