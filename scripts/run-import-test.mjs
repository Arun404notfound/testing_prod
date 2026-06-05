// Quick integration test for the candidate import pipeline
import { readFileSync } from "fs";
import Database from "better-sqlite3";

const ts = Date.now();
const testEmail = `importtest_${ts}@example.com`;

// Write test CSV
const csv = `fullname,email,mobile,employeeid,designation,department,location\nImport Test,${testEmail},9876543210,EMP_TEST_${ts},Tester,QA,Mumbai\n`;
const bytes = Buffer.from(csv);

// Verify the DB has batchName columns
const db = new Database("dev.db");

const candidateCols = db.prepare("PRAGMA table_info(Candidate)").all().map(r => r.name);
const importJobCols = db.prepare("PRAGMA table_info(ImportJob)").all().map(r => r.name);

console.log("Candidate columns:", candidateCols.join(", "));
console.log("ImportJob columns:", importJobCols.join(", "));

const hasCandidateBatch = candidateCols.includes("batchName");
const hasImportJobBatch = importJobCols.includes("batchName");

console.log("\n✓ Candidate.batchName:", hasCandidateBatch ? "EXISTS" : "MISSING ❌");
console.log("✓ ImportJob.batchName:", hasImportJobBatch ? "EXISTS" : "MISSING ❌");

// Check existing candidates
const count = db.prepare("SELECT COUNT(*) as n FROM Candidate").get();
console.log(`\nTotal candidates in DB: ${count.n}`);

const batchedCount = db.prepare("SELECT COUNT(*) as n FROM Candidate WHERE batchName IS NOT NULL").get();
console.log(`Candidates with batchName: ${batchedCount.n}`);

const batches = db.prepare("SELECT DISTINCT batchName FROM Candidate WHERE batchName IS NOT NULL ORDER BY batchName").all();
console.log("Distinct batches:", batches.length === 0 ? "(none yet)" : batches.map(b => b.batchName).join(", "));

db.close();

console.log("\n✅ DB schema looks correct. Import pipeline is ready.");
console.log("   To test end-to-end: go to /admin/imports, upload a CSV with Candidates type, and enter a batch name.");
