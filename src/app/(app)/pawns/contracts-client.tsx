"use client";

/* eslint-disable @next/next/no-img-element -- รูปสิ่งของที่แนบตอนรับจำนำ */

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import type { PawnContractDto } from "@/lib/dto";
import {
  formatBaht,
  formatDate,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
  type PawnStatusFilter,
} from "@/lib/format";
import { Badge, Input, Select } from "@/components/ui";
import { cn } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import {
  PAGE_SIZE_COOKIE,
  PAGE_SIZE_COOKIE_MAX_AGE,
} from "@/lib/page-size";
import {
  ActionButton,
  ForfeitForm,
  RedeemForm,
  RenewForm,
} from "./contract-action-forms";

type ExpandKey = `${string}:renew` | `${string}:forfeit` | `${string}:redeem`;

const FILTERS: { key: PawnStatusFilter; label: string }[] = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "ACTIVE", label: "จำนำอยู่" },
  { key: "FORFEITED", label: "หลุดจำนำ" },
  { key: "REDEEMED", label: "ไถ่ถอนแล้ว" },
  { key: "SOLD", label: "ขายแล้ว" },
];

/** สร้าง URL ของหน้ารายการจากตัวกรอง/ค้นหา/หน้า (server-side pagination) */
function pawnsHref({
  status,
  q,
  page,
  size,
}: {
  status: PawnStatusFilter;
  q: string;
  page: number;
  size?: number;
}) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (q) params.set("q", q);
  if (size) params.set("size", String(size));
  if (page > 1) params.set("p", String(page));
  const qs = params.toString();
  return qs ? `/pawns?${qs}` : "/pawns";
}

