import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, ListChecks, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { createOpenEndedItem, deleteOpenEndedItem, updateOpenEndedSkill } from "@/lib/questions/openEndedActions";
import { collectQuestionAudio, collectQuestionImages } from "@/lib/question-media-upload";
import { QuestionAudioField, QuestionImagesField } from "@/components/admin/media-upload-fields";
import { AddQuestionMenu } from "../add-question-menu";

const BASE_PATH = "/admin/questions/survey";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function nextBankItemDisplayOrder(): Promise<number> {
  const agg = await prisma.assessmentItem.aggregate({
    where: { sectionId: null },
    _max: { displayOrder: true },
  });
  return (agg._max.displayOrder ?? 0) + 1;
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function createSurveyLikertItem(formData: FormData) {
  "use server";
  const prompt = String(formData.get("prompt") ?? "").trim();
  const minValue = parseInt(String(formData.get("minValue") ?? "1"), 10);
  const maxValue = parseInt(String(formData.get("maxValue") ?? "5"), 10);
  const minLabel = String(formData.get("minLabel") ?? "").trim() || "Strongly Disagree";
  const maxLabel = String(formData.get("maxLabel") ?? "").trim() || "Strongly Agree";
  const skillId = String(formData.get("skillId") ?? "").trim() || null;
  const subSkillId = String(formData.get("subSkillId") ?? "").trim() || null;
  const weightageRaw = parseFloat(String(formData.get("weightage") ?? "1"));
  const weightage = Number.isFinite(weightageRaw) && weightageRaw > 0 ? weightageRaw : 1;

  if (!prompt || !Number.isInteger(minValue) || !Number.isInteger(maxValue) || maxValue <= minValue) {
    redirect(`${BASE_PATH}?tab=likert&status=error&reason=missing`);
  }

  const images = await collectQuestionImages(formData);
  const audioUrl = await collectQuestionAudio(formData);

  const displayOrder = await nextBankItemDisplayOrder();
  try {
    const scaleName = `Survey ${minValue}-${maxValue}`;
    const scale = await prisma.likertScale.upsert({
      where: { name_minValue_maxValue: { name: scaleName, minValue, maxValue } },
      create: { name: scaleName, minValue, maxValue, minLabel, maxLabel },
      update: { minLabel, maxLabel },
    });
    await prisma.assessmentItem.create({
      data: {
        itemType: "LIKERT", prompt, skillId, subSkillId, weightage, likertScaleId: scale.id, displayOrder, audioUrl,
        images: images.length > 0 ? { create: images.map((url, i) => ({ url, displayOrder: i })) } : undefined,
      },
    });
  } catch {
    redirect(`${BASE_PATH}?tab=likert&status=error&reason=db`);
  }
  redirect(`${BASE_PATH}?tab=likert&status=success`);
}

async function deleteSurveyLikertItem(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.assessmentItem.delete({ where: { id } }).catch(() => {});
  redirect(`${BASE_PATH}?tab=likert`);
}

async function updateSurveyLikertSkill(formData: FormData) {
  "use server";
  const itemId = String(formData.get("itemId") ?? "").trim();
  const skillId = String(formData.get("skillId") ?? "").trim() || null;
  const subSkillId = String(formData.get("subSkillId") ?? "").trim() || null;
  if (!itemId) redirect(`${BASE_PATH}?tab=likert`);
  await prisma.assessmentItem.update({ where: { id: itemId }, data: { skillId, subSkillId } }).catch(() => {});
  redirect(`${BASE_PATH}?tab=likert&status=success`);
}

const boundCreateOpenEndedItem = createOpenEndedItem.bind(null, BASE_PATH);
const boundDeleteOpenEndedItem = deleteOpenEndedItem.bind(null, BASE_PATH);
const boundUpdateOpenEndedSkill = updateOpenEndedSkill.bind(null, BASE_PATH);

// ─── Shared styles ────────────────────────────────────────────────────────────

const card = "rounded-xl border border-[#E2E8F0] bg-white overflow-hidden";
const cardHeader = "border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3";
const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none";
const saveBtnCls = "rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4edb] transition shrink-0";

type Skill = { id: string; name: string; subSkills: { id: string; name: string }[] };

function SkillPicker({ skills, name, defaultValue }: { skills: Skill[]; name: string; defaultValue: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className={inputCls}>
      <option value="">— No sub-skill —</option>
      {skills.map((s) => (
        <optgroup key={s.id} label={s.name}>
          {s.subSkills.map((sub) => (
            <option key={sub.id} value={sub.id}>{sub.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SurveyQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; reason?: string; addLikert?: string; addOpenEnded?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "likert";
  const addLikertOpen = sp.addLikert === "1";
  const addOpenEndedOpen = sp.addOpenEnded === "1";
  const tenantId = await getDefaultTenantId();

  const [likertItems, openEndedItems, skills] = await Promise.all([
    prisma.assessmentItem.findMany({
      where: { itemType: "LIKERT", skillId: { not: null } },
      include: { likertScale: true, skill: true, subSkill: true, images: { orderBy: { displayOrder: "asc" } } },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.assessmentItem.findMany({
      where: { itemType: "OPEN_ENDED" },
      include: { skill: true, subSkill: true, images: { orderBy: { displayOrder: "asc" } } },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.skill.findMany({
      where: { tenantId },
      include: { subSkills: { orderBy: { displayOrder: "asc" } } },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const tabs = [
    { id: "likert", label: `Survey Likert (${likertItems.length})` },
    { id: "open_ended", label: `Open-Ended (${openEndedItems.length})` },
  ];

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Survey Questions"
        subtitle="Likert-based questions with configurable response options, plus open-ended questions, for the Survey module."
        right={
          <AddQuestionMenu
            options={[
              { label: "Survey Likert", description: "Configurable response scale", href: `${BASE_PATH}?tab=likert&addLikert=1` },
              { label: "Open-Ended", description: "Free-text response, unscored", href: `${BASE_PATH}?tab=open_ended&addOpenEnded=1` },
            ]}
          />
        }
      />

      {sp.status === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ Saved successfully.</div>
      )}
      {sp.status === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {sp.reason === "missing" ? "Please fill in all required fields." : "Something went wrong — please try again."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Survey Likert", value: likertItems.length, icon: ListChecks, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
          { label: "Open-Ended", value: openEndedItems.length, icon: Layers, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Skills", value: skills.length, sub: `${skills.reduce((n, s) => n + s.subSkills.length, 0)} sub-skills`, icon: ListChecks, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-xs font-semibold text-[#334155]">{s.label}</p>
              {"sub" in s && s.sub && <p className="mt-0.5 text-[11px] text-[#94A3B8]">{s.sub}</p>}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#94A3B8]">
        Manage the Skill/Sub-Skill taxonomy at <Link href="/admin/skills" className="text-[#0F766E] hover:underline">Skills</Link>.
      </p>

      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <Link key={t.id} href={`${BASE_PATH}?tab=${t.id}`}
              className={`border-b-2 pb-2.5 text-sm font-medium transition-colors ${tab === t.id ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#334155]"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── SURVEY LIKERT TAB ────────────────────────────────────────────────── */}
      {tab === "likert" && (
        <div className="space-y-4">
          {addLikertOpen && (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Add New Survey Likert Question</p>
                  <p className="text-[11px] text-[#64748B]">Configure the response scale — point count and end labels — per question.</p>
                </div>
                <Link href={`${BASE_PATH}?tab=likert`} className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <form action={createSurveyLikertItem} className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Question / Statement *</label>
                  <input name="prompt" required placeholder="e.g. How satisfied are you with the tools provided for your role?" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Scale min value</label>
                  <input name="minValue" type="number" defaultValue="1" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Scale max value</label>
                  <input name="maxValue" type="number" defaultValue="5" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Min-end label</label>
                  <input name="minLabel" placeholder="e.g. Strongly Disagree" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Max-end label</label>
                  <input name="maxLabel" placeholder="e.g. Strongly Agree" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Skill</label>
                  <select name="skillId" defaultValue="" className={inputCls}>
                    <option value="">— No skill —</option>
                    {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Sub-Skill</label>
                  <SkillPicker skills={skills} name="subSkillId" defaultValue="" />
                </div>
                <div className="sm:col-span-2 grid gap-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:grid-cols-2">
                  <QuestionImagesField namePrefix="img" max={3} />
                  <QuestionAudioField name="audio" />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href={`${BASE_PATH}?tab=likert`} className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4edb]">
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={card}>
            <div className={cardHeader}>
              <p className="text-sm font-semibold text-[#0F172A]">Survey Likert Questions</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Each question can have its own response scale and end labels.</p>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {likertItems.map((item, idx) => (
                <div key={item.id} className="px-5 py-4 sm:flex sm:items-start sm:gap-4">
                  <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0F172A] leading-snug">{item.prompt}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {item.likertScale && (
                        <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                          {item.likertScale.minValue}–{item.likertScale.maxValue}: {item.likertScale.minLabel} → {item.likertScale.maxLabel}
                        </span>
                      )}
                      {item.subSkill && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                          {item.skill?.name}: {item.subSkill.name}
                        </span>
                      )}
                      {item.images.length > 0 && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">🖼 {item.images.length}</span>
                      )}
                      {item.audioUrl && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">🔊 audio</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                    <form key={item.subSkillId ?? "none"} action={updateSurveyLikertSkill} className="flex flex-1 items-center gap-2">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="skillId" value={item.skillId ?? ""} />
                      <SkillPicker skills={skills} name="subSkillId" defaultValue={item.subSkillId ?? ""} />
                      <button type="submit" className={saveBtnCls}>Save</button>
                    </form>
                    <form action={deleteSurveyLikertItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {likertItems.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-[#64748B]">No Survey Likert questions yet. Add one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── OPEN-ENDED TAB ───────────────────────────────────────────────────── */}
      {tab === "open_ended" && (
        <div className="space-y-4">
          {addOpenEndedOpen && (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <p className="text-sm font-semibold text-[#0F172A]">Add New Open-Ended Question</p>
                <Link href={`${BASE_PATH}?tab=open_ended`} className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <form action={boundCreateOpenEndedItem} className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Question *</label>
                  <input name="prompt" required placeholder="e.g. What would most improve your day-to-day experience here?" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Help text (optional)</label>
                  <input name="helpText" placeholder="Guidance shown under the question to the candidate." className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Skill</label>
                  <select name="skillId" defaultValue="" className={inputCls}>
                    <option value="">— No skill —</option>
                    {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Sub-Skill</label>
                  <SkillPicker skills={skills} name="subSkillId" defaultValue="" />
                </div>
                <div className="sm:col-span-2 grid gap-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:grid-cols-2">
                  <QuestionImagesField namePrefix="img" max={3} />
                  <QuestionAudioField name="audio" />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href={`${BASE_PATH}?tab=open_ended`} className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700">
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={card}>
            <div className={cardHeader}>
              <p className="text-sm font-semibold text-[#0F172A]">Open-Ended Questions</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Free-text response — unscored for now, shown for human review.</p>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {openEndedItems.map((item, idx) => (
                <div key={item.id} className="px-5 py-4 sm:flex sm:items-start sm:gap-4">
                  <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0F172A] leading-snug">{item.prompt}</p>
                    {item.helpText && <p className="mt-1 text-xs text-[#94A3B8]">{item.helpText}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {item.subSkill && (
                        <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                          {item.skill?.name}: {item.subSkill.name}
                        </span>
                      )}
                      {item.images.length > 0 && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">🖼 {item.images.length}</span>
                      )}
                      {item.audioUrl && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">🔊 audio</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                    <form key={item.subSkillId ?? "none"} action={boundUpdateOpenEndedSkill} className="flex flex-1 items-center gap-2">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="skillId" value={item.skillId ?? ""} />
                      <SkillPicker skills={skills} name="subSkillId" defaultValue={item.subSkillId ?? ""} />
                      <button type="submit" className={saveBtnCls}>Save</button>
                    </form>
                    <form action={boundDeleteOpenEndedItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {openEndedItems.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-[#64748B]">No open-ended questions yet. Add one above.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
