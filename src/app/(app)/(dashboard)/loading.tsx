// Loading เฉพาะหน้าแดชบอร์ด — โครงคล้ายหน้าจริง (หัวข้อ + การ์ดสถิติ + 2 ตารางล่าสุด)
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-full bg-primary/10" />
          <div className="h-4 w-56 max-w-full rounded-full bg-primary/10" />
        </div>
        <div className="flex gap-2">
          <div className="h-11 w-32 rounded-full bg-primary/10" />
          <div className="h-11 w-36 rounded-full bg-primary/10" />
        </div>
      </div>

      {/* การ์ดสถิติ 4 ใบ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-primary/20 border-l-8 border-l-primary/30 bg-surface-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/15" />
              <div className="h-3 w-24 rounded-full bg-primary/10" />
            </div>
            <div className="mt-3 h-7 w-24 rounded-full bg-primary/10" />
            <div className="mt-2 h-3 w-28 max-w-full rounded-full bg-primary/5" />
          </div>
        ))}
      </div>

      {/* ตารางล่าสุด 2 ส่วน */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-primary/20 bg-surface-card shadow-card"
          >
            <div className="flex items-center justify-between border-b-2 border-dashed border-primary/25 px-5 py-3.5">
              <div className="h-4 w-32 rounded-full bg-primary/10" />
              <div className="h-6 w-16 rounded-full bg-primary/10" />
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-8 rounded-xl bg-primary/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
