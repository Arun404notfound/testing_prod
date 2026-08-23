import Link from "next/link";
import { FormCardLike } from "./mapping-section";
import type { BuilderSearch } from "./page";

const BANDS = ["Developing", "Intermediate", "Proficient", "Expert"] as const;

type BandContent = { band: string; proficiencyDescription: string; behaviouralImplications: string; watchOuts: string };
type Project = { id: string; displayOrder: number; title: string; whatToDo: string; howToDoIt: string; evidence: string };
type SkillCompetency = {
  id: string;
  name: string;
  skillDomainId: string | null;
  description: string | null;
  reportDescription: string | null;
  scoringFormula: string;
  proficiencyScale: string;
  strengthStatement: string | null;
  developmentNeedStatement: string | null;
  bandContents: BandContent[];
  developmentProjects: Project[];
};

type FormAction = (formData: FormData) => void | Promise<void>;

export function ReportSection({
  skillFrameworkId,
  competencies,
  sp,
  updateCompetency,
  updateBandContent,
  upsertProject,
  deleteProject,
}: {
  skillFrameworkId: string;
  competencies: SkillCompetency[];
  sp: BuilderSearch;
  updateCompetency: FormAction;
  updateBandContent: FormAction;
  upsertProject: FormAction;
  deleteProject: FormAction;
}) {
  const selectedCompId = sp.comp && competencies.some((c) => c.id === sp.comp) ? sp.comp : competencies[0]?.id ?? null;
  const selectedComp = competencies.find((c) => c.id === selectedCompId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="tg-card overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
          <h2 className="text-sm font-semibold text-[#0F172A]">Competencies</h2>
        </div>
        <div className="divide-y divide-[#F8FAFC]">
          {competencies.map((c) => (
            <Link
              key={c.id}
              href={`/admin/skill-frameworks/${skillFrameworkId}/builder?tab=content&comp=${c.id}`}
              className={`block px-4 py-3 text-sm ${
                selectedCompId === c.id ? "bg-[#EFF6FF] text-[#2563EB] font-medium" : "text-[#334155] hover:bg-[#F8FAFC]"
              }`}
            >
              {c.name}
            </Link>
          ))}
          {competencies.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[#64748B]">Add competencies in the Mapping tab first.</p>
          )}
        </div>
      </div>

      {selectedComp ? (
        <div className="space-y-6">
          {/* Strength / development-need statements */}
          <FormCardLike title={`${selectedComp.name} — Strength / Development-Need Statements`}>
            <form action={updateCompetency} className="space-y-3">
              <input type="hidden" name="id" value={selectedComp.id} />
              <input type="hidden" name="name" value={selectedComp.name} />
              <input type="hidden" name="skillDomainId" value={selectedComp.skillDomainId ?? ""} />
              <input type="hidden" name="scoringFormula" value={selectedComp.scoringFormula} />
              <input type="hidden" name="proficiencyScale" value={selectedComp.proficiencyScale} />
              <input type="hidden" name="description" value={selectedComp.description ?? ""} />
              <input type="hidden" name="reportDescription" value={selectedComp.reportDescription ?? ""} />
              <label className="text-sm text-[#334155]">
                <span className="mb-1 block font-medium">Strength Statement <span className="font-normal text-[#94A3B8]">(shown when score &gt; 6.5)</span></span>
                <textarea name="strengthStatement" rows={2} defaultValue={selectedComp.strengthStatement ?? ""} className="tg-input w-full" />
              </label>
              <label className="text-sm text-[#334155]">
                <span className="mb-1 block font-medium">Development-Need Statement <span className="font-normal text-[#94A3B8]">(shown when score ≤ 6.5)</span></span>
                <textarea name="developmentNeedStatement" rows={2} defaultValue={selectedComp.developmentNeedStatement ?? ""} className="tg-input w-full" />
              </label>
              <button type="submit" className="tg-button-primary text-sm">Save statements</button>
            </form>
          </FormCardLike>

          {/* Band content */}
          <FormCardLike title={`${selectedComp.name} — Band Content`}>
            <p className="mb-4 text-xs text-[#64748B]">Proficiency description, behavioural implications and watch-outs shown in the report for each band.</p>
            <div className="divide-y divide-[#F1F5F9]">
              {BANDS.map((band) => {
                const content = selectedComp.bandContents.find((b) => b.band === band);
                return (
                  <form key={band} id={`band-${band}`} action={updateBandContent} className="scroll-mt-6 space-y-3 py-4 first:pt-0">
                    <input type="hidden" name="skillCompetencyId" value={selectedComp.id} />
                    <input type="hidden" name="band" value={band} />
                    <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">{band}</p>
                    <label className="text-sm text-[#334155]">
                      <span className="mb-1 block font-medium">Proficiency Description</span>
                      <textarea name="proficiencyDescription" rows={3} defaultValue={content?.proficiencyDescription ?? ""} className="tg-input w-full" />
                    </label>
                    <label className="text-sm text-[#334155]">
                      <span className="mb-1 block font-medium">Behavioural Implications (one per line)</span>
                      <textarea name="behaviouralImplications" rows={3} defaultValue={content?.behaviouralImplications ?? ""} className="tg-input w-full" />
                    </label>
                    <label className="text-sm text-[#334155]">
                      <span className="mb-1 block font-medium">Watch-outs (one per line)</span>
                      <textarea name="watchOuts" rows={3} defaultValue={content?.watchOuts ?? ""} className="tg-input w-full" />
                    </label>
                    <button type="submit" className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4edb]">Save {band}</button>
                  </form>
                );
              })}
            </div>
          </FormCardLike>

          {/* Development projects */}
          <FormCardLike title="On-the-Job Development Projects">
            <div id="development-projects" className="scroll-mt-6 divide-y divide-[#F1F5F9]">
              {selectedComp.developmentProjects.map((p, i) => (
                <div key={p.id} id={`project-${p.id}`} className="scroll-mt-6 space-y-3 py-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">Project {i + 1}</p>
                    <form action={deleteProject}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="skillCompetencyId" value={selectedComp.id} />
                      <button type="submit" className="text-xs text-rose-500 hover:underline">Remove</button>
                    </form>
                  </div>
                  <form action={upsertProject} className="space-y-3">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="skillCompetencyId" value={selectedComp.id} />
                    <input type="hidden" name="displayOrder" value={p.displayOrder} />
                    <label className="text-sm text-[#334155]">
                      <span className="mb-1 block font-medium">Title</span>
                      <input name="title" defaultValue={p.title} className="tg-input w-full" />
                    </label>
                    <label className="text-sm text-[#334155]">
                      <span className="mb-1 block font-medium">What to do</span>
                      <textarea name="whatToDo" rows={2} defaultValue={p.whatToDo} className="tg-input w-full" />
                    </label>
                    <label className="text-sm text-[#334155]">
                      <span className="mb-1 block font-medium">How to do it</span>
                      <textarea name="howToDoIt" rows={2} defaultValue={p.howToDoIt} className="tg-input w-full" />
                    </label>
                    <label className="text-sm text-[#334155]">
                      <span className="mb-1 block font-medium">Evidence</span>
                      <textarea name="evidence" rows={2} defaultValue={p.evidence} className="tg-input w-full" />
                    </label>
                    <button type="submit" className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4edb]">Save Project {i + 1}</button>
                  </form>
                </div>
              ))}

              {/* Add new project */}
              <form action={upsertProject} className="space-y-3 py-4 first:pt-0">
                <input type="hidden" name="skillCompetencyId" value={selectedComp.id} />
                <input type="hidden" name="displayOrder" value={selectedComp.developmentProjects.length} />
                <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Add Project</p>
                <label className="text-sm text-[#334155]">
                  <span className="mb-1 block font-medium">Title</span>
                  <input name="title" className="tg-input w-full" />
                </label>
                <label className="text-sm text-[#334155]">
                  <span className="mb-1 block font-medium">What to do</span>
                  <textarea name="whatToDo" rows={2} className="tg-input w-full" />
                </label>
                <label className="text-sm text-[#334155]">
                  <span className="mb-1 block font-medium">How to do it</span>
                  <textarea name="howToDoIt" rows={2} className="tg-input w-full" />
                </label>
                <label className="text-sm text-[#334155]">
                  <span className="mb-1 block font-medium">Evidence</span>
                  <textarea name="evidence" rows={2} className="tg-input w-full" />
                </label>
                <button type="submit" className="tg-button-primary text-sm">Add Project</button>
              </form>
            </div>
          </FormCardLike>
        </div>
      ) : (
        <div className="tg-card px-5 py-10 text-center text-sm text-[#64748B]">
          Select a competency to edit its report content.
        </div>
      )}
    </div>
  );
}
