"use client";

/* eslint-disable @next/next/no-img-element -- รูปสิ่งของที่แนบตอนรับจำนำ */

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import type { PawnContractDto } from "@/lib/dto";
import {
  formatBaht,
  formatDate,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
  type PawnStatusFilter,
} from "@/lib/format";
import { Badge, Button, Input } from "@/components/ui";
import { PageSizeSelector } from "@/components/page-size-selector";
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

/** สถานะว่างของรายการ — แยก "ยังไม่มีข้อมูล" ออกจาก "กรองแล้วไม่เจอ" พร้อมทางออก */
function EmptyNotice({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  if (!filtered) {
    return <p className="text-sm font-bold text-zinc-700">ยังไม่มีสัญญาในระบบ</p>;
  }
  return (
    <div>
      <p className="text-sm font-bold text-zinc-700">
        ไม่พบสัญญาที่ตรงกับตัวกรอง
      </p>
      <p className="mt-1 text-xs font-medium text-zinc-500">
        ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น
      </p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onClear}>
        ล้างตัวกรอง
      </Button>
    </div>
  );
}

export function PawnContractsClient({
  contracts,
  page,
  totalPages,
  total,
  status,
  query,
  pageSize,
}: {
  contracts: PawnContractDto[];
  page: number;
  totalPages: number;
  total: number;
  status: PawnStatusFilter;
  query: string;
  pageSize: number;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<ExpandKey | null>(null);
  const [isPending, startTransition] = useTransition();
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
      startTransition(() => {
        router.push(pawnsHref({ status, q: trimmed, page: 1, size: pageSize }));
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, query, status, pageSize, router, startTransition]);

  // จำจำนวนต่อหน้าที่ใช้อยู่ไว้ใน cookie → ครั้งต่อไปเปิดหน้าโดยไม่มี ?size= จะใช้ค่านี้
  useEffect(() => {
    document.cookie = `${PAGE_SIZE_COOKIE}=${pageSize}; path=/; max-age=${PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`;
  }, [pageSize]);

  function goStatus(next: PawnStatusFilter) {
    startTransition(() => {
      router.push(pawnsHref({ status: next, q: query, page: 1, size: pageSize }));
    });
  }

  function goPage(next: number) {
    startTransition(() => {
      router.push(pawnsHref({ status, q: query, page: next, size: pageSize }));
    });
  }

  function goSize(next: number) {
    // เปลี่ยนจำนวนต่อหน้า → กลับหน้าแรก
    startTransition(() => {
      router.push(pawnsHref({ status, q: query, page: 1, size: next }));
    });
  }

  function clearFilters() {
    setSearchInput("");
    startTransition(() => {
      router.push(pawnsHref({ status: "ALL", q: "", page: 1, size: pageSize }));
    });
  }

  const isOverdue = (c: PawnContractDto) =>
    c.status === "ACTIVE" && new Date(c.dueDate) < new Date();

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-3">
      {/* ตัวกรอง + ค้นหา — เห็นสถานะที่เลือกตลอดเวลา ไม่ซ่อนในเมนู burger */}
      <div className="rounded-2xl border border-primary/15 bg-surface-card p-3 shadow-card sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div
            role="group"
            aria-label="กรองตามสถานะ"
            className="flex gap-1.5 overflow-x-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => goStatus(f.key)}
                aria-pressed={status === f.key}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold transition-colors sm:h-10",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  status === f.key
                    ? "bg-primary-dark text-white shadow-card"
                    : "border-2 border-primary/15 bg-white text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative lg:ml-auto lg:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหาสัญญา / ชื่อลูกค้า / สิ่งของ…"
              aria-label="ค้นหาสัญญา ชื่อลูกค้า หรือสิ่งของ"
              enterKeyHint="search"
              className="pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {isPending ? (
              <Loader2
                aria-hidden="true"
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
              />
            ) : (
              searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark"
                >
                  <X className="h-4 w-4" />
                </button>
              )
            )}
          </div>
        </div>

        {(status !== "ALL" || query) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-primary/20 pt-2.5">
            <p className="min-w-0 text-xs font-medium text-zinc-600">
              กำลังกรอง
              {status !== "ALL" && (
                <>
                  {" "}สถานะ{" "}
                  <span className="font-bold text-primary-dark">
                    {FILTERS.find((f) => f.key === status)?.label ?? status}
                  </span>
                </>
              )}
              {query && (
                <>
                  {status !== "ALL" ? " · " : " "}คำค้น{" "}
                  <span className="font-bold text-primary-dark">
                    “{query}”
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold text-coral-dark transition-colors hover:bg-coral/10"
            >
              <X className="h-3.5 w-3.5" /> ล้างตัวกรอง
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-600">พบทั้งหมด {total} สัญญา</p>
        <PageSizeSelector value={pageSize} onChange={goSize} />
      </div>

      {/* รายการสัญญา — mobile: card stack / desktop: table card */}
      <div className="xl:overflow-hidden xl:rounded-2xl xl:border xl:border-primary/15 xl:bg-surface-card xl:shadow-card">
        {/* Mobile: card stack */}
        <div className="grid gap-3 py-3 sm:grid-cols-2 xl:hidden">
          {contracts.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-primary/20 bg-surface-card px-4 py-12 text-center">
              <EmptyNotice
                filtered={status !== "ALL" || query.length > 0}
                onClear={clearFilters}
              />
            </div>
          )}
          {contracts.map((c) => {
            const overdue = isOverdue(c);
            const rowKey =
              expanded?.split(":")[0] === c.id ? expanded : null;
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-card p-4 shadow-card"
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
                    <div className="flex min-w-0 items-center gap-2">
                      {c.status === "ACTIVE" &&
                        (rowKey ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
                        ))}
                      {c.image && (
                        <img
                          src={c.image}
                          alt={c.itemName}
                          className="h-10 w-10 shrink-0 rounded-lg border border-primary/15 object-cover"
                        />
                      )}
                      <span className="min-w-0 truncate font-bold text-primary-dark">
                        {c.itemName}
                      </span>
                    </div>
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
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-zinc-700">
                      {c.customerName}
                      {c.customerPhone ? ` · ${c.customerPhone}` : ""}
                    </span>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums text-zinc-900">
                      {formatBaht(c.principalAmount)}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
                    <span className="font-semibold text-zinc-500">
                      {c.contractNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <CalendarClock className="h-3.5 w-3.5" />
                    ครบกำหนด {formatDate(c.dueDate)}
                    {overdue && <Badge tone="coral">เลยกำหนด</Badge>}
                  </p>
                  {c.renewalCount > 0 && (
                    <p className="mt-1 text-xs text-zinc-500">
                      ต่อดอก {c.renewalCount} ครั้ง
                    </p>
                  )}
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
        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-primary/15 bg-primary/[0.04] text-left text-xs text-zinc-600">
                <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">สัญญา</th>
                <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">สิ่งที่จำนำ</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold uppercase tracking-wide">เงินต้น</th>
                <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">ครบกำหนด</th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold uppercase tracking-wide">ต่อดอก</th>
                <th scope="col" className="px-4 py-2.5 font-semibold uppercase tracking-wide">สถานะ</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold uppercase tracking-wide">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <EmptyNotice
                      filtered={status !== "ALL" || query.length > 0}
                      onClear={clearFilters}
                    />
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
                            <p className="text-xs text-zinc-500">
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


