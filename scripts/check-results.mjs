import Database from 'better-sqlite3';
const db = new Database('dev.db', { readonly: true });
const rows = db.prepare(`
  SELECT ar.id, ar.completedAt, a.assessmentType, a.reportTemplateType, a.title
  FROM AssessmentResult ar
  LEFT JOIN Assessment a ON a.id = ar.assessmentId
  ORDER BY ar.completedAt DESC LIMIT 5
`).all();
console.log(JSON.stringify(rows, null, 2));
db.close();
