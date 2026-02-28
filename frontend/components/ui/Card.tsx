export default function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="panel p-4">
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
