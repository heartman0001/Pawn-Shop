"use server";

import { requireAuth } from "@/lib/auth";
import {
  createPawnInputSchema,
  ForfeitInput,
  forfeitSchema,
  RedeemInput,
  redeemSchema,
  RenewInterestInput,
  renewInterestSchema,
} from "@/lib/definitions";
import { db } from "@/lib/prisma";
import {
  addDays,
  calcOverdueInterest,
  calcPeriodInterest,
  calcOverdueRounds,
  parseDateOnly,
  PAWN_TERM_DAYS,
} from "@/lib/pawn-math";
import { nextSequentialNumber } from "@/lib/refnumbers";
import { saveUploadedImage } from "@/lib/upload-image";
import { revalidatePath } from "next/cache";

export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// สร้างสัญญาจำนำ (ค้นหา/สร้างลูกค้า + บันทึกสัญญา + แนบรูปสิ่งของ ในหน้าเดียว)
// รับ FormData เพื่อรองรับการแนบไฟล์รูปจากเครื่อง
// ---------------------------------------------------------------------------

export async function createPawnContract(
  formData: FormData
): Promise<ActionResult<{ contractId: string; contractNumber: string }>> {
  await requireAuth();

  const input = {
    customer:
      formData.get("customerMode") === "new"
        ? {
            mode: "new",
            nationalId: String(formData.get("nationalId") ?? ""),
            fullName: String(formData.get("fullName") ?? ""),
            phone: String(formData.get("phone") ?? ""),
          }
        : {
            mode: "existing",
            customerId: String(formData.get("customerId") ?? ""),
          },
    itemName: String(formData.get("itemName") ?? ""),
    serialNumber: String(formData.get("serialNumber") ?? ""),
    storageBox: String(formData.get("storageBox") ?? ""),
    principalAmount: String(formData.get("principalAmount") ?? ""),
    interestRatePercent: String(formData.get("interestRatePercent") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    termDays: PAWN_TERM_DAYS, // อายุสัญญา fix = ทุกๆ 10 วัน
  };

  const parsed = createPawnInputSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return { ok: false, error: msg };
  }
  const data = parsed.data;

  // แนบรูปสิ่งของ (ถ้ามี)
  const imageFile = formData.get("image");
  let image: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      image = await saveUploadedImage(imageFile, "pawn-items");
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ",
      };
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1) หา / สร้างลูกค้า
      let customerId: string;
      if (data.customer.mode === "existing") {
        const existing = await tx.customer.findUnique({
          where: { id: data.customer.customerId },
        });
        if (!existing) throw new Error("ไม่พบลูกค้าที่เลือก");
        customerId = existing.id;
      } else {
        const byNationalId = await tx.customer.findUnique({
          where: { nationalId: data.customer.nationalId },
        });
        if (byNationalId) {
          customerId = byNationalId.id; // มีอยู่แล้ว → ใช้ลูกค้าเดิม
        } else {
          const created = await tx.customer.create({
            data: {
              nationalId: data.customer.nationalId,
              fullName: data.customer.fullName,
              phone: data.customer.phone || "",
            },
          });
          customerId = created.id;
        }
      }

      // 2) คำนวณวันครบกำหนด = วันเริ่ม + 10 วัน (fix)
      const startDate = parseDateOnly(data.startDate);
      const dueDate = addDays(startDate, data.termDays);

      // 3) สร้างสัญญา
      const contract = await tx.pawnContract.create({
        data: {
          contractNumber: await nextSequentialNumber(tx, "PC", startDate),
          customerId,
          itemName: data.itemName,
          image,
          serialNumber: data.serialNumber || null,
          storageBox: data.storageBox || null,
          principalAmount: data.principalAmount,
          interestRatePercent: data.interestRatePercent,
          startDate,
          dueDate,
        },
      });

      // 4) บันทึกรายจ่าย: เงินต้นที่จ่ายออกให้ลูกค้า (ตัดเป็นรายจ่ายในรายงาน)
      await tx.expense.create({
        data: {
          amount: data.principalAmount,
          category: "PAWN_PRINCIPAL",
          description: `จ่ายเงินต้นรับจำนำ ${contract.contractNumber}`,
          contractId: contract.id,
        },
      });

      return contract;
    });

    revalidatePath("/pawns");
    revalidatePath("/reports");
    revalidatePath("/");
    return {
      ok: true,
      contractId: result.id,
      contractNumber: result.contractNumber,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "สร้างสัญญาไม่สำเร็จ";
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// ต่อดอกเบี้ย: ขยาย Due Date ไปอีก 10 วัน (fix) + คำนวณดอกเบี้ยตามงวด
// ดอกเบี้ยต่องวด (10 วัน) = เงินต้น × (อัตรา% ต่อ 10 วัน) ÷ 100
// ---------------------------------------------------------------------------

export async function renewInterest(
  input: RenewInterestInput
): Promise<
  ActionResult<{
    interestDue: number;
    newDueDate: Date;
    renewalCount: number;
  }>
> {
  await requireAuth();

  const parsed = renewInterestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { contractId, paymentMethod } = parsed.data;

  const contract = await db.pawnContract.findUnique({
    where: { id: contractId },
  });
  if (!contract) return { ok: false, error: "ไม่พบสัญญา" };
  if (contract.status !== "ACTIVE") {
    return {
      ok: false,
      error: "สัญญานี้ไม่สามารถต่อดอกเบี้ยได้ (สถานะไม่ใช่ ACTIVE)",
    };
  }

  // ดอกเบี้ย 1 งวด (10 วัน) ที่ต้องรับ
  const interestDue = calcPeriodInterest(
    contract.principalAmount,
    contract.interestRatePercent
  );
  const dueDateBefore = contract.dueDate;
  const newDueDate = addDays(dueDateBefore, PAWN_TERM_DAYS);
  const now = new Date();

  // อัปเดตสัญญา + บันทึกเงินที่รับชำระ (PawnRenewal) ใน transaction เดียวกัน
  const updated = await db.$transaction(async (tx) => {
    const upd = await tx.pawnContract.update({
      where: { id: contractId },
      data: {
        dueDate: newDueDate,
        renewalCount: { increment: 1 },
        lastRenewedAt: now,
      },
    });
    await tx.pawnRenewal.create({
      data: {
        contractId,
        interestAmount: interestDue,
        roundNumber: upd.renewalCount,
        dueDateBefore,
        dueDateAfter: newDueDate,
        paymentMethod,
        createdAt: now,
      },
    });
    return upd;
  });

  revalidatePath("/pawns");
  revalidatePath("/reports");
  revalidatePath("/");
  return {
    ok: true,
    interestDue,
    newDueDate,
    renewalCount: updated.renewalCount,
  };
}

// ---------------------------------------------------------------------------
// ตัดหลุดจำนำ (Forfeit) → เปลี่ยนสถานะ + ตั้งราคาขายเข้า POS
// ---------------------------------------------------------------------------

export async function forfeitContract(
  input: ForfeitInput
): Promise<ActionResult<{ contractId: string }>> {
  await requireAuth();

  const parsed = forfeitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { contractId, forfeitPrice } = parsed.data;

  const contract = await db.pawnContract.findUnique({
    where: { id: contractId },
  });
  if (!contract) return { ok: false, error: "ไม่พบสัญญา" };
  if (contract.status !== "ACTIVE") {
    return { ok: false, error: "เฉพาะสัญญาที่สถานะ ACTIVE เท่านั้นที่ตัดหลุดได้" };
  }

  await db.pawnContract.update({
    where: { id: contractId },
    data: {
      status: "FORFEITED",
      forfeitPrice: forfeitPrice ?? contract.principalAmount,
      forfeitedAt: new Date(),
    },
  });

  revalidatePath("/pawns");
  revalidatePath("/pos");
  revalidatePath("/");
  return { ok: true, contractId };
}

// ---------------------------------------------------------------------------
// ไถ่ถอน (Redeem): ลูกค้ามาชำระเงินต้น + ดอกเบี้ยค้าง (ถ้าเกินกำหนด)
// - ยังไม่เกินกำหนด → รับเฉพาะเงินต้น
// - เกินกำหนด → ดอกเบี้ยค้าง = จำนวนรอบ (10 วัน) ที่เกิน × ดอกเบี้ยต่องวด
// บันทึกการไถ่ถอนลงตาราง PawnRedemption ไว้เป็นหลักฐาน
// ---------------------------------------------------------------------------

export async function redeemContract(
  input: RedeemInput
): Promise<
  | {
      ok: true;
      rounds: number;
      interestDue: number;
      totalAmount: number;
      changeAmount: number;
    }
  | { ok: false; error: string }
> {
  await requireAuth();

  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { contractId, paymentMethod, receivedAmount } = parsed.data;

  const contract = await db.pawnContract.findUnique({
    where: { id: contractId },
  });
  if (!contract) return { ok: false, error: "ไม่พบสัญญา" };
  if (contract.status !== "ACTIVE") {
    return {
      ok: false,
      error: "เฉพาะสัญญาที่สถานะ ACTIVE เท่านั้นที่ไถ่ถอนได้",
    };
  }

  // คำนวณยอดที่ต้องชำระ (คำนวณฝั่ง Server เป็นหลัก)
  const now = new Date();
  const rounds = calcOverdueRounds(contract.dueDate, now);
  const interestDue = calcOverdueInterest(
    contract.principalAmount,
    contract.interestRatePercent,
    contract.dueDate,
    now
  );
  const totalAmount = contract.principalAmount + interestDue;

  let changeAmount = 0;
  let received: number | null = null;
  if (paymentMethod === "CASH") {
    received = receivedAmount ?? totalAmount;
    if (received < totalAmount) {
      return {
        ok: false,
        error: "เงินที่รับมาน้อยกว่ายอดที่ต้องชำระ",
      };
    }
    changeAmount = received - totalAmount;
  }

  await db.$transaction(async (tx) => {
    await tx.pawnRedemption.create({
      data: {
        contractId,
        principal: contract.principalAmount,
        interest: interestDue,
        total: totalAmount,
        paymentMethod,
        receivedAmount: received,
        changeAmount,
      },
    });
    await tx.pawnContract.update({
      where: { id: contractId },
      data: { status: "REDEEMED", redeemedAt: now },
    });
  });

  revalidatePath("/pawns");
  revalidatePath("/reports");
  revalidatePath("/");
  return { ok: true, rounds, interestDue, totalAmount, changeAmount };
}
