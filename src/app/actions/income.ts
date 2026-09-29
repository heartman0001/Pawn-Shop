"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import type { ActionResult } from "@/app/actions/pawn";
import { INCOME_CATEGORIES } from "@/lib/format";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Schema — รายรับที่บันทึกเอง (เช่น ค่าซ่อมมือถือ +2000, ต้นทุนค่าซ่อม)
// เก็บในตาราง ManualIncome
// ---------------------------------------------------------------------------

const upsertIncomeSchema = z.object({
  id: z.string().optional(),
  amount: z.coerce
    .number({ message: "จำนวนเงินรับต้องเป็นตัวเลข" })
    .int("จำนวนเงินต้องเป็นจำนวนเต็ม (บาท)")
    .min(1, "จำนวนเงินต้องมากกว่า 0"),
  category: z.enum(INCOME_CATEGORIES),
  description: z.string().trim().min(2, "กรอกรายละเอียดรายรับ"),
  costPrice: z.coerce
    .number({ message: "ต้นทุนต้องเป็นตัวเลข" })
    .int("ต้นทุนต้องเป็นจำนวนเต็ม (บาท)")
    .min(0, "ต้นทุนต้องไม่ติดลบ"),
});

export type UpsertIncomeInput = z.infer<typeof upsertIncomeSchema>;

// ---------------------------------------------------------------------------
// เพิ่ม / แก้ไขรายรับ
// ---------------------------------------------------------------------------

export async function upsertIncome(
  input: UpsertIncomeInput
): Promise<ActionResult<{ incomeId: string }>> {
  await requireAuth();

  const parsed = upsertIncomeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { id, amount, category, description, costPrice } = parsed.data;

  try {
    const entry = id
      ? await db.manualIncome.update({
          where: { id },
          data: { amount, category, description, costPrice },
        })
      : await db.manualIncome.create({
          data: { amount, category, description, costPrice },
        });

    revalidatePath("/incomes");
    revalidatePath("/reports");
    revalidatePath("/");
    return { ok: true, incomeId: entry.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ",
    };
  }
}

// ---------------------------------------------------------------------------
// ลบรายรับ
// ---------------------------------------------------------------------------

export async function deleteIncome(
  input: { id: string }
): Promise<ActionResult<{ deletedId: string }>> {
  await requireAuth();

  try {
    await db.manualIncome.delete({ where: { id: input.id } });
    revalidatePath("/incomes");
    revalidatePath("/reports");
    revalidatePath("/");
    return { ok: true, deletedId: input.id };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "P2025") {
      return { ok: false, error: "ไม่พบรายการรายรับ" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ลบไม่สำเร็จ",
    };
  }
}
