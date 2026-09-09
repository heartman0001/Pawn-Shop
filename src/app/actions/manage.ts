"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import type { ActionResult } from "@/app/actions/pawn";
import {
  saveUploadedImage,
  removeUploadedImage,
} from "@/lib/upload-image";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const nationalIdSchema = z
  .string()
  .trim()
  .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");

// หมายเหตุ: ไฟล์ "use server" ห้าม export ค่าที่ไม่ใช่ async function
// (schema จึงเก็บไว้ภายในไฟล์เท่านั้น — export ได้เฉพาะ type)
const upsertCustomerSchema = z.object({
  id: z.string().optional(), // มี id = แก้ไข
  nationalId: nationalIdSchema,
  fullName: z.string().trim().min(2, "กรอกชื่อ-นามสกุล"),
  phone: z.string().trim().optional().default(""),
});

export type UpsertCustomerInput = z.infer<typeof upsertCustomerSchema>;

const upsertPawnItemSchema = z.object({
  id: z.string().optional(), // มี id = แก้ไข
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  itemName: z.string().trim().min(2, "กรอกรายละเอียดสิ่งของ"),
  serialNumber: z.string().trim().optional().default(""),
  storageBox: z.string().trim().optional().default(""),
  principalAmount: z.coerce
    .number({ message: "เงินต้นต้องเป็นตัวเลข" })
    .int("เงินต้นต้องเป็นจำนวนเต็ม")
    .min(1, "เงินต้นต้องมากกว่า 0"),
  interestRatePercent: z.coerce
    .number({ message: "ดอกเบี้ยต้องเป็นตัวเลข" })
    .min(0)
    .max(100, "ดอกเบี้ยสูงเกินไป"),
});

// ---------------------------------------------------------------------------
// ลูกค้า — เพิ่ม / แก้ไข
// ---------------------------------------------------------------------------

export async function upsertCustomer(
  input: UpsertCustomerInput
): Promise<ActionResult<{ customerId: string }>> {
  await requireAuth();

  const parsed = upsertCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { id, nationalId, fullName, phone } = parsed.data;

  try {
    // กันเลขบัตรซ้ำ (unique)
    const dup = await db.customer.findUnique({ where: { nationalId } });
    if (dup && dup.id !== id) {
      return {
        ok: false,
        error: `เลขบัตรนี้มีลูกค้าใช้แล้ว (${dup.fullName})`,
      };
    }

    const customer = id
      ? await db.customer.update({
          where: { id },
          data: { nationalId, fullName, phone: phone || "" },
        })
      : await db.customer.create({
          data: { nationalId, fullName, phone: phone || "" },
        });

    revalidatePath("/manage");
    revalidatePath("/customers");
    revalidatePath("/pawn/new");
    return { ok: true, customerId: customer.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ",
    };
  }
}

// ---------------------------------------------------------------------------
// ลูกค้า — ลบ (ลบได้เฉพาะคนที่ไม่มีสัญญาจำนำ)
// ---------------------------------------------------------------------------

export async function deleteCustomer(
  input: { id: string }
): Promise<ActionResult<{ deletedId: string }>> {
  await requireAuth();

  const customer = await db.customer.findUnique({
    where: { id: input.id },
    include: { _count: { select: { pawnContracts: true } } },
  });
  if (!customer) return { ok: false, error: "ไม่พบลูกค้า" };
  if (customer._count.pawnContracts > 0) {
    return {
      ok: false,
      error: `ลบไม่ได้ — ลูกค้านี้มีสัญญาจำนำ ${customer._count.pawnContracts} สัญญา`,
    };
  }

  try {
    await db.customer.delete({ where: { id: input.id } });
    revalidatePath("/manage");
    revalidatePath("/customers");
    return { ok: true, deletedId: input.id };
  } catch (error) {
    console.error("[deleteCustomer] failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ลบลูกค้าไม่สำเร็จ",
    };
  }
}

// ---------------------------------------------------------------------------
// ข้อมูลสินค้ารับจำนำ (สัญญา) — เพิ่ม / แก้ไข (รองรับแนบรูป)
// ---------------------------------------------------------------------------

