export function formatReportCompletedDate(completedAt: string): string {
  const d = new Date(completedAt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
