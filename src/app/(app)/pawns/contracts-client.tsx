"use client";

/* eslint-disable @next/next/no-img-element -- รูปสิ่งของที่แนบตอนรับจำนำ */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Filter,
  Gavel,
  HandCoins,
  Search,
} from "lucide-react";
import {
  forfeitContract,
  redeemContract,
  renewInterest,
} from "@/app/actions/pawn";
import type { PawnContractDto } from "@/lib/dto";
import {
  formatBaht,
  formatDate,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/format";
import {
  calcOverdueRounds,
  calcPeriodInterest,
  PAWN_TERM_DAYS,
} from "@/lib/pawn-math";
import { Badge, Button, Field, Input } from "@/components/ui";
import { cn } from "@/components/ui";

type StatusFilter = "ALL" | "ACTIVE" | "REDEEMED" | "FORFEITED" | "SOLD";
type ExpandKey = `${string}:renew` | `${string}:forfeit` | `${string}:redeem`;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "ACTIVE", label: "จำนำอยู่" },
  { key: "FORFEITED", label: "หลุดจำนำ" },
  { key: "REDEEMED", label: "ไถ่ถอนแล้ว" },
  { key: "SOLD", label: "ขายแล้ว" },
];

export function PawnContractsClient({
  contracts,
}: {
  contracts: PawnContractDto[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (filter !== "ALL" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.itemName.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.serialNumber?.toLowerCase().includes(q)
      );
    });
  }, [contracts, filter, search]);

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
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="shrink-0 rounded-full border-2 border-primary/15 bg-white p-2 text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
            aria-label="เมนูกรอง"
          >
            <Filter className="h-5 w-5" />
          </button>

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
                    onClick={() => {
                      setFilter(f.key);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      filter === f.key
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
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
                filter === f.key
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาสัญญา / ชื่อลูกค้า / สิ่งของ…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* รายการสัญญา */}
      <div className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-surface-card shadow-card">
        {filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-zinc-400">
            ไม่พบสัญญาในเงื่อนไขนี้
          </p>
        )}
        <ul className="divide-y divide-zinc-100">
          {filtered.map((c) => {
            const overdue = isOverdue(c);
            const rowKey =
              expanded?.split(":")[0] === c.id ? expanded : null;
            return (
              <li key={c.id}>
                {/* แถวหลัก */}
                <div
                  className={cn(
                    "grid cursor-pointer grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-primary/5 md:grid-cols-[auto_1fr_auto]",
                    expanded === `${c.id}:renew` ||
                      expanded === `${c.id}:forfeit` ||
                      expanded === `${c.id}:redeem`
                      ? "bg-cream"
                      : ""
                  )}
                  onClick={() => {
                    if (rowKey) setExpanded(null);
                    else if (c.status === "ACTIVE")
                      setExpanded(`${c.id}:renew`);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {c.status === "ACTIVE" ? (
                      rowKey ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
                      )
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    {c.image && (
                      <img
                        src={c.image}
                        alt={c.itemName}
                        className="h-10 w-10 shrink-0 rounded-lg border border-primary/15 object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {c.itemName}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {c.contractNumber} · {c.customerName}
                        {c.customerPhone ? ` · ${c.customerPhone}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="ml-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 md:ml-0">
                    <span>
                      เงินต้น{" "}
                      <b className="text-zinc-800">
                        {formatBaht(c.principalAmount)}
                      </b>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      ครบกำหนด {formatDate(c.dueDate)}
                      {overdue && (
                        <Badge tone="coral">เลยกำหนด</Badge>
                      )}
                    </span>
                    <span>
                      ต่อดอก {c.renewalCount} ครั้ง
                    </span>
                  </div>

                  <div className="ml-6 flex items-center justify-between gap-3 md:ml-0 md:justify-end">
                    <Badge
                      tone={
                        c.status === "ACTIVE" && overdue
                          ? "coral"
                          : PAWN_STATUS_TONE[c.status]
                      }
                    >
                      {PAWN_STATUS_LABEL[c.status]}
                    </Badge>
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
                  </div>
                </div>

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
              </li>
            );
          })}
        </ul>
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

// ---------------------------------------------------------------------------
// Forms ย่อย
// ---------------------------------------------------------------------------

function ActionButton({
  label,
  onClick,
  tone = "primary",
}: {
  label: string;
  onClick: () => void;
  tone?: "primary" | "success" | "danger";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary-dark hover:bg-primary/20",
    success: "bg-success/10 text-success hover:bg-success/20",
    danger: "bg-coral/10 text-coral-dark hover:bg-coral/20",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors",
        tones[tone]
      )}
    >
      {label}
    </button>
  );
}


function RenewForm({
  contract,
  onDone,
}: {
  contract: PawnContractDto;
  onDone: (msg: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");

  // 1 งวด = 10 วัน (fix) — ดอกเบี้ยต่องวด (ตรงกับที่ Server คำนวณ)
  const interest = calcPeriodInterest(
    contract.principalAmount,
    contract.interestRatePercent
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await renewInterest({
        contractId: contract.id,
        paymentMethod: method,
      });
      if (result.ok) {
        onDone(
          `ต่อดอกเบี้ย 10 วัน สำเร็จ — รับชำระ ${formatBaht(
            result.interestDue
          )} บาท (${PAYMENT_METHOD_LABEL[method]})`
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-t-2 border-dashed border-primary/20 bg-primary-bg px-6 py-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-primary/60">
            ต่อดอกเบี้ย 1 รอบ = 10 วัน
          </p>
          <p className="font-semibold text-zinc-500">ดอกเบี้ยที่ต้องชำระ</p>
          <p className="text-2xl font-extrabold text-accent-dark">
            {formatBaht(interest)}
          </p>
          <p className="text-xs text-zinc-400">
            ({contract.interestRatePercent}% ต่อ 10 วัน) ครบกำหนดใหม่{" "}
            {formatDate(addDays(new Date(contract.dueDate), PAWN_TERM_DAYS))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                method === m
                  ? "bg-primary text-white shadow-glow-teal"
                  : "border-2 border-primary/15 bg-white text-zinc-500 hover:bg-primary/10"
              )}
            >
              {PAYMENT_METHOD_LABEL[m]}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          className="ml-auto"
          disabled={pending}
          onClick={submit}
        >
          {pending ? "กำลังบันทึก…" : "ยืนยันต่อดอกเบี้ย (10 วัน)"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-coral-dark">{error}</p>}
    </div>
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function ForfeitForm({
  contract,
  onDone,
}: {
  contract: PawnContractDto;
  onDone: (msg: string) => void;
}) {
  const [price, setPrice] = useState(String(contract.principalAmount));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await forfeitContract({
        contractId: contract.id,
        forfeitPrice: Number(price) > 0 ? Number(price) : null,
      });
      if (result.ok) {
        onDone("ตัดหลุดจำนำแล้ว — ของจะไปโผล่ในหน้าขาย (POS)");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-t-2 border-dashed border-coral/30 bg-coral/5 px-6 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="max-w-sm text-sm text-zinc-600">
          <p className="font-extrabold text-coral-dark">ตัดหลุดจำนำ?</p>
          <p className="text-xs font-medium">
            สัญญานี้จะกลายเป็น “ของหลุดจำนำ” และพร้อมขายในหน้าร้านทันที
          </p>
        </div>
        <Field label="ราคาที่ตั้งขาย (บาท)" required>
          <Input
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-36"
          />
        </Field>
        <Button
          variant="danger"
          className="ml-auto"
          disabled={pending}
          onClick={submit}
        >
          <Gavel className="h-4 w-4" />
          {pending ? "กำลังดำเนินการ…" : "ยืนยันตัดหลุด"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function RedeemForm({
  contract,
  onDone,
}: {
  contract: PawnContractDto;
  onDone: (msg: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [received, setReceived] = useState("");

  // คำนวณเหมือน Server Action: ดอกเบี้ยค้าง = จำนวนรอบที่เกิน (10 วัน) × ดอกเบี้ยต่องวด
  const dueDate = new Date(contract.dueDate);
  const rounds = calcOverdueRounds(dueDate, new Date());
  const interestDue =
    rounds *
    calcPeriodInterest(contract.principalAmount, contract.interestRatePercent);
  const total = contract.principalAmount + interestDue;
  const receivedAmount = received === "" ? total : Number(received);
  const change = method === "CASH" ? Math.max(receivedAmount - total, 0) : 0;
  const enoughCash = method !== "CASH" || receivedAmount >= total;

  function submit() {
    if (!enoughCash) return;
    setError(null);
    startTransition(async () => {
      const result = await redeemContract({
        contractId: contract.id,
        paymentMethod: method,
        receivedAmount: method === "CASH" ? receivedAmount : null,
      });
      if (result.ok) {
        onDone(
          `ไถ่ถอนสำเร็จ — รับชำระ ${formatBaht(result.totalAmount)} ` +
            `(เงินต้น ${formatBaht(contract.principalAmount)}` +
            (result.interestDue > 0
              ? ` + ดอกเบี้ยค้าง ${formatBaht(result.interestDue)})`
              : `)`) +
            (result.changeAmount > 0
              ? ` เงินทอน ${formatBaht(result.changeAmount)}`
              : "")
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-t-2 border-dashed border-success/30 bg-success/5 px-6 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-success" />
          <div>
            <p className="font-extrabold text-success">
              ไถ่ถอน — คืนสิ่งของให้ลูกค้า
            </p>
            <p className="text-xs font-medium text-zinc-500">
              ครบกำหนด {formatDate(dueDate)}
              {rounds > 0
                ? ` · เกินกำหนด ${rounds} รอบ (รอบละ ${PAWN_TERM_DAYS} วัน)`
                : " · ยังไม่เกินกำหนด รับเฉพาะเงินต้น"}
            </p>
          </div>
        </div>
      </div>

      {/* ยอดสรุป */}
      <div className="grid gap-3 sm:grid-cols-3">
        <RedeemSummary
          label="เงินต้น"
          value={formatBaht(contract.principalAmount)}
        />
        <RedeemSummary
          label={`ดอกเบี้ยค้าง (${rounds} รอบ)`}
          value={formatBaht(interestDue)}
          hint={`${contract.interestRatePercent}% ต่อ 10 วัน`}
        />
        <RedeemSummary
          label="ยอดที่ต้องชำระ"
          value={formatBaht(total)}
          accent
        />
      </div>

      {/* วิธีชำระ + เงินสด */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                method === m
                  ? "bg-primary text-white shadow-glow-teal"
                  : "border-2 border-primary/15 bg-white text-zinc-500 hover:bg-primary/10"
              )}
            >
              {PAYMENT_METHOD_LABEL[m]}
            </button>
          ))}
        </div>
        {method === "CASH" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">รับเงิน:</span>
            {[total, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => setReceived(String(amt))}
                className="rounded-full border border-primary/20 bg-white px-2.5 py-1 text-xs font-bold text-primary-dark hover:bg-primary/10"
              >
                {formatBaht(amt)}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              placeholder="จำนวนเงิน"
              className="h-8 w-28 rounded-full border-2 border-primary/20 bg-white px-3 text-right text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
            <span className="text-sm">
              เงินทอน{" "}
              <b className={change >= 0 ? "text-success" : "text-error"}>
                {formatBaht(change)}
              </b>
            </span>
          </div>
        )}
        <Button
          variant="success"
          className="ml-auto"
          disabled={pending || !enoughCash}
          onClick={submit}
        >
          {pending ? "กำลังบันทึก…" : `ยืนยันไถ่ถอน ${formatBaht(total)}`}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-coral-dark">{error}</p>
      )}
    </div>
  );
}

function RedeemSummary({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2",
        accent ? "border-accent/30 bg-cream" : "border-primary/15 bg-white"
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-extrabold",
          accent ? "text-accent-dark" : "text-zinc-800"
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}
