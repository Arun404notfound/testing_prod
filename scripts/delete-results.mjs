import Database from "better-sqlite3";

const db = new Database("dev.db");

const before = db.prepare("SELECT COUNT(*) as n FROM AssessmentResult").get();
console.log(`AssessmentResult rows before: ${before.n}`);

const childTables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
  .all()
  .map((r) => r.name);

// Delete child records that reference AssessmentResult / AssessmentAttempt first
const toDelete = [
  "AttemptResponse",
  "AttemptScore",
  "TraitScore",
  "CompetencyScore",
  "QuestionResponse",
  "SectionScore",
  "AssessmentAttempt",
  "CandidateAnswer",
];

for (const t of toDelete) {
  if (childTables.includes(t)) {
    const n = db.prepare(`SELECT COUNT(*) as n FROM "${t}"`).get();
    if (n.n > 0) {
      db.prepare(`DELETE FROM "${t}"`).run();
      console.log(`Deleted ${n.n} rows from ${t}`);
    }
  }
}

const deleted = db.prepare("DELETE FROM AssessmentResult").run();
console.log(`Deleted ${deleted.changes} rows from AssessmentResult`);

// Reset all assignments that are marked completed back to 'assigned'
// so candidates can retake them
const reset = db
  .prepare(`UPDATE AssessmentAssignment SET status = 'assigned', completedAt = NULL WHERE status = 'completed'`)
  .run();
console.log(`Reset ${reset.changes} assignments back to 'assigned'`);

const after = db.prepare("SELECT COUNT(*) as n FROM AssessmentResult").get();
console.log(`AssessmentResult rows after: ${after.n}`);

db.close();
