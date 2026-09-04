"use server";

import { requireAuth } from "@/lib/auth";
import { checkoutSchema, CheckoutInput } from "@/lib/definitions";
import { db } from "@/lib/prisma";
import { nextSequentialNumber } from "@/lib/refnumbers";
import { revalidatePath } from "next/cache";

export type CheckoutResult =
  | {
      ok: true;
      receiptNumber: string;
      totalAmount: number;
      changeAmount: number;
    }
  | { ok: false; error: string };

/**
 * ชำระเงิน (Checkout):
 *  - หัก stock จาก RetailProduct (สินค้าทั่วไป)
 *  - เปลี่ยน PawnContract ที่หลุดจำนำจาก FORFEITED → SOLD (ของหลุดจำนำ ขายได้ 1 ชิ้น)
 *  - สร้าง SaleOrder + SaleItem ทั้งหมดใน Transaction เดียว
 */
export async function checkout(
  input: CheckoutInput
): Promise<CheckoutResult> {
  await requireAuth();

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }
  const { lines, paymentMethod, receivedAmount } = parsed.data;

  const result = await db.$transaction(async (tx): Promise<CheckoutResult> => {
    // รวมจำนวนสินค้าทั่วไป (เผื่อมี line ซ้ำกัน)
    const productQty = new Map<string, number>();
    const pawnIds: string[] = [];
    for (const line of lines) {
      if (line.kind === "product") {
        productQty.set(
          line.productId,
          (productQty.get(line.productId) ?? 0) + line.quantity
        );
      } else {
        pawnIds.push(line.pawnContractId);
      }
    }

    // 1) ตรวจสินค้าทั่วไป + ราคา ณ ตอนขาย
    const products = await tx.retailProduct.findMany({
      where: { id: { in: [...productQty.keys()] } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    const orderItems: {
      productId: string | null;
      pawnContractId: string | null;
      quantity: number;
      unitPrice: number;
    }[] = [];

    for (const [productId, qty] of productQty) {
      const product = productById.get(productId);
      if (!product) return { ok: false, error: "ไม่พบสินค้าในระบบ" };
      if (product.quantity < qty) {
        return {
          ok: false,
          error: `สต็อกไม่พอ: ${product.name} (เหลือ ${product.quantity} ชิ้น)`,
        };
      }
      orderItems.push({
        productId,
        pawnContractId: null,
        quantity: qty,
        unitPrice: product.sellPrice,
      });
    }

    // 2) ตรวจของหลุดจำนำ (ต้องยังไม่ได้ขาย — status FORFEITED)
    const pawnContracts = pawnIds.length
      ? await tx.pawnContract.findMany({
          where: { id: { in: pawnIds } },
        })
      : [];
    const pawnById = new Map(pawnContracts.map((p) => [p.id, p]));
    for (const pawnId of pawnIds) {
      const pawn = pawnById.get(pawnId);
      if (!pawn || pawn.status !== "FORFEITED") {
        return {
          ok: false,
          error: "ของหลุดจำนำนี้ขายไปแล้วหรือไม่มีอยู่ในระบบ",
        };
      }
      orderItems.push({
        productId: null,
        pawnContractId: pawnId,
        quantity: 1,
        unitPrice: pawn.forfeitPrice ?? pawn.principalAmount,
      });
    }

    // 3) ยอดรวม
    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // 4) เงินสด → คำนวณเงินทอน
    let changeAmount = 0;
    let received: number | null = null;
    if (paymentMethod === "CASH") {
      received = receivedAmount ?? totalAmount;
      if (received < totalAmount) {
        return { ok: false, error: "เงินที่รับมาน้อยกว่ายอดที่ต้องชำระ" };
      }
      changeAmount = received - totalAmount;
    }

    // 5) สร้างใบเสร็จ + รายการ + หัก stock + เปลี่ยนสถานะของหลุดจำนำ (atomic)
    const order = await tx.saleOrder.create({
      data: {
        receiptNumber: await nextSequentialNumber(tx, "R"),
        totalAmount,
        paymentMethod,
        receivedAmount: received,
        changeAmount,
        items: { create: orderItems },
      },
    });

    for (const [productId, qty] of productQty) {
      await tx.retailProduct.update({
        where: { id: productId },
        data: { quantity: { decrement: qty } },
      });
    }

    if (pawnIds.length) {
      await tx.pawnContract.updateMany({
        where: { id: { in: pawnIds }, status: "FORFEITED" },
        data: { status: "SOLD" },
      });
    }

    return {
      ok: true,
      receiptNumber: order.receiptNumber,
      totalAmount,
      changeAmount,
    };
  });

  if (result.ok) {
    revalidatePath("/pos");
    revalidatePath("/pawns");
    revalidatePath("/reports");
    revalidatePath("/");
  }
  return result;
}
