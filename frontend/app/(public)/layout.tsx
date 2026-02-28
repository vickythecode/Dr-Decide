export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6">
      <div className="mx-auto max-w-[1100px] space-y-4">{children}</div>
    </div>
  );
}