export function PawnContractsClient({
  contracts,
  page,
  totalPages,
  total,
  status,
  query,
  pageSize,
  pageSizeOptions,
}: {
  contracts: PawnContractDto[];
  page: number;
  totalPages: number;
  total: number;
  status: PawnStatusFilter;
  query: string;
  pageSize: number;
  pageSizeOptions: number[];
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ช่องค้นหา: พิมพ์แล้ว debounce ค่อยอัปเดต URL (กรองที่ server)
  const [searchInput, setSearchInput] = useState(query);
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    // URL เปลี่ยน (เช่นกด back) → sync กลับเข้าช่องค้นหา
    setPrevQuery(query);
    setSearchInput(query);
  }
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query) return;
    const timer = window.setTimeout(() => {
      router.push(pawnsHref({ status, q: trimmed, page: 1, size: pageSize }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, query, status, pageSize, router]);

  // จำจำนวนต่อหน้าที่ใช้อยู่ไว้ใน cookie → ครั้งต่อไปเปิดหน้าโดยไม่มี ?size= จะใช้ค่านี้
  useEffect(() => {
    document.cookie = `${PAGE_SIZE_COOKIE}=${pageSize}; path=/; max-age=${PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`;
  }, [pageSize]);

  function goStatus(next: PawnStatusFilter) {
    setMobileMenuOpen(false);
    router.push(pawnsHref({ status: next, q: query, page: 1, size: pageSize }));
  }

  function goPage(next: number) {
    router.push(pawnsHref({ status, q: query, page: next, size: pageSize }));
  }

  function goSize(next: number) {
    // เปลี่ยนจำนวนต่อหน้า → กลับหน้าแรก
    router.push(pawnsHref({ status, q: query, page: 1, size: next }));
  }

  const isOverdue = (c: PawnContractDto) =>
    c.status === "ACTIVE" && new Date(c.dueDate) < new Date();

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-3">
      {/* filter + search — mobile: burger dropdown; desktop: inline chips */}
      <div className="relative">
        {/* Mobile: hamburger button */}
        <div className="sm:hidden flex px-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="shrink-0 rounded-full border-2 border-primary/15 bg-white p-2 text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
            aria-label="เมนูกรอง"
          >
            <Filter className="h-5 w-5" />
          </button>
          <div className="relative ml-auto w-full min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหาสัญญา / ชื่อลูกค้า / สิ่งของ…"
              className="pl-9"
            />
          </div>
          {/* Dropdown menu */}
          {mobileMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border-2 border-primary/10 bg-surface-card p-3 shadow-card">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                กรองตามสถานะ
              </p>
              <div className="flex flex-col gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => goStatus(f.key)}
                    className={cn(
                      "w-full rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      status === f.key
                        ? "bg-gradient-to-b from-primary-light to-primary text-white shadow-glow-teal"
                        : "border-2 border-primary/15 bg-white text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop: inline chips */}
        <div className="hidden sm:flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => goStatus(f.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
                status === f.key
                  ? "bg-gradient-to-b from-primary-light to-primary text-white shadow-glow-teal"
                  : "border-2 border-primary/15 bg-white text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto w-auto min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหาสัญญา / ชื่อลูกค้า / สิ่งของ…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-0">
        <p className="text-xs text-zinc-400">พบทั้งหมด {total} สัญญา</p>
        <label className="flex items-center gap-1.5 text-xs text-zinc-400">
          แสดง
          <Select
            value={pageSize}
            onChange={(e) => goSize(Number(e.target.value))}
            className="h-8 w-16 px-2 text-xs"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          ต่อหน้า
        </label>
      </div>

      {/* รายการสัญญา — mobile: card stack / desktop: table card */}
      <div className="md:overflow-hidden md:rounded-2xl md:border-2 md:border-primary/10 md:bg-surface-card md:shadow-card">
        {/* Mobile: card stack */}
        <div className="space-y-3 p-3 md:hidden">
          {contracts.length === 0 && (
            <p className="py-12 text-center text-sm text-zinc-400">
              ไม่พบสัญญาในเงื่อนไขนี้
            </p>
          )}
          {contracts.map((c) => {
            const overdue = isOverdue(c);
            const rowKey =
              expanded?.split(":")[0] === c.id ? expanded : null;
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card"
              >
                <div
                  className={cn(
                    "cursor-pointer rounded-xl p-1 transition-colors hover:bg-primary/5",
                    rowKey ? "bg-cream" : ""
                  )}
                  onClick={() => {
                    if (rowKey) setExpanded(null);
                    else if (c.status === "ACTIVE")
                      setExpanded(`${c.id}:renew`);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-primary-dark">
                      {c.status === "ACTIVE" &&
                        (rowKey ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-300" />
                        ))}
                      {c.contractNumber}
                    </span>
                    <Badge
                      tone={
                        c.status === "ACTIVE" && overdue
                          ? "coral"
                          : PAWN_STATUS_TONE[c.status]
                      }
                    >
                      {PAWN_STATUS_LABEL[c.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {c.image && (
                      <img
                        src={c.image}
                        alt={c.itemName}
                        className="h-10 w-10 shrink-0 rounded-lg border border-primary/15 object-cover"
                      />
                    )}
                    <p className="min-w-0 truncate text-sm font-semibold">
                      {c.itemName}
                    </p>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <CardLine label="ลูกค้า">
                      {c.customerName}
                      {c.customerPhone ? ` · ${c.customerPhone}` : ""}
                    </CardLine>
                    <CardLine label="เงินต้น">
                      <b className="text-zinc-800">
                        {formatBaht(c.principalAmount)}
                      </b>
                    </CardLine>
                    <CardLine label="ครบกำหนด">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDate(c.dueDate)}
                        {overdue && <Badge tone="coral">เลยกำหนด</Badge>}
                      </span>
                    </CardLine>
                    <CardLine label="ต่อดอก">{c.renewalCount} ครั้ง</CardLine>
                  </dl>
                </div>

                {c.status === "ACTIVE" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <ActionButton
                      label="ต่อดอกเบี้ย"
                      tone="primary"
                      onClick={() =>
                        setExpanded(
                          rowKey === `${c.id}:renew` ? null : `${c.id}:renew`
                        )
                      }
                    />
                    <ActionButton
                      label="ไถ่ถอน"
                      tone="success"
                      onClick={() =>
                        setExpanded(
                          rowKey === `${c.id}:redeem` ? null : `${c.id}:redeem`
                        )
                      }
                    />
                    <ActionButton
                      label="ตัดหลุด"
                      tone="danger"
                      onClick={() =>
                        setExpanded(
                          rowKey === `${c.id}:forfeit`
                            ? null
                            : `${c.id}:forfeit`
                        )
                      }
                    />
                  </div>
                )}

                {/* แถวขยาย: action forms */}
                {rowKey === `${c.id}:renew` && (
                  <RenewForm
                    contract={c}
                    onDone={(msg) => {
                      setExpanded(null);
                      showToast(msg);
                      router.refresh();
                    }}
                  />
                )}
                {rowKey === `${c.id}:forfeit` && (
                  <ForfeitForm
                    contract={c}
                    onDone={(msg) => {
                      setExpanded(null);
                      showToast(msg);
                      router.refresh();
                    }}
                  />
                )}
                {rowKey === `${c.id}:redeem` && (
                  <RedeemForm
                    contract={c}
                    onDone={(msg) => {
                      setExpanded(null);
                      showToast(msg);
                      router.refresh();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop: table card */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                <th className="px-4 py-2.5 font-medium">สัญญา</th>
                <th className="px-4 py-2.5 font-medium">สิ่งที่จำนำ</th>
                <th className="px-4 py-2.5 text-right font-medium">เงินต้น</th>
                <th className="px-4 py-2.5 font-medium">ครบกำหนด</th>
                <th className="px-4 py-2.5 text-center font-medium">ต่อดอก</th>
                <th className="px-4 py-2.5 font-medium">สถานะ</th>
                <th className="px-4 py-2.5 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {contracts.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-zinc-400"
                  >
                    ไม่พบสัญญาในเงื่อนไขนี้
                  </td>
                </tr>
              )}
              {contracts.map((c) => {
                const overdue = isOverdue(c);
                const rowKey =
                  expanded?.split(":")[0] === c.id ? expanded : null;
                const isOpen = rowKey !== null;
                return (
                  <Fragment key={c.id}>
                    <tr
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-primary/5",
                        isOpen ? "bg-cream" : ""
                      )}
                      onClick={() => {
                        if (isOpen) setExpanded(null);
                        else if (c.status === "ACTIVE")
                          setExpanded(`${c.id}:renew`);
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {c.status === "ACTIVE" ? (
                            isOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
                            )
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-800">
                              {c.contractNumber}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {c.customerName}
                              {c.customerPhone ? ` · ${c.customerPhone}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {c.image && (
                            <img
                              src={c.image}
                              alt={c.itemName}
                              className="h-10 w-10 shrink-0 rounded-lg border border-primary/15 object-cover"
                            />
                          )}
                          <p className="max-w-[220px] truncate text-zinc-700">
                            {c.itemName}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold text-zinc-800">
                        {formatBaht(c.principalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatDate(c.dueDate)}
                          {overdue && <Badge tone="coral">เลยกำหนด</Badge>}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-center text-zinc-500">
                        {c.renewalCount} ครั้ง
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={
                            c.status === "ACTIVE" && overdue
                              ? "coral"
                              : PAWN_STATUS_TONE[c.status]
                          }
                        >
                          {PAWN_STATUS_LABEL[c.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {c.status === "ACTIVE" && (
                          <div
                            className="flex flex-wrap justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ActionButton
                              label="ต่อดอกเบี้ย"
                              tone="primary"
                              onClick={() =>
                                setExpanded(
                                  rowKey === `${c.id}:renew`
                                    ? null
                                    : `${c.id}:renew`
                                )
                              }
                            />
                            <ActionButton
                              label="ไถ่ถอน"
                              tone="success"
                              onClick={() =>
                                setExpanded(
                                  rowKey === `${c.id}:redeem`
                                    ? null
                                    : `${c.id}:redeem`
                                )
                              }
                            />
                            <ActionButton
                              label="ตัดหลุด"
                              tone="danger"
                              onClick={() =>
                                setExpanded(
                                  rowKey === `${c.id}:forfeit`
                                    ? null
                                    : `${c.id}:forfeit`
                                )
                              }
                            />
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* แถวขยาย: action forms */}
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          {rowKey === `${c.id}:renew` && (
                            <RenewForm
                              contract={c}
                              onDone={(msg) => {
                                setExpanded(null);
                                showToast(msg);
                                router.refresh();
                              }}
                            />
                          )}
                          {rowKey === `${c.id}:forfeit` && (
                            <ForfeitForm
                              contract={c}
                              onDone={(msg) => {
                                setExpanded(null);
                                showToast(msg);
                                router.refresh();
                              }}
                            />
                          )}
                          {rowKey === `${c.id}:redeem` && (
                            <RedeemForm
                              contract={c}
                              onDone={(msg) => {
                                setExpanded(null);
                                showToast(msg);
                                router.refresh();
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={goPage}
        />
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function CardLine({
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
