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
import { deleteExpense, upsertExpense } from "@/app/actions/expense";
import {
  formatBaht,
  formatDateTime,
  EXPENSE_CATEGORY_LABEL,
} from "@/lib/format";
import type { ExpenseCategory } from "@/lib/format";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { cn } from "@/components/ui";
import { PageSizeSelector } from "@/components/page-size-selector";
import { usePageSize } from "@/lib/use-page-size";

export interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  description: string;
  createdAt: string;
  contractNumber: string | null;
  itemName: string | null;
  contractId: string | null;
}

export function ExpensesClient({
  expenses,
  initialPageSize,
}: {
  expenses: ExpenseRow[];
  initialPageSize: number;
}) {
  const router = useRouter();
  const [pageSize, setPageSize] = usePageSize(initialPageSize);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ExpenseRow[]>(expenses);
  const [modal, setModal] = useState<
    { mode: "add" } | { mode: "edit"; row: ExpenseRow } | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [prevExpenses, setPrevExpenses] = useState(expenses);
  if (prevExpenses !== expenses) {
    setPrevExpenses(expenses);
    setRows(expenses);
  }

  function showToast(msg: string, ok = true) {
    if (!ok) {
      setErrorBanner(msg);
      return;
    }
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function safeAction<T extends { ok: boolean; error?: string }>(
    fn: () => Promise<T>
  ): Promise<T | { ok: false; error: string }> {
    try {
      return await fn();
    } catch (e) {
      console.error("[expenses] action failed:", e);
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
        (EXPENSE_CATEGORY_LABEL[r.category] ?? r.category).toLowerCase().includes(q) ||
        (r.contractNumber ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const total = filtered.reduce((sum, r) => sum + r.amount, 0);

  function openAddModal() {
    setModal({ mode: "add" });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
            รายจ่าย
          </h1>
          <p className="text-sm text-zinc-500">
            เงินต้นที่จ่ายตอนรับจำนำ · ค่าใช้จ่ายอื่นๆ
          </p>
        </div>
      </div>
      <Badge tone="red" className="h-9 px-4 text-sm">
          รวม {formatBaht(total)} · {filtered.length} รายการ
        </Badge>
      {/* Search + summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาสัญญา / หมวด…"
            className="pl-9"
          />
        </div>
        <PageSizeSelector value={pageSize} onChange={setPageSize} />
        <Button onClick={openAddModal}>
          <CirclePlus className="h-4 w-4" /> เพิ่มรายจ่าย
        </Button>
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

      <ExpenseTable
        rows={filtered}
        search={search}
        pageSize={pageSize}
        onEdit={(r) => setModal({ mode: "edit", row: r })}
        onDeleteAsk={(r) => setConfirmDelete(r)}
      />

      {/* Modal เพิ่ม/แก้ไข */}
      {modal && (
        <ExpenseModal
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
          title="ลบรายจ่าย?"
          message={`ต้องการลบ "${confirmDelete.description}" (${formatBaht(confirmDelete.amount)}) ใช่หรือไม่?`}
          confirmLabel="ลบ"
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const row = confirmDelete;
            setConfirmDelete(null);
            const result = await safeAction(() => deleteExpense({ id: row.id }));
            if (result.ok) {
              setRows((rs) => rs.filter((r) => r.id !== row.id));
              showToast(`ลบ "${row.description}" แล้ว`);
              router.refresh();
            } else {
              showToast(result.error ?? "ลบรายจ่ายไม่สำเร็จ", false);
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
// ตารางรายจ่าย — desktop table / mobile cards + pagination
// ---------------------------------------------------------------------------

function ExpenseTable({
  rows,
  search,
  pageSize,
  onEdit,
  onDeleteAsk,
}: {
  rows: ExpenseRow[];
  search: string;
  pageSize: number;
  onEdit: (row: ExpenseRow) => void;
  onDeleteAsk: (row: ExpenseRow) => void;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setPage(1);
  }
  const [prevPageSize, setPrevPageSize] = useState(pageSize);
  if (prevPageSize !== pageSize) {
    setPrevPageSize(pageSize);
    setPage(1);
  }

  const pagedRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-surface-card shadow-card">
      {/* Desktop */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">วัน/เวลา</th>
              <th className="px-4 py-3 font-medium">สัญญา / หมวด</th>
              <th className="px-4 py-3 font-medium">รายการ</th>
              <th className="px-4 py-3 text-right font-medium">จำนวนเงิน</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                  {search ? `ไม่พบ "${search}"` : "ยังไม่มีรายจ่าย — กด “เพิ่มรายจ่าย” เพื่อเริ่ม"}
                </td>
              </tr>
            )}
            {pagedRows.map((r) => (
              <tr key={r.id} className="hover:bg-primary/5">
                <td className="whitespace-nowrap px-4 py-2.5 text-zinc-400">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-zinc-800">
                      {r.contractNumber ?? (EXPENSE_CATEGORY_LABEL[r.category] ?? r.category)}
                    </span>
                    {r.itemName && (
                      <span className="text-xs text-zinc-400">{r.itemName}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-medium text-zinc-700">
                  {r.description}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-extrabold text-error">
                  -{formatBaht(r.amount)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" /> แก้ไข
                    </Button>
                    <button
                      type="button"
                      onClick={() => onDeleteAsk(r)}
                      aria-label="ลบรายจ่าย"
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
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Mobile */}
      <div className="space-y-3 p-3 sm:hidden">
        {rows.length === 0 && (
          <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
            {search ? `ไม่พบ "${search}"` : "ยังไม่มีรายจ่าย — กด “เพิ่มรายจ่าย” เพื่อเริ่ม"}
          </div>
        )}
        {pagedRows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-primary-dark">{r.description}</span>
              <span className="whitespace-nowrap font-extrabold text-error">
                -{formatBaht(r.amount)}
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <ExpenseLine label="สัญญา / หมวด">
                {r.contractNumber ?? (EXPENSE_CATEGORY_LABEL[r.category] ?? r.category)}
              </ExpenseLine>
              <ExpenseLine label="วัน/เวลา">{formatDateTime(r.createdAt)}</ExpenseLine>
            </dl>
            <div className="mt-3 flex items-center justify-end gap-1.5 border-t-2 border-dashed border-primary/20 pt-3">
              <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>
                <Pencil className="h-3.5 w-3.5" /> แก้ไข
              </Button>
              <button
                type="button"
                onClick={() => onDeleteAsk(r)}
                aria-label="ลบรายจ่าย"
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
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: เพิ่ม/แก้ไขรายจ่าย
// ---------------------------------------------------------------------------

function ExpenseModal({
  mode,
  row,
  onClose,
  onDone,
}: {
  mode: "add" | "edit";
  row: ExpenseRow | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(row ? String(row.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(
    (row?.category as ExpenseCategory) ?? "OTHER"
  );
  const [description, setDescription] = useState(row?.description ?? "");
  const [contractId, setContractId] = useState(row?.contractId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await upsertExpense({
        ...(mode === "edit" && row ? { id: row.id } : {}),
        amount: Number(amount),
        category,
        description,
        contractId: contractId || undefined,
      });
      if (result.ok) {
        onDone(
          mode === "edit"
            ? `บันทึกการแก้ไข "${description}" แล้ว`
            : `เพิ่มรายจ่าย "${description}" แล้ว`
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
            {mode === "edit" ? "แก้ไขรายจ่าย" : "เพิ่มรายจ่ายใหม่"}
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
              placeholder="เช่น 5000"
            />
          </Field>
          <Field label="หมวด" required>              <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="เลขที่สัญญา (ถ้ามี)">
            <Input
              value={contractId}
              onChange={(e) => setContractId(e.target.value.trim())}
              placeholder="เช่น PC-20260904-001"
            />
          </Field>
          <Field label="รายละเอียด" required>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น จ่ายเงินต้นรับจำนำ"
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
              {pending ? "กำลังบันทึก…" : mode === "edit" ? "บันทึก" : "เพิ่มรายจ่าย"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpenseLine({
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
