ALTER TABLE "User" ADD COLUMN "passwordSetAt" DATETIME;
CREATE TABLE "PasswordToken" ("id" TEXT NOT NULL PRIMARY KEY, "tokenHash" TEXT NOT NULL, "purpose" TEXT NOT NULL, "userId" TEXT, "tenantId" TEXT, "batchName" TEXT, "expiresAt" DATETIME NOT NULL, "usedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "PasswordToken_tokenHash_key" ON "PasswordToken"("tokenHash");
CREATE INDEX "PasswordToken_userId_idx" ON "PasswordToken"("userId");
CREATE INDEX "PasswordToken_tenantId_batchName_idx" ON "PasswordToken"("tenantId", "batchName");
CREATE TABLE "PasswordResetRequest" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "tenantId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "reviewedAt" DATETIME, "reviewedBy" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "PasswordResetRequest_tenantId_status_idx" ON "PasswordResetRequest"("tenantId", "status");
CREATE INDEX "PasswordResetRequest_userId_createdAt_idx" ON "PasswordResetRequest"("userId", "createdAt");
