"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { appUrl } from "@/lib/app-url";
import { generateAccessToken, sendAssignmentAssignedEmail } from "@/lib/email/assignment-email";

export type QuickAssignState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export async function quickAssignAction(
  _prevState: QuickAssignState,
  formData: FormData
): Promise<QuickAssignState> {
  const mode = String(formData.get("mode") ?? "individual");
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!assessmentId) return { status: "error", message: "Missing assessment." };

  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const durationRaw = parseInt(String(formData.get("durationMinutes") ?? ""), 10);
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const durationMinutes = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null;

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, lifecycleStatus: "published" },
    select: { id: true, title: true },
  });
  if (!assessment) return { status: "error", message: "Assessment not found or not published." };

  const tenantId = await getDefaultTenantId();

  if (mode === "batch") {
    const batchNames = formData.getAll("batchName").map((v) => String(v).trim()).filter(Boolean);
    if (!batchNames.length) return { status: "error", message: "Select at least one batch." };

    const candidates = await prisma.candidate.findMany({
      where: { tenantId, batchName: { in: batchNames } },
      select: { id: true, fullName: true, email: true },
    });
    if (candidates.length === 0) return { status: "error", message: "No candidates found in the selected batch(es)." };

    let created = 0;
    let emailFailures = 0;
    for (const candidate of candidates) {
      const existing = await prisma.assessmentAssignment.findFirst({
        where: {
          candidateId: candidate.id,
          assessmentId,
          status: "assigned",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (!existing) {
        const accessToken = generateAccessToken();
        const assignment = await prisma.assessmentAssignment.create({
          data: { candidateId: candidate.id, assessmentId, accessToken, status: "assigned", expiresAt, durationMinutes },
        });
        created++;
        const emailResult = await sendAssignmentAssignedEmail({
          tenantId,
          candidateEmail: candidate.email,
          candidateName: candidate.fullName,
          assessmentTitle: assessment.title,
          link: appUrl(`/candidate/test/${assignment.id}?token=${accessToken}`),
          durationMinutes,
          expiresAt,
        });
        if (!emailResult.ok) emailFailures++;
      }
    }

    revalidatePath("/admin/assignments");
    revalidatePath("/admin/dashboard");

    const label = batchNames.length > 1 ? `${batchNames.length} batches` : batchNames[0];
    return {
      status: "success",
      message: `"${assessment.title}" has been assigned to ${label} (${created} of ${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}, duplicates skipped).` +
        (emailFailures > 0 ? ` ${emailFailures} notification email${emailFailures !== 1 ? "s" : ""} failed to send.` : ""),
    };
  }

  const candidateId = String(formData.get("candidateId") ?? "").trim();
  if (!candidateId) return { status: "error", message: "Select a candidate." };

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, tenantId },
    select: { id: true, fullName: true, email: true },
  });
  if (!candidate) return { status: "error", message: "Candidate not found." };

  const existing = await prisma.assessmentAssignment.findFirst({
    where: {
      candidateId,
      assessmentId,
      status: "assigned",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (existing) {
    return { status: "error", message: "This candidate already has an active assignment for that assessment." };
  }

  const accessToken = generateAccessToken();
  const assignment = await prisma.assessmentAssignment.create({
    data: { candidateId, assessmentId, accessToken, status: "assigned", expiresAt, durationMinutes },
  });

  const emailResult = await sendAssignmentAssignedEmail({
    tenantId,
    candidateEmail: candidate.email,
    candidateName: candidate.fullName,
    assessmentTitle: assessment.title,
    link: appUrl(`/candidate/test/${assignment.id}?token=${accessToken}`),
    durationMinutes,
    expiresAt,
  });

  revalidatePath("/admin/assignments");
  revalidatePath("/admin/dashboard");

  return {
    status: "success",
    message: `"${assessment.title}" has been assigned to ${candidate.fullName}.` +
      (emailResult.ok ? "" : " (Notification email failed to send.)"),
  };
}
