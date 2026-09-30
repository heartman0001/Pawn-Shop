import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
