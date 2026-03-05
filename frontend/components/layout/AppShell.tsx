"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto max-w-[1300px]">
        <div className="mb-4 flex items-center lg:hidden">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium cursor-pointer"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40 cursor-pointer"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close menu overlay"
            />
            <div className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] overflow-y-auto bg-[var(--bg)] p-4">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white p-2 cursor-pointer"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Sidebar />
            </div>
          </div>
        )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="min-w-0 space-y-4">{children}</main>
      </div>
      </div>
    </div>
  );
}
