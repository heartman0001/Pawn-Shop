"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CirclePlus,
  Pencil,
  Search,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import { deleteIncome, upsertIncome } from "@/app/actions/income";
import {
  formatBaht,
  formatDateTime,
  INCOME_CATEGORIES,
  INCOME_CATEGORY_LABEL,
} from "@/lib/format";
import type { IncomeCategory } from "@/lib/format";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { cn } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IncomeRow {
  id: string;
  amount: number;
  category: string;
  description: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function IncomesClient({ incomes }: { incomes: IncomeRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<IncomeRow[]>(incomes);
  const [modal, setModal] = useState<
    { mode: "add" } | { mode: "edit"; row: IncomeRow } | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<IncomeRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // props ใหม่จาก router.refresh() → sync เข้า state (ปรับ state ตอน render ตามแนวทาง React)
  const [prevIncomes, setPrevIncomes] = useState(incomes);
  if (prevIncomes !== incomes) {
    setPrevIncomes(incomes);
    setRows(incomes);
  }

  function showToast(msg: string, ok = true) {
    if (!ok) {
      setErrorBanner(msg);
      return;
    }
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 4000);
  }

  /** เรียก server action แบบกัน throw (network/500) → คืน ok:false เสมอ */
  async function safeAction<T extends { ok: boolean; error?: string }>(
    fn: () => Promise<T>
  ): Promise<T | { ok: false; error: string }> {
    try {
      return await fn();
    } catch (e) {
      console.error("[incomes] action failed:", e);
      return {
        ok: false,
        error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
      };
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        (INCOME_CATEGORY_LABEL[r.category as IncomeCategory] ?? r.category)
          .toLowerCase()
          .includes(q)
    );
  }, [rows, search]);

  const total = filtered.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
            รายรับ
          </h1>
          <p className="text-sm text-zinc-500">
            บันทึกรายรับอื่นๆ นอกเหนือจาก POS · ไถ่ถอน · ต่อดอก เช่น ค่าซ่อมมือถือ
          </p>
        </div>
        <Button onClick={() => setModal({ mode: "add" })}>
          <CirclePlus className="h-4 w-4" /> เพิ่มรายรับ
        </Button>
      </div>

      {/* Search + summary */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารายละเอียด / หมวด…"
            className="pl-9"
          />
        </div>
        <Badge tone="green" className="h-9 px-4 text-sm">
          <Wallet className="h-4 w-4" /> รวม {formatBaht(total)} · {filtered.length}{" "}
          รายการ
        </Badge>
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-coral/10 px-4 py-3">
          <p className="text-sm font-bold text-coral-dark">⚠️ {errorBanner}</p>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="shrink-0 rounded-full p-1 text-coral-dark/60 hover:bg-coral/10 hover:text-coral-dark"
            aria-label="ปิดข้อผิดพลาด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <IncomeTable rows={filtered} search={search} onEdit={(row) => setModal({ mode: "edit", row })} onDeleteAsk={(row) => setConfirmDelete(row)} />

      {/* Modal เพิ่ม/แก้ไข */}
      {modal && (
        <IncomeModal
          mode={modal.mode}
          row={modal.mode === "edit" ? modal.row : null}
          onClose={() => setModal(null)}
          onDone={(msg) => {
            setModal(null);
            showToast(msg);
            router.refresh();
          }}
        />
      )}

      {/* Modal ยืนยันลบ */}
      {confirmDelete && (
        <ConfirmModal
          title="ลบรายรับ?"
          message={`ต้องการลบ "${confirmDelete.description}" (${formatBaht(confirmDelete.amount)}) ใช่หรือไม่?`}
          confirmLabel="ลบ"
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const row = confirmDelete;
            setConfirmDelete(null);
            const result = await safeAction(() => deleteIncome({ id: row.id }));
            if (result.ok) {
              setRows((rs) => rs.filter((r) => r.id !== row.id));
              showToast(`ลบ "${row.description}" แล้ว`);
              router.refresh();
            } else {
              showToast(result.error ?? "ลบรายรับไม่สำเร็จ", false);
            }
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg",
            toast.ok ? "bg-zinc-900" : "bg-coral-dark"
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ตารางรายรับ — desktop table / mobile cards + pagination (desktop 20 / mobile 10)
// ---------------------------------------------------------------------------

const DESKTOP_PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 10;

function IncomeTable({
  rows,
  search,
  onEdit,
  onDeleteAsk,
}: {
  rows: IncomeRow[];
  search: string;
  onEdit: (row: IncomeRow) => void;
  onDeleteAsk: (row: IncomeRow) => void;
}) {
  // pagination — เปลี่ยนหน้าฝั่ง client (desktop 20 แถว / mobile 10 การ์ด ต่อหน้า)
  const [desktopPage, setDesktopPage] = useState(1);
  const [mobilePage, setMobilePage] = useState(1);
  const dTotalPages = Math.max(1, Math.ceil(rows.length / DESKTOP_PAGE_SIZE));
  const mTotalPages = Math.max(1, Math.ceil(rows.length / MOBILE_PAGE_SIZE));
  const dPage = Math.min(desktopPage, dTotalPages);
  const mPage = Math.min(mobilePage, mTotalPages);
  // ค้นหาใหม่ → กลับไปหน้าแรกทั้งสองแบบ (ปรับ state ตอน render)
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setDesktopPage(1);
    setMobilePage(1);
  }
  const desktopRows = rows.slice(
    (dPage - 1) * DESKTOP_PAGE_SIZE,
    dPage * DESKTOP_PAGE_SIZE
  );
  const mobileRows = rows.slice(
    (mPage - 1) * MOBILE_PAGE_SIZE,
    mPage * MOBILE_PAGE_SIZE
  );

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-surface-card shadow-card">
      {/* Desktop */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">วัน/เวลา</th>
              <th className="px-4 py-3 font-medium">หมวด</th>
              <th className="px-4 py-3 font-medium">รายละเอียด</th>
              <th className="px-4 py-3 text-right font-medium">จำนวนเงิน</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                  {search ? `ไม่พบ “${search}”` : "ยังไม่มีรายรับ — กด “เพิ่มรายรับ” เพื่อเริ่ม"}
                </td>
              </tr>
            )}
            {desktopRows.map((r) => (
              <tr key={r.id} className="hover:bg-primary/5">
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-400">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  <CategoryBadge category={r.category} />
                </td>
                <td className="px-4 py-2.5 font-medium text-zinc-700">
                  {r.description}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-extrabold text-success">
                  +{formatBaht(r.amount)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" /> แก้ไข
                    </Button>
                    <button
                      type="button"
                      onClick={() => onDeleteAsk(r)}
                      aria-label="ลบรายรับ"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-coral/10 hover:text-coral-dark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hidden sm:block">
        <Pagination
          page={dPage}
          totalPages={dTotalPages}
          onPageChange={setDesktopPage}
        />
      </div>

      {/* Mobile */}
      <div className="space-y-3 p-3 sm:hidden">
        {rows.length === 0 && (
          <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
            {search ? `ไม่พบ “${search}”` : "ยังไม่มีรายรับ — กด “เพิ่มรายรับ” เพื่อเริ่ม"}
          </div>
        )}
        {mobileRows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-primary-dark">{r.description}</span>
              <span className="whitespace-nowrap font-extrabold text-success">
                +{formatBaht(r.amount)}
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Line label="หมวด">
                <CategoryBadge category={r.category} />
              </Line>
              <Line label="วัน/เวลา">{formatDateTime(r.createdAt)}</Line>
            </dl>
            <div className="mt-3 flex items-center justify-end gap-1.5 border-t-2 border-dashed border-primary/20 pt-3">
              <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>
                <Pencil className="h-3.5 w-3.5" /> แก้ไข
              </Button>
              <button
                type="button"
                onClick={() => onDeleteAsk(r)}
                aria-label="ลบรายรับ"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-coral/10 hover:text-coral-dark"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="sm:hidden">
        <Pagination
          page={mPage}
          totalPages={mTotalPages}
          onPageChange={setMobilePage}
        />
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const label =
    INCOME_CATEGORY_LABEL[category as IncomeCategory] ?? category;
  const tone =
    category === "REPAIR"
      ? "teal"
      : category === "SERVICE"
        ? "sky"
        : category === "COMMISSION"
          ? "gold"
          : "gray";
  return <Badge tone={tone}>{label}</Badge>;
}

// ---------------------------------------------------------------------------
// Pagination — เลย์เอาต์เดียวกับหน้า customers / manage
// ---------------------------------------------------------------------------

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
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
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
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: เพิ่ม/แก้ไขรายรับ
// ---------------------------------------------------------------------------

function IncomeModal({
  mode,
  row,
  onClose,
  onDone,
}: {
  mode: "add" | "edit";
  row: IncomeRow | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(row ? String(row.amount) : "");
  const [category, setCategory] = useState<IncomeCategory>(
    (row?.category as IncomeCategory) ?? "REPAIR"
  );
  const [description, setDescription] = useState(row?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await upsertIncome({
        ...(mode === "edit" && row ? { id: row.id } : {}),
        amount: Number(amount),
        category,
        description,
      });
      if (result.ok) {
        onDone(
          mode === "edit"
            ? `บันทึกการแก้ไข "${description}" แล้ว`
            : `เพิ่มรายรับ "${description}" แล้ว`
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-2 border-primary/15 bg-surface-card p-5 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b-2 border-dashed border-primary/25 pb-3">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-primary-dark">
            <Wallet className="h-5 w-5 text-primary" />
            {mode === "edit" ? "แก้ไขรายรับ" : "เพิ่มรายรับใหม่"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-primary/10 hover:text-primary-dark"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <Field label="จำนวนเงิน (บาท)" required>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="เช่น 2000"
            />
          </Field>
          <Field label="หมวด" required>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncomeCategory)}
            >
              {INCOME_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {INCOME_CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="รายละเอียด" required>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ซ่อมมือถือ — เปลี่ยนจอ iPhone 11"
            />
          </Field>
          {error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-coral/10 px-3 py-2 text-sm font-bold text-coral-dark">
              <TriangleAlert className="h-4 w-4" /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "กำลังบันทึก…" : mode === "edit" ? "บันทึก" : "เพิ่มรายรับ"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: ยืนยันลบ
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await onConfirm();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border-2 border-coral/30 bg-surface-card p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-extrabold text-coral-dark">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            <Trash2 className="h-4 w-4" />
            {pending ? "กำลังลบ…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Line({
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
