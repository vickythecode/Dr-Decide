export default function Card({
  title,
  children,
  action,
  className, // 1. Destructure the new prop
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    // 3. Merge the custom className with your default "panel p-4" classes
    <section className={`panel p-4 ${className || ""}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="section-title">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}