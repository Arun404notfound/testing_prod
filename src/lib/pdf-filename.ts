export function pdfFileName(assessmentName: string) {
  const slug = assessmentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "assessment"}-report.pdf`;
}
