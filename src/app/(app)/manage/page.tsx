import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { PAGE_SIZE_COOKIE, parsePageSize } from "@/lib/page-size";
import { ManageClient } from "./manage-client";

export const metadata = { title: "จัดการข้อมูล — ร้านรับจำนำ POS" };

export default async function ManagePage() {
  await requireAuth();

  // จำนวนต่อหน้า: อ่านจาก cookie ร่วมกับหน้าอื่น
  const cookieStore = await cookies();
  const initialPageSize = parsePageSize(
    cookieStore.get(PAGE_SIZE_COOKIE)?.value
  );

  const [customers, contracts] = await Promise.all([
    db.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { _count: { select: { pawnContracts: true } } },
    }),
    db.pawnContract.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { customer: { select: { fullName: true, phone: true } } },
    }),
  ]);

  return (
    <ManageClient
      initialPageSize={initialPageSize}
      customers={customers.map((c) => ({
        id: c.id,
        nationalId: c.nationalId,
        fullName: c.fullName,
        phone: c.phone,
        contractCount: c._count.pawnContracts,
        createdAt: c.createdAt.toISOString(),
      }))}
      contracts={contracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        itemName: c.itemName,
        serialNumber: c.serialNumber,
        storageBox: c.storageBox,
        principalAmount: c.principalAmount,
        interestRatePercent: c.interestRatePercent,
        status: c.status,
        image: c.image,
        customerId: c.customerId,
        customerName: c.customer.fullName,
        customerPhone: c.customer.phone,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
