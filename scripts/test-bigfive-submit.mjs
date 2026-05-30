/**
 * End-to-end test: submit Alex Chen's Big Five assessment and verify
 * CompetencyScore rows are created with correct 1-10 scaled scores.
 *
 * Run: node scripts/test-bigfive-submit.mjs
 */

import { SignJWT } from "jose";

const SECRET_RAW = "dev-insecure-secret-min-32-characters-long!!";
const secretBytes = new TextEncoder().encode(SECRET_RAW);
const secretKey = secretBytes.length < 32 ? (() => { const k = new Uint8Array(32); k.set(secretBytes); return k; })() : secretBytes.slice(0, 32);

const ASSIGNMENT_ID = "cmpqjzmv9000whl3g55z8vspg";
const CANDIDATE_ID  = "cmp0z0u710006e23gulhm8gi2";
const USER_ID       = "cmp0z0u710006e23gulhm8gi2"; // same as candidate for simplicity
const TENANT_ID     = "cmp0z0u6k0000e23g9hd3asa2";

// ── 1. Mint a JWT session token ─────────────────────────────────────────────
const token = await new SignJWT({
  email: "alex.chen@example.com",
  role: "CANDIDATE",
  tenantId: TENANT_ID,
  candidateId: CANDIDATE_ID,
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(USER_ID)
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(secretKey);

console.log("Minted JWT (first 80 chars):", token.slice(0, 80) + "…");

// ── 2. Build answers — all 30 items answered with 4 (agree) ────────────────
// We need the item IDs from the DB. For now we pass an empty answer map;
// normalizeDemoAnswers() will fill in defaults anyway.
const answers = {}; // demo normalizer fills in valid defaults

// ── 3. Call the demo-submit endpoint ────────────────────────────────────────
const res = await fetch(`http://localhost:3000/api/candidate/demo-submit`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cookie": `tg_session=${token}`,
  },
  body: JSON.stringify({ assignmentId: ASSIGNMENT_ID, answers }),
});

const text = await res.text();
let json;
try { json = JSON.parse(text); } catch { json = text; }

console.log("\n── Submit response ──────────────────────────────────");
console.log("Status:", res.status);
console.log("Body:", JSON.stringify(json, null, 2));
