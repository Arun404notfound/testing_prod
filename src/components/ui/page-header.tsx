export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-[#64748B]">{subtitle}</p> : null}
      </div>
      {right ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {right}
        </div>
      ) : null}
    </div>
  );
}
