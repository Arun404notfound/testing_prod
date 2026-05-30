import { CandidateAppShell } from "@/components/layout/candidate-app-shell";
import { requireCandidateRoleSession } from "@/lib/auth/require-user";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCandidateRoleSession();
  return <CandidateAppShell email={user.email}>{children}</CandidateAppShell>;
}