export async function upsertPawnItem(
  formData: FormData
): Promise<ActionResult<{ contractId: string; contractNumber: string | null }>> {
  await requireAuth();

  const input = {
    id: String(formData.get("id") ?? "") || undefined,
    customerId: String(formData.get("customerId") ?? ""),
    itemName: String(formData.get("itemName") ?? ""),
    serialNumber: String(formData.get("serialNumber") ?? ""),
    storageBox: String(formData.get("storageBox") ?? ""),
    principalAmount: String(formData.get("principalAmount") ?? ""),
    interestRatePercent: String(formData.get("interestRatePercent") ?? ""),
  };
  const parsed = upsertPawnItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const data = parsed.data;

  try {
    // อัปโหลดรูปใหม่ (ถ้ามีแนบมา)
    const imageFile = formData.get("image");
    let newImage: string | null = null;
    if (imageFile instanceof File && imageFile.size > 0) {
      newImage = await saveUploadedImage(imageFile, "pawn-items");
    }

    const result = await db.$transaction(async (tx) => {
      if (data.id) {
        // ---------- แก้ไข ----------
        const existing = await tx.pawnContract.findUnique({
          where: { id: data.id },
          include: {
            _count: { select: { saleItems: true } },
            redemption: { select: { id: true } },
          },
        });
        if (!existing) throw new Error("ไม่พบสัญญา");

        // กติกาการแก้ไข: ห้ามแตะข้อมูลการเงิน/สถานะ ถ้าสัญญาเคยมีธุรกรรมแล้ว
        const hasTx =
          existing.renewalCount > 0 ||
          existing.redemption !== null ||
          existing._count.saleItems > 0;

        let customerId = existing.customerId;
        if (data.customerId !== existing.customerId) {
          const cust = await tx.customer.findUnique({
            where: { id: data.customerId },
          });
          if (!cust) throw new Error("ไม่พบลูกค้าที่เลือก");
          // เปลี่ยนเจ้าของได้เฉพาะเมื่อยังไม่มีธุรกรรม
          if (hasTx && cust.id !== existing.customerId) {
            throw new Error(
              "สัญญาที่มีธุรกรรมแล้ว (ต่อดอก/ไถ่ถอน/ขาย) เปลี่ยนลูกค้าไม่ได้"
            );
          }
          customerId = cust.id;
        }

        const updated = await tx.pawnContract.update({
          where: { id: data.id },
          data: {
            customerId,
            itemName: data.itemName,
            serialNumber: data.serialNumber || null,
            storageBox: data.storageBox || null,
            // แก้เงินต้นได้เฉพาะสัญญาที่ยังไม่มีธุรกรรม
            ...(hasTx ? {} : { principalAmount: data.principalAmount }),
            // แก้ดอกเบี้ยได้เฉพาะสัญญา ACTIVE
            ...(existing.status === "ACTIVE"
              ? { interestRatePercent: data.interestRatePercent }
              : {}),
            // รูป: ถ้าอัปโหลดใหม่ → ลบรูปเก่าใน Storage ทิ้ง
            ...(newImage
              ? {
                  image: newImage,
                }
              : {}),
          },
        });

        if (newImage && existing.image) {
          await removeUploadedImage(existing.image);
        }
        return { contractId: updated.id, contractNumber: updated.contractNumber };
      }

      // ---------- เพิ่มใหม่ ----------
      const cust = await tx.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!cust) throw new Error("ไม่พบลูกค้าที่เลือก");

      const created = await tx.pawnContract.create({
        data: {
          contractNumber: `PC-M${Date.now()}`, // เลขชั่วคราว unique กันชน (แก้ได้ที่หน้าสัญญา)
          customerId: cust.id,
          itemName: data.itemName,
          image: newImage,
          serialNumber: data.serialNumber || null,
          storageBox: data.storageBox || null,
          principalAmount: data.principalAmount,
          interestRatePercent: data.interestRatePercent,
          startDate: new Date(),
          dueDate: new Date(),
        },
      });
      return { contractId: created.id, contractNumber: created.contractNumber };
    });

    revalidatePath("/manage");
    revalidatePath("/pawns");
    revalidatePath("/");
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ",
    };
  }
}

// ---------------------------------------------------------------------------
// ข้อมูลสินค้ารับจำนำ (สัญญา) — ลบ
// ---------------------------------------------------------------------------

export async function deletePawnItem(
  input: { id: string }
): Promise<ActionResult<{ deletedId: string }>> {
  await requireAuth();

  const contract = await db.pawnContract.findUnique({
    where: { id: input.id },
    include: {
      _count: { select: { renewals: true, saleItems: true } },
      redemption: { select: { id: true } },
    },
  });
  if (!contract) return { ok: false, error: "ไม่พบสัญญา" };

  const hasTx =
    contract._count.renewals > 0 ||
    contract.redemption !== null ||
    contract._count.saleItems > 0;

  if (hasTx) {
    return {
      ok: false,
      error:
        "ลบไม่ได้ — สัญญานี้มีธุรกรรมแล้ว (ต่อดอก/ไถ่ถอน/ขาย) ระบบต้องเก็บประวัติการเงินไว้",
    };
  }

  try {
    // ลบรายจ่าย "เงินต้นรับจำนำ" ที่ผูกกับสัญญานี้ด้วย (กัน FK + ไม่ให้ค้างในรายงาน)
    await db.$transaction(async (tx) => {
      await tx.expense.deleteMany({ where: { contractId: input.id } });
      await tx.pawnContract.delete({ where: { id: input.id } });
    });
    if (contract.image) await removeUploadedImage(contract.image);
    revalidatePath("/manage");
    revalidatePath("/pawns");
    revalidatePath("/reports");
    revalidatePath("/");
    return { ok: true, deletedId: input.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ลบไม่สำเร็จ",
    };
  }
}
