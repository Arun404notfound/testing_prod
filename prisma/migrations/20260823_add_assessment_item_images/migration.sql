-- Adds AssessmentItemImage, a one-to-many table holding up to 3 images per
-- AssessmentItem (question). The existing single AssessmentItem.imageUrl
-- column can't hold more than one image; this table replaces it going
-- forward for question-level media. Purely additive — no existing table or
-- column is modified.

CREATE TABLE "AssessmentItemImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AssessmentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AssessmentItemImage_itemId_idx" ON "AssessmentItemImage"("itemId");
