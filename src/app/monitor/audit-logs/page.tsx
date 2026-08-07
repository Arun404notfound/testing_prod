import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireSuperAdminForPath } from "@/lib/auth/require-user";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const MONITOR_PATH = "/monitor/audit-logs";
const PAGE_SIZE = 50;

type SearchParams = {
  action?: string;
  actorType?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AuditLogMonitorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSuperAdminForPath(MONITOR_PATH);
  const sp = await searchParams;

  const actionQ = sp.action?.trim() ?? "";
  const actorTypeQ = sp.actorType?.trim() ?? "";
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(actionQ && { action: actionQ }),
    ...(actorTypeQ && { actorType: actorTypeQ }),
    ...(sp.from || sp.to
      ? {
          createdAt: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59.999`) } : {}),
          },
        }
      : {}),
    ...(q && {
      OR: [
        { actorId: { contains: q } },
        { entityId: { contains: q } },
        { message: { contains: q } },
      ],
    }),
  };

  const [logs, total, actionRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(overrides: Partial<SearchParams>) {
    const merged: SearchParams = {
      action: actionQ,
      actorType: actorTypeQ,
      q,
      from: sp.from ?? "",
      to: sp.to ?? "",
      page: String(page),
      ...overrides,
    };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, String(v));
    }
    return `${MONITOR_PATH}?${params.toString()}`;
  }

  const hasFilter = Boolean(actionQ || actorTypeQ || q || sp.from || sp.to);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]">
              <ShieldCheck size={16} className="text-[#2563EB]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Audit Log Monitor</p>
              <p className="text-[11px] text-[#94A3B8]">{session.email}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Audit logs</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Evidence trail of candidate and admin activity — logins, test starts, resumes, and submissions.
            This monitor is not linked anywhere inside the assessment portal itself.
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm" method="get">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B]">Action</label>
            <select name="action" defaultValue={actionQ} className="mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]">
              <option value="">All</option>
              {actionRows.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B]">Actor type</label>
            <select name="actorType" defaultValue={actorTypeQ} className="mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]">
              <option value="">All</option>
              <option value="CANDIDATE">Candidate</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B]">From</label>
            <input
              type="date"
              name="from"
              defaultValue={sp.from ?? ""}
              className="mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B]">To</label>
            <input
              type="date"
              name="to"
              defaultValue={sp.to ?? ""}
              className="mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="block text-[11px] font-semibold text-[#64748B]">Search (actor / entity id / message)</label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="e.g. candidate id, attempt id…"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]"
            />
          </div>
          <button type="submit" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4EDB]">
            Filter
          </button>
          {hasFilter && (
            <Link href={MONITOR_PATH} className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]">
              Clear
            </Link>
          )}
        </form>

        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-[#475569]">
                      {log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                        {log.actorType}
                      </span>
                      {log.actorId && <span className="ml-1.5 font-mono text-[11px] text-[#94A3B8]">{log.actorId}</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{log.action}</td>
                    <td className="px-4 py-3 text-[#475569]">
                      {log.entityType}
                      {log.entityId && <span className="ml-1 font-mono text-[11px] text-[#94A3B8]">{log.entityId}</span>}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{log.message ?? "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#94A3B8]">
                      No log entries match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-[#64748B]">
            <p>
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 hover:bg-[#F8FAFC]">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 hover:bg-[#F8FAFC]">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
