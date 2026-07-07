import { CandidateAppShell } from "@/components/layout/candidate-app-shell";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <CandidateAppShell>{children}</CandidateAppShell>;
}
