import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";

// ---------------------------------------------------------------------------
// จำนำ
// ---------------------------------------------------------------------------

const nationalIdSchema = z
  .string()
  .trim()
  .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");

export const createPawnInputSchema = z.object({
  customer: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("existing"),
      customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
    }),
    z.object({
      mode: z.literal("new"),
      nationalId: nationalIdSchema,
      fullName: z.string().trim().min(2, "กรอกชื่อ-นามสกุล"),
      phone: z.string().trim().optional().default(""),
    }),
  ]),
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
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  // อายุสัญญาแบบ fix = ทุกๆ 10 วัน (ตามที่ร้านกำหนด)
  termDays: z.coerce.number().int().min(1).max(365).default(10),
});

export type CreatePawnInput = z.infer<typeof createPawnInputSchema>;

// ต่อดอกเบี้ย: ขยาย Due Date ไปอีก 1 รอบ = 10 วัน (fix) + บันทึกเงินที่รับชำระ
// (paymentMethod ค่าเริ่มต้น CASH ถ้า UI ไม่ส่ง)
export const renewInterestSchema = z.object({
  contractId: z.string().min(1),
  paymentMethod: z
    .enum(["CASH", "QR", "CARD", "TRANSFER"])
    .default("CASH"),
});

export type RenewInterestInput = z.infer<typeof renewInterestSchema>;

export const forfeitSchema = z.object({
  contractId: z.string().min(1),
  forfeitPrice: z.coerce
    .number({ message: "ราคาขายต้องเป็นตัวเลข" })
    .int()
    .min(1, "ราคาขายต้องมากกว่า 0")
    .optional()
    .nullable(),
});

export type ForfeitInput = z.infer<typeof forfeitSchema>;

export const redeemSchema = z.object({
  contractId: z.string().min(1),
  paymentMethod: z
    .enum(["CASH", "QR", "CARD", "TRANSFER"])
    .default("CASH"),
  receivedAmount: z.coerce.number().int().min(0).optional().nullable(),
});

export type RedeemInput = z.infer<typeof redeemSchema>;

// ---------------------------------------------------------------------------
// POS / ขายหน้าร้าน
// ---------------------------------------------------------------------------

export const checkoutLineSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("product"),
    productId: z.string().min(1),
    quantity: z.coerce.number().int().min(1, "จำนวนไม่ถูกต้อง"),
  }),
  z.object({
    kind: z.literal("pawn"),
    pawnContractId: z.string().min(1),
  }),
]);

export const checkoutSchema = z.object({
  lines: z.array(checkoutLineSchema).min(1, "ตะกร้าว่างเปล่า"),
  paymentMethod: z.enum(["CASH", "QR", "CARD", "TRANSFER"]),
  receivedAmount: z.coerce.number().int().min(0).optional().nullable(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutLineInput = z.infer<typeof checkoutLineSchema>;

export type { PaymentMethod };
