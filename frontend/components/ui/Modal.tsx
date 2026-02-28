"use client";

export default function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
      <div className="panel w-full max-w-md p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="section-title">{title}</h3>
          <button className="text-sm text-[var(--muted)]" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
