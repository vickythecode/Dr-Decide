import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6">
      <div className="mx-auto grid max-w-[1300px] gap-4 lg:grid-cols-[260px_1fr]">
        <Sidebar />
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
