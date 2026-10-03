import Link from "next/link";
import { cookies } from "next/headers";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Button } from "@/components/ui";
import type { PawnContractDto } from "@/lib/dto";
import type { PawnStatusFilter } from "@/lib/format";
import {
  PAGE_SIZE_COOKIE,
  PAGE_SIZE_OPTIONS,
  parsePageSize,
} from "@/lib/page-size";
import { PawnContractsClient } from "./contracts-client";

const PAGE_SIZES = [...PAGE_SIZE_OPTIONS];

export const metadata = { title: "รับจำนำ — ร้านรับจำนำ POS" };

// ต้องรัน dynamic เสมอ (อ่าน session + searchParams ตอน request)
export const dynamic = "force-dynamic";

const STATUS_FILTERS: PawnStatusFilter[] = [
  "ALL",
  "ACTIVE",
  "REDEEMED",
  "FORFEITED",
  "SOLD",
];

type PawnsSearchParams = {
  p?: string;
  status?: string;
  q?: string;
  size?: string;
};

export default async function PawnsPage({
  searchParams,
}: {
  searchParams: Promise<PawnsSearchParams>;
}) {
  await requireAuth();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const status: PawnStatusFilter = STATUS_FILTERS.includes(
    sp.status as PawnStatusFilter
  )
    ? (sp.status as PawnStatusFilter)
    : "ALL";
  const query = (sp.q ?? "").trim();
  // ลำดับความสำคัญ: ?size= ใน URL → cookie ที่จำไว้ → ค่าเริ่มต้น 20
  const cookieStore = await cookies();
  const pageSize = parsePageSize(
    sp.size ?? cookieStore.get(PAGE_SIZE_COOKIE)?.value
  );

  // กรองที่ฐานข้อมูล (server-side) — รองรับสัญญาเกิน 200 รายการ
  const where: Prisma.PawnContractWhereInput = {};
  if (status !== "ALL") where.status = status;
  if (query) {
    where.OR = [
      { itemName: { contains: query, mode: "insensitive" } },
      { contractNumber: { contains: query, mode: "insensitive" } },
      { serialNumber: { contains: query, mode: "insensitive" } },
      { customer: { fullName: { contains: query, mode: "insensitive" } } },
    ];
  }

  const total = await db.pawnContract.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const contracts = await db.pawnContract.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: { customer: true },
  });

  const dtos: PawnContractDto[] = contracts.map((c) => ({
    id: c.id,
    contractNumber: c.contractNumber,
    itemName: c.itemName,
    serialNumber: c.serialNumber,
    storageBox: c.storageBox,
    principalAmount: c.principalAmount,
    interestRatePercent: c.interestRatePercent,
    customerName: c.customer.fullName,
    customerPhone: c.customer.phone,
    image: c.image,
    startDate: c.startDate.toISOString(),
    dueDate: c.dueDate.toISOString(),
    status: c.status,
    renewalCount: c.renewalCount,
    lastRenewedAt: c.lastRenewedAt?.toISOString() ?? null,
    forfeitPrice: c.forfeitPrice,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
            รับจำนำ
          </h1>
          <p className="text-sm text-zinc-500">
            สัญญาจำนำทั้งหมด — ต่อดอกเบี้ย / ตัดหลุด / ไถ่ถอน
          </p>
        </div>
      </div>
      <Link href="/pawn/new">
        <Button className="mb-4">
          <Plus className="h-4 w-4" /> สัญญาใหม่
        </Button>
      </Link>

      <PawnContractsClient
        contracts={dtos}
        page={currentPage}
        totalPages={totalPages}
        total={total}
        status={status}
        query={query}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
      />
    </div>
  );
}
