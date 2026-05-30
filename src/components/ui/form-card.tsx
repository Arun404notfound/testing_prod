export function FormCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tg-card p-6">
      <h2 className="mb-4 text-xl font-semibold text-[#0F172A]">{title}</h2>
      {children}
    </section>
  );
}
