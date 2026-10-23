import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* pb เผื่อแถบนำทางล่าง (มือถือ) + safe area ของ iPhone */}
        <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] lg:px-6 lg:pb-6 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
