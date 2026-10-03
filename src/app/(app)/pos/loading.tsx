// Loading เฉพาะหน้า POS — โครงคล้ายหน้าจริง (ค้นหา + ชิปหมวด + กริดสินค้า + ตะกร้า)
export default function Loading() {
  return (
    <div
      className="flex h-[calc(100vh-8.5rem)] animate-pulse flex-col lg:flex-row lg:gap-4 max-lg:h-[calc(100dvh-8.5rem)]"
      aria-busy="true"
      aria-live="polite"
    >
      {/* ฝั่งซ้าย: ค้นหา + ชิปหมวด + กริดสินค้า */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 h-11 w-full rounded-full bg-primary/10" />

        <div className="mb-3 flex flex-nowrap gap-1.5 overflow-hidden">
          {["w-24", "w-36", "w-16", "w-20", "w-24"].map((w, i) => (
            <div key={i} className={`h-8 shrink-0 rounded-full bg-primary/10 ${w}`} />
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-hidden pb-2 pr-1">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s}>
              <div className="mb-2 h-4 w-28 rounded-full bg-primary/10" />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-primary/15 bg-white shadow-sm"
                  >
                    <div className="h-20 w-full bg-primary/5" />
                    <div className="space-y-1.5 p-2">
                      <div className="h-3 w-full rounded-full bg-primary/10" />
                      <div className="h-4 w-12 rounded-full bg-primary/10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ตะกร้าฝั่งขวา (แสดงเฉพาะจอใหญ่) */}
      <aside className="mt-4 hidden w-full flex-col overflow-hidden rounded-2xl border-2 border-primary/15 bg-white shadow-card lg:mt-0 lg:flex lg:w-[340px] lg:shrink-0">
        <div className="flex items-center gap-2 border-b-2 border-dashed border-primary/15 bg-cream px-4 py-3">
          <div className="h-5 w-5 rounded-full bg-primary/15" />
          <div className="h-4 w-16 rounded-full bg-primary/10" />
          <div className="ml-auto h-4 w-10 rounded-full bg-primary/10" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-primary/5" />
          ))}
        </div>
        <div className="border-t-2 border-dashed border-primary/15 bg-cream px-4 py-3">
          <div className="h-7 w-full rounded-full bg-primary/10" />
          <div className="mt-3 h-12 w-full rounded-full bg-primary/10" />
        </div>
      </aside>
    </div>
  );
}
