import Database from "better-sqlite3";

for (const path of ["dev.db", "prisma/dev.db"]) {
  console.log(`\nMigrating: ${path}`);
  try {
    const db = new Database(path);

    try {
      db.exec(`ALTER TABLE "Candidate" ADD COLUMN "batchName" TEXT`);
      console.log("  ✓ Added Candidate.batchName");
    } catch (e) {
      console.log("  - Candidate.batchName:", e.message.includes("duplicate") ? "already exists" : e.message);
    }

    try {
      db.exec(`CREATE INDEX IF NOT EXISTS "Candidate_batchName_idx" ON "Candidate"("batchName")`);
      console.log("  ✓ Index ok");
    } catch (e) {
      console.log("  - Index:", e.message);
    }

    try {
      db.exec(`ALTER TABLE "ImportJob" ADD COLUMN "batchName" TEXT`);
      console.log("  ✓ Added ImportJob.batchName");
    } catch (e) {
      console.log("  - ImportJob.batchName:", e.message.includes("duplicate") ? "already exists" : e.message);
    }

    db.close();
  } catch (e) {
    console.log("  ! Could not open:", e.message);
  }
}

console.log("\nDone.");
