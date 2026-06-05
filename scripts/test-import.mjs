import { readFileSync, writeFileSync } from "fs";

// Create a test CSV
const csv = `fullname,email,mobile,employeeid,designation,department,location
Import Test User,importtest_${Date.now()}@example.com,9876543210,EMP_TEST_01,Test Engineer,QA,Mumbai
`;

writeFileSync("scripts/test-candidates.csv", csv);
console.log("Test CSV created: scripts/test-candidates.csv");
console.log("Contents:\n", csv);
