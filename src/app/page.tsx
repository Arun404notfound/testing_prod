import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/require-user";

export default async function HomePage() {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "CANDIDATE") {
    redirect("/candidate");
  }
  redirect("/admin/dashboard");
}
