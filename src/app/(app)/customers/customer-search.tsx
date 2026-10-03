"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  HandCoins,
  Package,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  formatBaht,
  formatDateOnly,
  formatDateTime,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
} from "@/lib/format";
import { Badge, Button, Input, cn } from "@/components/ui";
import { PageSizeSelector } from "@/components/page-size-selector";
import { usePageSize } from "@/lib/use-page-size";

type PawnStatus = "ACTIVE" | "REDEEMED" | "FORFEITED" | "SOLD";

interface PawnContractRow {
  id: string;
  contractNumber: string;
  itemName: string;
  image: string | null;
  serialNumber: string | null;
  storageBox: string | null;
  principalAmount: number;
  interestRatePercent: number;
  status: PawnStatus;
  startDate: string;
  dueDate: string;
  createdAt: string;
}

interface CustomerRow {
  id: string;
  nationalId: string;
  fullName: string;
  phone: string;
  createdAt: string;
  contractCount: number;
  activeCount: number;
  contracts: PawnContractRow[];
}

export function CustomerSearch({
  customers,
  initialQuery = "",
  initialPageSize,
}: {
  customers: CustomerRow[];
  initialQuery?: string;
  initialPageSize: number;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [pageSize, setPageSize] = usePageSize(initialPageSize);
  const [page, setPage] = useState(1);
  const [viewCustomer, setViewCustomer] = useState<CustomerRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.nationalId.includes(q) ||
        c.phone.includes(q)
    );
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // กันเลขหน้าเกินจริงเมื่อผลค้นหาลดลง
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ค้นหาใหม่ / เปลี่ยนจำนวนต่อหน้า = กลับไปหน้าแรก
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / เลขบัตรประชาชน / เบอร์โทร…"
            className="pl-9"
          />
        </div>
        <PageSizeSelector value={pageSize} onChange={handlePageSize} />
        <Link href="/pawn/new">
          <Button variant="secondary">
            <UserPlus className="h-4 w-4" /> ลูกค้าใหม่
          </Button>
        </Link>
      </div>

      {/* mobile: card stack / desktop: table */}
      <div className="overflow-x-auto rounded-2xl border-2 border-primary/10 bg-surface-card shadow-card">
        {/* Desktop: table */}
        <div className="hidden divide-y divide-zinc-100 sm:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 font-medium">เลขบัตรประชาชน</th>
                <th className="px-4 py-3 font-medium">โทรศัพท์</th>
                <th className="px-4 py-3 font-medium">สัญญา</th>
                <th className="px-4 py-3 font-medium">สมัครเมื่อ</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                    ไม่พบลูกค้า “{search}”
                  </td>
                </tr>
              )}
              {pagedRows.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-2.5 font-medium">{c.fullName}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{c.nationalId}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{c.phone || "—"}</td>
                  <td className="px-4 py-2.5">
                    {c.activeCount > 0 ? (
                      <Badge tone="teal">
                        {c.activeCount} active / {c.contractCount} สัญญา
                      </Badge>
                    ) : (
                      <span className="text-zinc-500">{c.contractCount} สัญญา</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {formatDateTime(c.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewCustomer(c)}
                      >
                        <Eye className="h-3.5 w-3.5" /> ดูข้อมูล
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hidden sm:block">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        {/* Mobile: card stack */}
        <div className="space-y-3 p-3 sm:hidden">
          {filtered.length === 0 && (
            <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
              ไม่พบลูกค้า “{search}”
            </div>
          )}
          {pagedRows.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-primary-dark">{c.fullName}</span>
                {c.activeCount > 0 ? (
                  <Badge tone="teal">
                    {c.activeCount} active / {c.contractCount} สัญญา
                  </Badge>
                ) : (
                  <span className="whitespace-nowrap text-sm text-zinc-500">
                    {c.contractCount} สัญญา
                  </span>
                )}
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">เลขบัตรประชาชน</dt>
                  <dd className="text-zinc-700">{c.nationalId}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">โทรศัพท์</dt>
                  <dd className="text-zinc-700">{c.phone || "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">สมัครเมื่อ</dt>
                  <dd className="text-zinc-700">{formatDateTime(c.createdAt)}</dd>
                </div>
              </dl>
              <div className="mt-3 flex justify-end border-t-2 border-dashed border-primary/20 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewCustomer(c)}
                >
                  <Eye className="h-3.5 w-3.5" /> ดูข้อมูล
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="sm:hidden">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {viewCustomer && (
        <CustomerContractsModal
          customer={viewCustomer}
          onClose={() => setViewCustomer(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: ข้อมูลสินค้ารับจำนำของลูกค้า
// ---------------------------------------------------------------------------

function CustomerContractsModal({
  customer,
  onClose,
}: {
  customer: CustomerRow;
  onClose: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | PawnStatus>("ALL");
  const [query, setQuery] = useState("");

  // สถานะที่มีอยู่จริงในสัญญาของลูกค้าคนนี้ (พร้อมจำนวน)
  const statusChips = useMemo(() => {
    const counts = new Map<PawnStatus, number>();
    for (const pc of customer.contracts) {
      counts.set(pc.status, (counts.get(pc.status) ?? 0) + 1);
    }
    const order: PawnStatus[] = ["ACTIVE", "REDEEMED", "FORFEITED", "SOLD"];
    return order
      .filter((s) => counts.has(s))
      .map((s) => ({ status: s, count: counts.get(s) ?? 0 }));
  }, [customer.contracts]);

  const filteredContracts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customer.contracts.filter((pc) => {
      if (statusFilter !== "ALL" && pc.status !== statusFilter) return false;
      if (!q) return true;
      return (
        pc.contractNumber.toLowerCase().includes(q) ||
        pc.itemName.toLowerCase().includes(q) ||
        (pc.serialNumber?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [customer.contracts, statusFilter, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-2 border-primary/15 bg-surface-card p-5 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b-2 border-dashed border-primary/25 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-primary-dark">
              <HandCoins className="h-5 w-5 text-primary" />
              สินค้ารับจำนำของลูกค้า
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {customer.fullName} · {customer.nationalId}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-primary/10 hover:text-primary-dark"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {customer.contracts.length === 0 ? (
          <p className="rounded-2xl border-2 border-primary/10 bg-cream px-4 py-10 text-center text-sm text-zinc-400">
            ลูกค้าคนนี้ยังไม่มีสินค้ารับจำนำ
          </p>
        ) : (
          <>
            {/* ค้นหา / กรองตามสถานะ */}
            <div className="mb-4 space-y-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาเลขที่สัญญา / สิ่งของ / S/N…"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={statusFilter === "ALL"}
                  label={`ทั้งหมด ${customer.contracts.length}`}
                  onClick={() => setStatusFilter("ALL")}
                />
                {statusChips.map(({ status, count }) => (
                  <FilterChip
                    key={status}
                    active={statusFilter === status}
                    label={`${PAWN_STATUS_LABEL[status]} ${count}`}
                    onClick={() => setStatusFilter(status)}
                  />
                ))}
              </div>
            </div>

            {filteredContracts.length === 0 ? (
              <p className="rounded-2xl border-2 border-primary/10 bg-cream px-4 py-10 text-center text-sm text-zinc-400">
                ไม่พบสัญญาที่ตรงกับเงื่อนไข
              </p>
            ) : (
              <div className="space-y-3">
                {filteredContracts.map((pc) => (
                  <Link
                    key={pc.id}
                    href={`/pawns/${pc.id}`}
                    className="block rounded-2xl border-2 border-primary/10 bg-cream p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-primary-dark">
                        {pc.contractNumber}
                      </span>
                      <Badge tone={PAWN_STATUS_TONE[pc.status]}>
                        {PAWN_STATUS_LABEL[pc.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary/50">
                        {pc.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- รูปอัปโหลด/URL
                          <img
                            src={pc.image}
                            alt={pc.itemName}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5" />
                        )}
                      </span>
                      <p className="min-w-0 font-semibold text-zinc-800">
                        {pc.itemName}
                      </p>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      <DetailLine label="เงินต้น">
                        {formatBaht(pc.principalAmount)}
                      </DetailLine>
                      <DetailLine label="ดอกเบี้ย">
                        {pc.interestRatePercent}% / 10 วัน
                      </DetailLine>
                      <DetailLine label="วันเริ่มสัญญา">
                        {formatDateOnly(pc.startDate)}
                      </DetailLine>
                      <DetailLine label="ครบกำหนด">
                        {formatDateOnly(pc.dueDate)}
                      </DetailLine>
                      {pc.serialNumber && (
                        <DetailLine label="S/N">{pc.serialNumber}</DetailLine>
                      )}
                      {pc.storageBox && (
                        <DetailLine label="จุดเก็บ">{pc.storageBox}</DetailLine>
                      )}
                    </dl>
                    <span className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-primary">
                      ดูรายละเอียดสัญญา
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-primary/10 text-primary-dark hover:bg-primary/20"
      )}
    >
      {label}
    </button>
  );
}

function DetailLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-right text-zinc-700">{children}</dd>
    </div>
  );
}

// เลย์เอาต์เดียวกับ Pagination ของหน้า dashboard แต่เปลี่ยนหน้าฝั่ง client
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-primary/25 px-5 py-3">
      <button
        type="button"
        aria-label="หน้าก่อนหน้า"
        onClick={() => onPageChange(Math.max(page - 1, 1))}
        disabled={page <= 1}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark",
          page <= 1 && "pointer-events-none opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-xs font-bold text-zinc-500">
        หน้า {page} / {totalPages}
      </span>
      <button
        type="button"
        aria-label="หน้าถัดไป"
        onClick={() => onPageChange(Math.min(page + 1, totalPages))}
        disabled={page >= totalPages}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark",
          page >= totalPages && "pointer-events-none opacity-40"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
