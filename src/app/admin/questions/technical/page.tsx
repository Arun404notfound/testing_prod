import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Layers, Trash2, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { createOpenEndedItem, deleteOpenEndedItem, updateOpenEndedSkill } from "@/lib/questions/openEndedActions";
import { collectOptionImage, collectQuestionAudio, collectQuestionImages } from "@/lib/question-media-upload";
import { QuestionAudioField, QuestionImagesField, OptionImageField } from "@/components/admin/media-upload-fields";
import { AddQuestionMenu } from "../add-question-menu";

const BASE_PATH = "/admin/questions/technical";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function nextBankItemDisplayOrder(): Promise<number> {
  const agg = await prisma.assessmentItem.aggregate({
    where: { sectionId: null },
    _max: { displayOrder: true },
  });
  return (agg._max.displayOrder ?? 0) + 1;
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function createTechnicalMcqItem(formData: FormData) {
  "use server";
  const prompt = String(formData.get("prompt") ?? "").trim();
  const itemType = String(formData.get("itemType") ?? "MCQ_SINGLE") === "MCQ_MULTIPLE" ? "MCQ_MULTIPLE" : "MCQ_SINGLE";
  const skillId = String(formData.get("skillId") ?? "").trim() || null;
  const subSkillId = String(formData.get("subSkillId") ?? "").trim() || null;
  const weightageRaw = parseFloat(String(formData.get("weightage") ?? "1"));
  const weightage = Number.isFinite(weightageRaw) && weightageRaw > 0 ? weightageRaw : 1;

  const rawOpts = await Promise.all(
    [1, 2, 3, 4].map(async (n) => ({
      label: String(formData.get(`opt${n}_label`) ?? "").trim(),
      isCorrect: formData.get(`opt${n}_correct`) === "on",
      imageUrl: await collectOptionImage(formData, `img_opt${n}`),
    })),
  );
  // An option counts even with no text label as long as it has an image (e.g. a graph-based choice).
  const opts = rawOpts.filter((o) => o.label || o.imageUrl);

  const correctCount = opts.filter((o) => o.isCorrect).length;
  const valid = prompt && opts.length >= 2 && correctCount >= 1 && (itemType === "MCQ_MULTIPLE" || correctCount === 1);
  if (!valid) redirect(`${BASE_PATH}?tab=mcq&status=error&reason=missing`);

  const images = await collectQuestionImages(formData);
  const audioUrl = await collectQuestionAudio(formData);

  const displayOrder = await nextBankItemDisplayOrder();
  try {
    await prisma.assessmentItem.create({
      data: {
        itemType,
        prompt,
        skillId,
        subSkillId,
        weightage,
        displayOrder,
        audioUrl,
        images: images.length > 0 ? { create: images.map((url, i) => ({ url, displayOrder: i })) } : undefined,
        options: {
          create: opts.map((o, i) => ({
            label: o.label,
            value: o.label || `Option ${i + 1}`,
            displayOrder: i,
            isCorrect: o.isCorrect,
            imageUrl: o.imageUrl,
          })),
        },
      },
    });
  } catch {
    redirect(`${BASE_PATH}?tab=mcq&status=error&reason=db`);
  }
  redirect(`${BASE_PATH}?tab=mcq&status=success`);
}

async function deleteTechnicalMcqItem(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.assessmentItem.delete({ where: { id } }).catch(() => {});
  redirect(`${BASE_PATH}?tab=mcq`);
}

async function updateTechnicalMcqSkill(formData: FormData) {
  "use server";
  const itemId = String(formData.get("itemId") ?? "").trim();
  const skillId = String(formData.get("skillId") ?? "").trim() || null;
  const subSkillId = String(formData.get("subSkillId") ?? "").trim() || null;
  if (!itemId) redirect(`${BASE_PATH}?tab=mcq`);
  await prisma.assessmentItem.update({ where: { id: itemId }, data: { skillId, subSkillId } }).catch(() => {});
  redirect(`${BASE_PATH}?tab=mcq&status=success`);
}

const boundCreateOpenEndedItem = createOpenEndedItem.bind(null, BASE_PATH);
const boundDeleteOpenEndedItem = deleteOpenEndedItem.bind(null, BASE_PATH);
const boundUpdateOpenEndedSkill = updateOpenEndedSkill.bind(null, BASE_PATH);

// ─── Shared styles ────────────────────────────────────────────────────────────

const card = "rounded-xl border border-[#E2E8F0] bg-white overflow-hidden";
const cardHeader = "border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3";
const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none";
const selectCls = "w-full rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs text-[#334155] focus:border-[#2563EB] focus:outline-none";
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

export default async function TechnicalQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; reason?: string; addMcq?: string; addOpenEnded?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "mcq";
  const addMcqOpen = sp.addMcq === "1";
  const addOpenEndedOpen = sp.addOpenEnded === "1";
  const tenantId = await getDefaultTenantId();

  const [mcqItems, openEndedItems, skills, skillCompetencies] = await Promise.all([
    prisma.assessmentItem.findMany({
      where: { itemType: { in: ["MCQ_SINGLE", "MCQ_MULTIPLE"] }, caseStudyId: null, attributeId: null },
      include: { options: { orderBy: { displayOrder: "asc" } }, skill: true, subSkill: true, images: { orderBy: { displayOrder: "asc" } } },
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
    prisma.skillCompetency.findMany({
      where: { tenantId },
      include: { subSkillMaps: { include: { subSkill: { include: { skill: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const tabs = [
    { id: "mcq", label: `Technical MCQ (${mcqItems.length})` },
    { id: "open_ended", label: `Open-Ended (${openEndedItems.length})` },
    { id: "chain", label: "Skill Chain" },
  ];

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Technical Questions"
        subtitle="MCQ (single/multiple-correct) and open-ended questions for the Technical module, tagged to Skill/Sub-Skill instead of Attribute."
        right={
          <AddQuestionMenu
            options={[
              { label: "Technical MCQ", description: "Single or multiple-correct, Skill-tagged", href: `${BASE_PATH}?tab=mcq&addMcq=1` },
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Technical MCQ", value: mcqItems.length, icon: CheckCircle2, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
          { label: "Open-Ended", value: openEndedItems.length, icon: Layers, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Skills", value: skills.length, sub: `${skills.reduce((n, s) => n + s.subSkills.length, 0)} sub-skills`, icon: Wrench, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Skill Competencies", value: skillCompetencies.length, icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50" },
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
        Manage the Skill/Sub-Skill taxonomy at <Link href="/admin/skills" className="text-[#0F766E] hover:underline">Skills</Link>, and the Domain → Competency → Sub-Skill scoring framework at{" "}
        <Link href="/admin/skill-frameworks" className="text-[#0F766E] hover:underline">Skill Frameworks</Link>.
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

      {/* ── TECHNICAL MCQ TAB ────────────────────────────────────────────────── */}
      {tab === "mcq" && (
        <div className="space-y-4">
          {addMcqOpen && (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Add New Technical MCQ</p>
                  <p className="text-[11px] text-[#64748B]">Choose Single-correct or Multiple-correct, then check the option(s) that are right.</p>
                </div>
                <Link href={`${BASE_PATH}?tab=mcq`} className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <form action={createTechnicalMcqItem} className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Question *</label>
                  <input name="prompt" required placeholder="e.g. Which of the following are valid HTTP methods?" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Type *</label>
                  <select name="itemType" className={inputCls}>
                    <option value="MCQ_SINGLE">Single-correct</option>
                    <option value="MCQ_MULTIPLE">Multiple-correct</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Weightage</label>
                  <input name="weightage" type="number" step="0.1" min="0.1" defaultValue="1.0" className={inputCls} />
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
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-[#475569]">Option {n} <span className="font-normal text-[#94A3B8]">(text and/or image — e.g. a graph)</span></label>
                        <input name={`opt${n}_label`} placeholder={`Option ${n}`} className={inputCls} />
                      </div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs text-[#475569]">
                        <input type="checkbox" name={`opt${n}_correct`} className="rounded border-slate-300" /> Correct
                      </label>
                    </div>
                    <OptionImageField name={`img_opt${n}`} />
                  </div>
                ))}
                <div className="sm:col-span-2 flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href={`${BASE_PATH}?tab=mcq`} className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4edb]">
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={card}>
            <div className={cardHeader}>
              <p className="text-sm font-semibold text-[#0F172A]">Technical MCQ Questions</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Single or multiple-correct, Skill/Sub-Skill tagged. Attach these to a Technical assessment from its builder page.</p>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {mcqItems.map((item, idx) => (
                <div key={item.id} className="px-5 py-4 sm:flex sm:items-start sm:gap-4">
                  <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0F172A] leading-snug">{item.prompt}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#D1FAE5] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                        {item.itemType === "MCQ_MULTIPLE" ? "Multiple-correct" : "Single-correct"}
                      </span>
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
                    {item.images.length > 0 && (
                      <div className="mt-2 flex gap-1.5">
                        {item.images.map((img) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={img.id} src={img.url} alt="" className="h-12 w-12 rounded border border-[#E2E8F0] object-cover" />
                        ))}
                      </div>
                    )}
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {item.options.map((opt, oi) => (
                        <div key={opt.id} className={`flex items-start gap-1.5 text-xs ${opt.isCorrect ? "font-semibold text-emerald-700" : "text-[#475569]"}`}>
                          <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${opt.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={opt.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded border border-[#E2E8F0] object-cover" />
                          )}
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                    <form key={item.subSkillId ?? "none"} action={updateTechnicalMcqSkill} className="flex flex-1 items-center gap-2">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="skillId" value={item.skillId ?? ""} />
                      <SkillPicker skills={skills} name="subSkillId" defaultValue={item.subSkillId ?? ""} />
                      <button type="submit" className={saveBtnCls}>Save</button>
                    </form>
                    <form action={deleteTechnicalMcqItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {mcqItems.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-[#64748B]">No Technical MCQ questions yet. Add one above.</p>
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
                  <input name="prompt" required placeholder="e.g. Describe how you would design a rate limiter for a public API." className={inputCls} />
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Weightage</label>
                  <input name="weightage" type="number" step="0.1" min="0.1" defaultValue="1.0" className={inputCls} />
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

      {/* ── SKILL CHAIN TAB ──────────────────────────────────────────────────── */}
      {tab === "chain" && (
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">Full scoring flow — from question → sub-skill → skill competency → score via formula.</p>
          {skillCompetencies.map((comp) => {
            const subSkillIds = new Set(comp.subSkillMaps.map((m) => m.subSkillId));
            const mcqForComp = mcqItems.filter((i) => i.subSkillId && subSkillIds.has(i.subSkillId));
            const openEndedForComp = openEndedItems.filter((i) => i.subSkillId && subSkillIds.has(i.subSkillId));
            return (
              <div key={comp.id} className={card}>
                <div className="border-b border-[#E2E8F0] bg-gradient-to-r from-[#EFF6FF] to-white px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-[#0F172A]">{comp.name}</p>
                      {comp.description && <p className="mt-0.5 text-xs text-[#64748B]">{comp.description}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">{comp.subSkillMaps.length} sub-skills</span>
                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] text-[#475569]">Formula: {comp.scoringFormula.replace("_", " ")}</span>
                      <Link href="/admin/skill-frameworks" className="text-[11px] text-[#0F766E] hover:underline">Edit formula →</Link>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-[#F8FAFC]">
                  {comp.subSkillMaps.map((map) => {
                    const sub = map.subSkill;
                    const mcqForSub = mcqForComp.filter((i) => i.subSkillId === sub.id);
                    const openEndedForSub = openEndedForComp.filter((i) => i.subSkillId === sub.id);
                    const total = mcqForSub.length + openEndedForSub.length;
                    return (
                      <div key={map.id} className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-purple-600">[{sub.skill.name}]</span>
                          <span className="text-sm font-semibold text-[#0F172A]">{sub.name}</span>
                          <span className="ml-auto rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#475569]">w:{map.weight}</span>
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-[#2563EB]">{total} questions</span>
                        </div>
                        {total === 0 && <p className="ml-8 mt-1 text-xs text-amber-600">⚠ No questions linked to this sub-skill yet.</p>}
                      </div>
                    );
                  })}
                  {comp.subSkillMaps.length === 0 && (
                    <div className="px-5 py-4 text-sm text-amber-600">⚠ No sub-skills mapped. <Link href="/admin/skill-frameworks" className="underline">Add mappings →</Link></div>
                  )}
                </div>
              </div>
            );
          })}
          {skillCompetencies.length === 0 && (
            <div className={`${card} px-5 py-10 text-center`}>
              <p className="text-sm text-[#64748B]">No skill competencies yet.</p>
              <Link href="/admin/skill-frameworks" className="mt-3 inline-block text-sm font-medium text-[#0F766E] hover:underline">Set up a Skill Framework →</Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
