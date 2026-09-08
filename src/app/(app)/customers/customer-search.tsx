"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, Input } from "@/components/ui";

interface CustomerRow {
  id: string;
  nationalId: string;
  fullName: string;
  phone: string;
  createdAt: string;
  contractCount: number;
  activeCount: number;
}

export function CustomerSearch({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                    ไม่พบลูกค้า "{search}"
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
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

        {/* Mobile: card stack */}
        <div className="divide-y divide-zinc-100 sm:hidden">
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-zinc-400">
              ไม่พบลูกค้า "{search}"
            </div>
          )}
          {filtered.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{c.fullName}</span>
                <span className="text-zinc-600">{c.nationalId}</span>
                <span className="text-zinc-600">{c.phone || "—"}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                {c.activeCount > 0 ? (
                  <Badge tone="teal">
                    {c.activeCount} active / {c.contractCount} สัญญา
                  </Badge>
                ) : (
                  <span className="text-zinc-500">{c.contractCount} สัญญา</span>
                )}
                <span>สมัครเมื่อ {formatDateTime(c.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
