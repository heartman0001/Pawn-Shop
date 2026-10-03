// Loading UI กลาง — ใช้ใน loading.tsx ของ route segment
// แสดงระหว่างที่ server กำลัง render หน้าใหม่ โดย layout/เมนูด้านข้างยังใช้งานได้
// (Next.js จะ wrap ไว้ใน <Suspense> ที่ segment นั้นอัตโนมัติ)

export function PageLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <span className="text-sm font-bold text-zinc-400">กำลังโหลด…</span>
      </div>

      {/* skeleton คล้ายหัวข้อหน้า */}
      <div className="h-8 w-56 max-w-full rounded-full bg-primary/10" />
      <div className="h-4 w-80 max-w-full rounded-full bg-primary/10" />

      {/* skeleton แถบค้นหา / ตัวกรอง */}
      <div className="h-11 w-full rounded-full bg-primary/10" />

      {/* skeleton ตาราง/การ์ดรายการ */}
      <div className="space-y-2.5 rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 rounded-xl bg-primary/5" />
        ))}
      </div>
    </div>
  );
}
