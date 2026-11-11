"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  loadContractPage,
  loadSalePage,
  type DashboardContractItem,
  type DashboardPage,
  type DashboardSaleItem,
} from "@/app/actions/dashboard";
import { Badge, Card, CardHeader, EmptyState, cn } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import {
  formatBaht,
  formatDateOnly,
  formatDateTime,
  PAWN_STATUS_LABEL,
  PAWN_STATUS_TONE,
} from "@/lib/format";

// รายการ "ล่าสุด" บนแดชบอร์ด — เปลี่ยนหน้าฝั่ง client ผ่าน server action
// จึงไม่ต้อง navigate/reload ทั้งหน้า และไม่ต้องดึงข้อมูลทุกหน้าไว้ล่วงหน้า

export function RecentContracts({
  initial,
}: {
  initial: DashboardPage<DashboardContractItem>;
}) {
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  function go(page: number) {
    startTransition(async () => {
      setData(await loadContractPage(page));
    });
  }

  return (
    <RecentSection
      title="สัญญาจำนำล่าสุด"
      href="/pawns"
      headers={["เลขที่สัญญา", "ลูกค้า", "สิ่งที่จำนำ", "ครบกำหนด", "สถานะ"]}
      page={data.page}
      totalPages={data.totalPages}
      onPageChange={go}
      pending={pending}
      mobile={
        data.items.length === 0 ? (
          <EmptyCard text="ยังไม่มีสัญญาจำนำ — กด “+ รับจำนำใหม่” เพื่อเริ่ม" />
        ) : (
          <>
            {data.items.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <p className="truncate font-bold text-primary-dark">
                  {c.itemName}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-zinc-700">
                    {c.customerName}
                  </span>
                  <Badge tone={PAWN_STATUS_TONE[c.status]}>
                    {PAWN_STATUS_LABEL[c.status]}
                  </Badge>
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <span className="min-w-0 truncate text-xs text-zinc-600">
                    {c.contractNumber} · ครบ {formatDateOnly(c.dueDate)}
                  </span>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-zinc-900">
                    {formatBaht(c.principalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )
      }
    >
      {data.items.length === 0 ? (
        <tr>
          <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
            ยังไม่มีสัญญาจำนำ — กด “+ รับจำนำใหม่” เพื่อเริ่ม
          </td>
        </tr>
      ) : (
        data.items.map((c) => (
          <tr key={c.id} className="hover:bg-primary/5">
            <td className="whitespace-nowrap px-4 py-2.5 font-bold text-zinc-800">
              {c.contractNumber}
            </td>
            <td className="px-4 py-2.5 text-zinc-600">{c.customerName}</td>
            <td className="max-w-[220px] truncate px-4 py-2.5 text-zinc-600">
              {c.itemName}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
              {formatDateOnly(c.dueDate)}
            </td>
            <td className="px-4 py-2.5 text-right">
              <Badge tone={PAWN_STATUS_TONE[c.status]}>
                {PAWN_STATUS_LABEL[c.status]}
              </Badge>
            </td>
          </tr>
        ))
      )}
    </RecentSection>
  );
}

export function RecentSales({
  initial,
}: {
  initial: DashboardPage<DashboardSaleItem>;
}) {
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  function go(page: number) {
    startTransition(async () => {
      setData(await loadSalePage(page));
    });
  }

  return (
    <RecentSection
      title="บิลขายล่าสุด"
      href="/pos"
      headers={["เลขที่บิล", "วัน/เวลา", "รายการ", "ยอดรวม"]}
      page={data.page}
      totalPages={data.totalPages}
      onPageChange={go}
      pending={pending}
      mobile={
        data.items.length === 0 ? (
          <EmptyCard text="ยังไม่มีรายการขายวันนี้" />
        ) : (
          <>
            {data.items.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-primary-dark">
                    {s.receiptNumber}
                  </span>
                  <span className="shrink-0 font-extrabold tabular-nums text-success">
                    {formatBaht(s.totalAmount)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {formatDateTime(s.createdAt)}
                  {s.itemsSummary ? ` · ${s.itemsSummary}` : ""}
                </p>
              </div>
            ))}
          </>
        )
      }
    >
      {data.items.length === 0 ? (
        <tr>
          <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
            ยังไม่มีรายการขายวันนี้
          </td>
        </tr>
      ) : (
        data.items.map((s) => (
          <tr key={s.id} className="hover:bg-primary/5">
            <td className="whitespace-nowrap px-4 py-2.5 font-bold text-zinc-800">
              {s.receiptNumber}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
              {formatDateTime(s.createdAt)}
            </td>
            <td className="px-4 py-2.5 text-zinc-600">
              {s.itemsSummary || "—"}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-right font-extrabold text-success">
              {formatBaht(s.totalAmount)}
            </td>
          </tr>
        ))
      )}
    </RecentSection>
  );
}

// ---------------------------------------------------------------------------
// ส่วนประกอบย่อย (ใช้ร่วมกันทั้งสองตาราง)
// ---------------------------------------------------------------------------

function RecentSection({
  title,
  href,
  headers,
  page,
  totalPages,
  onPageChange,
  pending,
  mobile,
  children,
}: {
  title: string;
  href: string;
  headers: string[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pending?: boolean;
  mobile?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-opacity",
        pending && "opacity-60"
      )}
    >
      <CardHeader
        title={title}
        action={
          <Link
            href={href}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-primary-dark transition-colors hover:bg-primary/10"
          >
            ดูทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-primary/15 bg-primary/[0.04] text-left text-xs text-zinc-600">
              {headers.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 font-semibold uppercase tracking-wide",
                    i === headers.length - 1 && "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{children}</tbody>
        </table>
      </div>

      {/* Mobile: รายการแบนในการ์ดเดียว — ไม่ซ้อนการ์ดในการ์ด */}
      {mobile && (
        <div className="divide-y divide-primary/10 sm:hidden">{mobile}</div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </Card>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="p-3">
      <EmptyState title={text} className="py-8" />
    </div>
  );
}
