"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, Input, cn } from "@/components/ui";

interface CustomerRow {
  id: string;
  nationalId: string;
  fullName: string;
  phone: string;
  createdAt: string;
  contractCount: number;
  activeCount: number;
}

// จำนวนรายการต่อหน้า: desktop (ตาราง) 20 แถว / mobile (การ์ด) 10 ใบ
const DESKTOP_PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 10;

export function CustomerSearch({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("");
  const [desktopPage, setDesktopPage] = useState(1);
  const [mobilePage, setMobilePage] = useState(1);

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

  const desktopTotalPages = Math.max(
    1,
    Math.ceil(filtered.length / DESKTOP_PAGE_SIZE)
  );
  const mobileTotalPages = Math.max(
    1,
    Math.ceil(filtered.length / MOBILE_PAGE_SIZE)
  );
  // กันเลขหน้าเกินจริงเมื่อผลค้นหาลดลง
  const dPage = Math.min(desktopPage, desktopTotalPages);
  const mPage = Math.min(mobilePage, mobileTotalPages);
  const desktopRows = filtered.slice(
    (dPage - 1) * DESKTOP_PAGE_SIZE,
    dPage * DESKTOP_PAGE_SIZE
  );
  const mobileCards = filtered.slice(
    (mPage - 1) * MOBILE_PAGE_SIZE,
    mPage * MOBILE_PAGE_SIZE
  );

  // ค้นหาใหม่ = กลับไปหน้าแรกทั้งสองแบบ
  const handleSearch = (value: string) => {
    setSearch(value);
    setDesktopPage(1);
    setMobilePage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / เลขบัตรประชาชน / เบอร์โทร…"
            className="pl-9"
          />
        </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                    ไม่พบลูกค้า “{search}”
                  </td>
                </tr>
              )}
              {desktopRows.map((c) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hidden sm:block">
          <Pagination
            page={dPage}
            totalPages={desktopTotalPages}
            onPageChange={setDesktopPage}
          />
        </div>

        {/* Mobile: card stack */}
        <div className="space-y-3 p-3 sm:hidden">
          {filtered.length === 0 && (
            <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
              ไม่พบลูกค้า “{search}”
            </div>
          )}
          {mobileCards.map((c) => (
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
            </div>
          ))}
        </div>
        <div className="sm:hidden">
          <Pagination
            page={mPage}
            totalPages={mobileTotalPages}
            onPageChange={setMobilePage}
          />
        </div>
      </div>
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
