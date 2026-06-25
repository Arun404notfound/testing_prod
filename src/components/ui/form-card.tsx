export function FormCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tg-card overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F0FDF4] to-[#F8FAFC] px-6 py-4">
        <div className="h-4 w-1 rounded-full bg-[#0F766E]" />
        <h2 className="text-lg font-bold text-[#0F172A]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
