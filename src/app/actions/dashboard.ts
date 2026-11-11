"use server";

import type { PawnStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";

const PAGE_SIZE = 5;

export interface DashboardContractItem {
  id: string;
  contractNumber: string;
  itemName: string;
  customerName: string;
  dueDate: string;
  status: PawnStatus;
  principalAmount: number;
}

export interface DashboardSaleItem {
  id: string;
  receiptNumber: string;
  createdAt: string;
  totalAmount: number;
  itemsSummary: string;
}

export interface DashboardPage<T> {
  items: T[];
  page: number;
  totalPages: number;
}

function clampPage(page: number, totalPages: number) {
  const requested = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  return Math.min(requested, totalPages);
}

/** หน้าของ "สัญญาจำนำล่าสุด" บนแดชบอร์ด — เรียกจาก client โดยไม่ต้อง reload หน้า */
export async function loadContractPage(
  page: number
): Promise<DashboardPage<DashboardContractItem>> {
  await requireAuth();

  const total = await db.pawnContract.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = clampPage(page, totalPages);

  const rows = await db.pawnContract.findMany({
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { customer: { select: { fullName: true } } },
  });

  return {
    page: current,
    totalPages,
    items: rows.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      itemName: c.itemName,
      customerName: c.customer.fullName,
      dueDate: c.dueDate.toISOString(),
      status: c.status,
      principalAmount: c.principalAmount,
    })),
  };
}

/** หน้าของ "บิลขายล่าสุด" บนแดชบอร์ด */
export async function loadSalePage(
  page: number
): Promise<DashboardPage<DashboardSaleItem>> {
  await requireAuth();

  const total = await db.saleOrder.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = clampPage(page, totalPages);

  const rows = await db.saleOrder.findMany({
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { items: { select: { productId: true, quantity: true } } },
  });

  return {
    page: current,
    totalPages,
    items: rows.map((s) => {
      // สรุปจำนวนชิ้นในบิล: สินค้าทั่วไป vs ของหลุดจำนำ
      let retailQty = 0;
      let pawnQty = 0;
      for (const it of s.items) {
        if (it.productId) retailQty += it.quantity;
        else pawnQty += it.quantity;
      }

      return {
        id: s.id,
        receiptNumber: s.receiptNumber,
        createdAt: s.createdAt.toISOString(),
        totalAmount: s.totalAmount,
        itemsSummary: [
          retailQty > 0 ? `สินค้าทั่วไป ${retailQty} ชิ้น` : "",
          pawnQty > 0 ? `ของหลุดจำนำ ${pawnQty} ชิ้น` : "",
        ]
          .filter(Boolean)
          .join(" + "),
      };
    }),
  };
}
