import Link from "next/link";
import { SCORING_FORMULA_LABELS } from "@/lib/scoring/competencyEngine";
import { WeightEditorPanel } from "@/app/admin/competencies/weight-editor-panel";
import type { BuilderSearch } from "./page";

const PROFICIENCY_SCALES: Record<string, string> = {
  GENERIC_5: "Generic 5-band (Exceptional/Strong/Moderate/Developing/Low)",
  MATURITY_4: "Maturity 4-band (Developing/Intermediate/Proficient/Expert)",
};

type SubSkill = { id: string; name: string; skill: { id: string; name: string } };
type SkillCompetencyMap = { id: string; weight: number; subSkill: SubSkill };
type SkillCompetency = {
  id: string;
  name: string;
  skillDomainId: string | null;
  description: string | null;
  reportDescription: string | null;
  scoringFormula: string;
  proficiencyScale: string;
  subSkillMaps: SkillCompetencyMap[];
};
type SkillDomain = { id: string; name: string; description: string | null };

type FormAction = (formData: FormData) => void | Promise<void>;

function hrefFor(skillFrameworkId: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  usp.set("tab", "mapping");
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  return `/admin/skill-frameworks/${skillFrameworkId}/builder?${usp.toString()}`;
}

const chevron = (open: boolean) => (
  <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
);

