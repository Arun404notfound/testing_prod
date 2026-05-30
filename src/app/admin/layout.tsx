import { AdminAppShell } from "@/components/layout/admin-app-shell";
import { requireAdminSession } from "@/lib/auth/require-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminSession();
  return (
    <AdminAppShell user={{ email: user.email, role: user.role }}>
      {children}
    </AdminAppShell>
  );
}
