/**
 * Screenshot the candidate results and admin competency page after Big Five submit.
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";

const RESULT_ID = "cmpqk90w9005lhp3gsrkt8vs1";

// Mint admin JWT
import { SignJWT } from "jose";
const SECRET_RAW = "dev-insecure-secret-min-32-characters-long!!";
const secretBytes = new TextEncoder().encode(SECRET_RAW);
const secretKey = secretBytes.slice(0, 32);

const adminToken = await new SignJWT({
  email: "admin@techgrah.com",
  role: "ADMIN",
  tenantId: "cmp0z0u6k0000e23g9hd3asa2",
  candidateId: null,
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("admin-user-id")
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(secretKey);

// Fetch the report HTML
const reportRes = await fetch(`http://localhost:3000/api/reports/${RESULT_ID}`, {
  headers: { Cookie: `tg_session=${adminToken}` },
});
console.log("Report API status:", reportRes.status);
const reportText = await reportRes.text();
console.log("Report preview (first 500 chars):\n", reportText.slice(0, 500));