export function MappingSection({
  skillFrameworkId,
  domains,
  competencies,
  subSkills,
  sp,
  createDomain,
  updateDomain,
  deleteDomain,
  reorderDomain,
  createCompetency,
  updateCompetency,
  deleteCompetency,
  reorderCompetency,
  createMapping,
  deleteMapping,
  bulkUpdateWeights,
}: {
  skillFrameworkId: string;
  domains: SkillDomain[];
  competencies: SkillCompetency[];
  subSkills: SubSkill[];
  sp: BuilderSearch;
  createDomain: FormAction;
  updateDomain: FormAction;
  deleteDomain: FormAction;
  reorderDomain: FormAction;
  createCompetency: FormAction;
  updateCompetency: FormAction;
  deleteCompetency: FormAction;
  reorderCompetency: FormAction;
  createMapping: FormAction;
  deleteMapping: FormAction;
  bulkUpdateWeights: (updates: { id: string; weight: number }[]) => Promise<void>;
}) {
  const openDomainId = sp.openDomain ?? null;
  const openCompId = sp.openComp ?? null;
  const editDomainId = sp.editDomainId ?? null;
  const editCompId = sp.editCompId ?? null;

  const domainless = competencies.filter((c) => !c.skillDomainId);
  const groups = [
    ...domains.map((d) => ({ domain: d as SkillDomain | null, comps: competencies.filter((c) => c.skillDomainId === d.id) })),
    ...(domainless.length > 0 ? [{ domain: null, comps: domainless }] : []),
  ];

  // Group the sub-skill picker options by parent Skill, since SubSkill always belongs to one.
  const subSkillsBySkill = new Map<string, { skillName: string; options: SubSkill[] }>();
  for (const s of subSkills) {
    if (!subSkillsBySkill.has(s.skill.id)) subSkillsBySkill.set(s.skill.id, { skillName: s.skill.name, options: [] });
    subSkillsBySkill.get(s.skill.id)!.options.push(s);
  }

  return (
    <div className="space-y-6">
      {/* Pipeline hint */}
      <p className="tg-body">
        Domain <span className="mx-1 text-[#94A3B8]">→</span> Competency <span className="mx-1 text-[#94A3B8]">→</span> Sub-Skill.
        Click a domain to open it, then a competency to map its sub-skills.
      </p>

      {/* Add domain */}
      <FormCardLike title="Add Domain">
        <form action={createDomain} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Name *</span>
            <input name="name" required placeholder="e.g. Programming Fundamentals" className="tg-input" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
            <input name="description" className="tg-input" />
          </label>
          <button type="submit" className="tg-button-primary text-sm">Add Domain</button>
        </form>
      </FormCardLike>

      {/* Domain -> Competency -> Sub-Skill tree */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="tg-card px-5 py-10 text-center text-sm text-[#64748B]">No domains yet — add one above.</div>
        ) : (
          groups.map((g, gi) => {
            const domain = g.domain;
            const domainId = domain?.id ?? "__none";
            const isOpen = openDomainId === domainId || (!domain && openDomainId === "__none");
            const isEditing = domain && editDomainId === domain.id;

            return (
              <div key={domainId} id={`domain-${domainId}`} className="tg-card overflow-hidden scroll-mt-6">
                {/* Domain row */}
                <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#F0FDF4] to-[#F8FAFC] px-5 py-3.5">
                  <Link
                    href={hrefFor(skillFrameworkId, { openDomain: isOpen ? undefined : domainId })}
                    scroll={false}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {chevron(isOpen)}
                    <span className="font-bold text-[#0F172A]">{domain ? domain.name : "Unassigned (no domain)"}</span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-[#64748B]">
                      {g.comps.length} competenc{g.comps.length === 1 ? "y" : "ies"}
                    </span>
                  </Link>
                  {domain && (
                    <div className="flex shrink-0 items-center gap-3">
                      <ReorderButtons name="direction" action={reorderDomain} hiddenId={domain.id} hiddenOpenDomain={openDomainId} disableUp={gi === 0} disableDown={gi === domains.length - 1} />
                      <Link href={hrefFor(skillFrameworkId, { openDomain: domainId, editDomainId: domain.id })} scroll={false} className="text-xs font-medium text-[#0F766E] hover:underline">Edit</Link>
                      <form action={deleteDomain}>
                        <input type="hidden" name="id" value={domain.id} />
                        <button type="submit" className="text-xs text-rose-500 hover:underline">Delete</button>
                      </form>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div className="border-t border-[#E2E8F0] p-5 space-y-4">
                    {isEditing && domain && (
                      <form action={updateDomain} className="grid gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-[1fr_2fr_auto]">
                        <input type="hidden" name="id" value={domain.id} />
                        <label className="text-sm text-[#334155]">
                          <span className="mb-1 block font-medium">Name *</span>
                          <input name="name" required defaultValue={domain.name} className="tg-input" />
                        </label>
                        <label className="text-sm text-[#334155]">
                          <span className="mb-1 block font-medium">Description</span>
                          <input name="description" defaultValue={domain.description ?? ""} className="tg-input" />
                        </label>
                        <div className="flex items-end gap-2">
                          <button type="submit" className="tg-button-primary text-sm">Save</button>
                          <Link href={hrefFor(skillFrameworkId, { openDomain: domainId })} scroll={false} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</Link>
                        </div>
                      </form>
                    )}

                    {/* Add competency into this domain */}
                    <form action={createCompetency} className="grid gap-3 rounded-lg border border-dashed border-[#CBD5E1] p-4 sm:grid-cols-[2fr_1fr_auto]">
                      <input type="hidden" name="openDomain" value={domainId} />
                      {domain && <input type="hidden" name="skillDomainId" value={domain.id} />}
                      <label className="text-sm text-[#334155]">
                        <span className="mb-1 block font-medium">New competency name</span>
                        <input name="name" required placeholder="e.g. API Design" className="tg-input" />
                      </label>
                      {!domain && (
                        <label className="text-sm text-[#334155]">
                          <span className="mb-1 block font-medium">Domain</span>
                          <select name="skillDomainId" className="tg-input">
                            <option value="">No domain</option>
                            {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </label>
                      )}
                      <div className={domain ? "sm:col-start-3" : ""}>
                        <button type="submit" className="tg-button-primary w-full text-sm">Add Competency</button>
                      </div>
                    </form>

                    {/* Competencies within this domain */}
                    <div className="space-y-2">
                      {g.comps.map((c, ci) => {
                        const compOpen = openCompId === c.id;
                        const compEditing = editCompId === c.id;
                        return (
                          <div key={c.id} id={`comp-${c.id}`} className="rounded-lg border border-[#E2E8F0] scroll-mt-6">
                            <div className="flex items-center justify-between gap-3 bg-[#F8FAFC] px-4 py-2.5">
                              <Link
                                href={hrefFor(skillFrameworkId, { openDomain: domainId, openComp: compOpen ? undefined : c.id })}
                                scroll={false}
                                className="flex min-w-0 flex-1 items-center gap-2"
                              >
                                {chevron(compOpen)}
                                <span className="font-medium text-[#0F172A]">{c.name}</span>
                                <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#2563EB]">
                                  {c.subSkillMaps.length} sub-skill{c.subSkillMaps.length === 1 ? "" : "s"}
                                </span>
                              </Link>
                              <div className="flex shrink-0 items-center gap-3">
                                <ReorderButtons name="direction" action={reorderCompetency} hiddenId={c.id} hiddenDomainId={c.skillDomainId} hiddenOpenDomain={domainId} disableUp={ci === 0} disableDown={ci === g.comps.length - 1} />
                                <Link href={hrefFor(skillFrameworkId, { openDomain: domainId, openComp: c.id, editCompId: c.id })} scroll={false} className="text-xs font-medium text-[#0F766E] hover:underline">Edit</Link>
                                <form action={deleteCompetency}>
                                  <input type="hidden" name="id" value={c.id} />
                                  <input type="hidden" name="openDomain" value={domainId} />
                                  <button type="submit" className="text-xs text-rose-500 hover:underline">Delete</button>
                                </form>
                              </div>
                            </div>

                            {compOpen && (
                              <div className="space-y-4 p-4">
                                {compEditing ? (
                                  <form action={updateCompetency} className="grid gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-2">
                                    <input type="hidden" name="id" value={c.id} />
                                    <input type="hidden" name="openDomain" value={domainId} />
                                    <label className="text-sm text-[#334155]">
                                      <span className="mb-1 block font-medium">Name *</span>
                                      <input name="name" required defaultValue={c.name} className="tg-input" />
                                    </label>
                                    <label className="text-sm text-[#334155]">
                                      <span className="mb-1 block font-medium">Domain</span>
                                      <select name="skillDomainId" defaultValue={c.skillDomainId ?? ""} className="tg-input">
                                        <option value="">No domain</option>
                                        {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                      </select>
                                    </label>
                                    <label className="text-sm text-[#334155]">
                                      <span className="mb-1 block font-medium">Scoring Formula</span>
                                      <select name="scoringFormula" defaultValue={c.scoringFormula} className="tg-input">
                                        {Object.entries(SCORING_FORMULA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                      </select>
                                    </label>
                                    <label className="text-sm text-[#334155]">
                                      <span className="mb-1 block font-medium">Proficiency Scale</span>
                                      <select name="proficiencyScale" defaultValue={c.proficiencyScale} className="tg-input">
                                        {Object.entries(PROFICIENCY_SCALES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                      </select>
                                    </label>
                                    <label className="text-sm text-[#334155] sm:col-span-2">
                                      <span className="mb-1 block font-medium">Internal Description</span>
                                      <input name="description" defaultValue={c.description ?? ""} className="tg-input" />
                                    </label>
                                    <label className="text-sm text-[#334155] sm:col-span-2">
                                      <span className="mb-1 block font-medium">Report Description</span>
                                      <textarea name="reportDescription" rows={2} defaultValue={c.reportDescription ?? ""} className="tg-input w-full" />
                                    </label>
                                    <div className="flex items-center gap-2 sm:col-span-2">
                                      <button type="submit" className="tg-button-primary text-sm">Save</button>
                                      <Link href={hrefFor(skillFrameworkId, { openDomain: domainId, openComp: c.id })} scroll={false} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</Link>
                                    </div>
                                  </form>
                                ) : null}

                                {/* Mapped sub-skills */}
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Mapped Sub-Skills</p>
                                  {c.subSkillMaps.length === 0 ? (
                                    <p className="text-sm text-[#94A3B8]">No sub-skills mapped yet.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {c.subSkillMaps.map((m) => (
                                        <form key={m.id} action={deleteMapping} className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white pl-3 pr-1.5 py-1">
                                          <input type="hidden" name="id" value={m.id} />
                                          <input type="hidden" name="openDomain" value={domainId} />
                                          <input type="hidden" name="openComp" value={c.id} />
                                          <span className="font-mono text-xs font-bold text-[#2563EB]">{m.subSkill.skill.name}</span>
                                          <span className="text-xs text-[#334155]">{m.subSkill.name}</span>
                                          <span className="text-[10px] text-[#94A3B8]">w={m.weight}</span>
                                          <button type="submit" aria-label={`Remove ${m.subSkill.name}`} className="rounded-full px-1.5 text-xs text-rose-500 hover:bg-rose-50">×</button>
                                        </form>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Add sub-skill mapping */}
                                <form action={createMapping} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                                  <input type="hidden" name="skillCompetencyId" value={c.id} />
                                  <input type="hidden" name="openDomain" value={domainId} />
                                  <input type="hidden" name="openComp" value={c.id} />
                                  <label className="text-sm text-[#334155]">
                                    <span className="mb-1 block font-medium">Add sub-skill</span>
                                    <select name="subSkillId" required className="tg-input" defaultValue="">
                                      <option value="" disabled>Select sub-skill...</option>
                                      {Array.from(subSkillsBySkill.values()).map((group) => (
                                        <optgroup key={group.skillName} label={group.skillName}>
                                          {group.options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </optgroup>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="text-sm text-[#334155]">
                                    <span className="mb-1 block font-medium">Weight</span>
                                    <input name="weight" type="number" step="0.1" min="0.1" defaultValue="1.0" className="tg-input" />
                                  </label>
                                  <button type="submit" disabled={subSkills.length === 0} className="tg-button-primary text-sm">Map</button>
                                </form>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {g.comps.length === 0 && (
                        <p className="px-1 text-sm text-[#94A3B8]">No competencies in this domain yet — add one above.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {competencies.length > 0 && (
        <WeightEditorPanel
          competencies={competencies.map((c) => ({
            id: c.id,
            name: c.name,
            mappings: c.subSkillMaps.map((m) => ({ id: m.id, weight: m.weight, attribute: { code: m.subSkill.skill.name, name: m.subSkill.name } })),
          }))}
          bulkUpdateWeights={bulkUpdateWeights}
        />
      )}
    </div>
  );
}

export function FormCardLike({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tg-card overflow-hidden">
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
        <h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ReorderButtons({
  action,
  hiddenId,
  hiddenDomainId,
  hiddenOpenDomain,
  disableUp,
  disableDown,
}: {
  name: string;
  action: FormAction;
  hiddenId: string;
  hiddenDomainId?: string | null;
  hiddenOpenDomain?: string | null;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <form action={action}>
        <input type="hidden" name="id" value={hiddenId} />
        {hiddenDomainId !== undefined && <input type="hidden" name="skillDomainId" value={hiddenDomainId ?? ""} />}
        {hiddenOpenDomain != null && <input type="hidden" name="openDomain" value={hiddenOpenDomain} />}
        <input type="hidden" name="direction" value="up" />
        <button type="submit" disabled={disableUp} className="rounded px-1 text-xs text-[#64748B] hover:bg-white disabled:opacity-30">▲</button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={hiddenId} />
        {hiddenDomainId !== undefined && <input type="hidden" name="skillDomainId" value={hiddenDomainId ?? ""} />}
        {hiddenOpenDomain != null && <input type="hidden" name="openDomain" value={hiddenOpenDomain} />}
        <input type="hidden" name="direction" value="down" />
        <button type="submit" disabled={disableDown} className="rounded px-1 text-xs text-[#64748B] hover:bg-white disabled:opacity-30">▼</button>
      </form>
    </div>
  );
}
