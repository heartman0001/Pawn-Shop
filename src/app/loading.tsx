export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-base px-6 text-center">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
        aria-hidden="true"
      />
      <p className="text-sm font-bold text-primary-dark">กำลังโหลดข้อมูล…</p>
      <p className="text-xs font-medium text-zinc-400">
        ร้านรับจำนำ — ระบบจัดการ &amp; POS
      </p>
    </div>
  );
}