"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import type { ActionResult } from "@/app/actions/pawn";
import { EXPENSE_CATEGORIES } from "@/lib/format";
import { revalidatePath } from "next/cache";

export type UpsertExpenseInput = {
  id?: string;
  amount: number;
  category: (typeof EXPENSE_CATEGORIES)[number];
  description: string;
  contractId?: string;
};

const upsertExpenseSchema = z.object({
  id: z.string().optional(),
  amount: z.coerce
    .number({ message: "จำนวนเงินต้องเป็นตัวเลข" })
    .int("จำนวนเงินต้องเป็นจำนวนเต็ม (บาท)")
    .min(1, "จำนวนเงินต้องมากกว่า 0"),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(2, "กรอกรายละเอียดรายจ่าย"),
  contractId: z.string().trim().optional(),
});

export async function upsertExpense(
  input: UpsertExpenseInput
): Promise<ActionResult<{ expenseId: string }>> {
  await requireAuth();

  const parsed = upsertExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { id, amount, category, description, contractId } = parsed.data;

  try {
    // เลือกไม่เชื่อม FK ก็ได้ — contractId ยังคงเก็บเป็น string ใน DB
    const entry = id
      ? await db.expense.update({
          where: { id },
          data: { amount, category, description, contractId: contractId ?? undefined },
        })
      : await db.expense.create({
          data: { amount, category, description, contractId: contractId ?? undefined },
        });

    revalidatePath("/expenses");
    revalidatePath("/incomes");
    revalidatePath("/reports");
    revalidatePath("/");
    return { ok: true, expenseId: entry.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ",
    };
  }
}

export async function deleteExpense(
  input: { id: string }
): Promise<ActionResult<{ deletedId: string }>> {
  await requireAuth();

  try {
    await db.expense.delete({ where: { id: input.id } });
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    revalidatePath("/reports");
    revalidatePath("/");
    return { ok: true, deletedId: input.id };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "P2025") {
      return { ok: false, error: "ไม่พบรายการรายจ่าย" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ลบไม่สำเร็จ",
    };
  }
}
