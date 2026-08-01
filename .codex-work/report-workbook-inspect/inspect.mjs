import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/arun3/Downloads/First Time Manager Framework and Report Content.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));

const summary = await workbook.inspect({
  kind: "sheet,table",
  include: "id,name",
  maxChars: 12000,
  tableMaxRows: 8,
  tableMaxCols: 14,
  tableMaxCellChars: 160,
});
console.log("SUMMARY");
console.log(summary.ndjson);

for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange();
  if (!used) continue;
  const values = used.values;
  const hits = [];
  for (let row = 0; row < values.length; row += 1) {
    const joined = values[row].map((value) => String(value ?? "")).join(" | ");
    if (/project|what to do|how to do|measure|evidence/i.test(joined)) {
      hits.push({ row: row + 1, values: values[row] });
    }
  }
  if (hits.length) {
    console.log(`HITS ${sheet.name}`);
    console.log(JSON.stringify(hits.slice(0, 30), null, 2));
  }
}
