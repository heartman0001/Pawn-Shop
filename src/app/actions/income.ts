"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import type { ActionResult } from "@/app/actions/pawn";
import { INCOME_CATEGORIES } from "@/lib/format";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Schema — รายรับที่บันทึกเอง (เช่น ค่าซ่อมมือถือ +2000)
// เก็บในตาราง Expense โดยใช้ kind = INCOME เพื่อไม่ต้องสร้างตารางใหม่
// ---------------------------------------------------------------------------

const upsertIncomeSchema = z.object({
  id: z.string().optional(), // มี id = แก้ไข
  amount: z.coerce
    .number({ message: "จำนวนเงินต้องเป็นตัวเลข" })
    .int("จำนวนเงินต้องเป็นจำนวนเต็ม (บาท)")
    .min(1, "จำนวนเงินต้องมากกว่า 0"),
  category: z.enum(INCOME_CATEGORIES),
  description: z.string().trim().min(2, "กรอกรายละเอียดรายรับ"),
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
  const { id, amount, category, description } = parsed.data;

  try {
    // แก้ไขได้เฉพาะรายรับที่บันทึกเอง (ห้ามแตะรายจ่ายที่ระบบสร้างจากสัญญา)
    if (id) {
      const existing = await db.expense.findUnique({ where: { id } });
      if (!existing) return { ok: false, error: "ไม่พบรายการรายรับ" };
      if (existing.kind !== "INCOME") {
        return {
          ok: false,
          error: "แก้ไขได้เฉพาะรายรับที่บันทึกเองเท่านั้น",
        };
      }
    }

    const entry = id
      ? await db.expense.update({
          where: { id },
          data: { amount, category, description },
        })
      : await db.expense.create({
          data: { amount, category, description, kind: "INCOME" },
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
    const existing = await db.expense.findUnique({ where: { id: input.id } });
    if (!existing) return { ok: false, error: "ไม่พบรายการรายรับ" };
    if (existing.kind !== "INCOME") {
      return { ok: false, error: "ลบได้เฉพาะรายรับที่บันทึกเองเท่านั้น" };
    }

    await db.expense.delete({ where: { id: input.id } });
    revalidatePath("/incomes");
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
