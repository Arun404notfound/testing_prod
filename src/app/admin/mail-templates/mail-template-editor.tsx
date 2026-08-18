"use client";

import { useMemo, useRef, useState } from "react";
import {
  PLACEHOLDER_FIELDS,
  SAMPLE_PREVIEW_LINK,
  SAMPLE_PREVIEW_VARS,
  buildAssignmentEmailHtml,
  renderTemplate,
} from "@/lib/email/template-render";

type Field = "subject" | "body";

export function MailTemplateEditor({
  initialSubject,
  initialBody,
  hasCustomTemplate,
  saveTemplate,
  resetTemplate,
}: {
  initialSubject: string;
  initialBody: string;
  hasCustomTemplate: boolean;
  saveTemplate: (formData: FormData) => Promise<void>;
  resetTemplate: () => Promise<void>;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [activeField, setActiveField] = useState<Field>("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertToken(token: string) {
    const field = activeField === "subject" ? subjectRef.current : bodyRef.current;
    const value = activeField === "subject" ? subject : body;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);

    if (activeField === "subject") setSubject(next);
    else setBody(next);

    requestAnimationFrame(() => {
      field?.focus();
      const pos = start + token.length;
      field?.setSelectionRange(pos, pos);
    });
  }

  const preview = useMemo(() => {
    const previewSubject = renderTemplate(subject, SAMPLE_PREVIEW_VARS);
    const previewHtml = buildAssignmentEmailHtml(
      renderTemplate(body, SAMPLE_PREVIEW_VARS),
      SAMPLE_PREVIEW_LINK
    );
    return { subject: previewSubject, html: previewHtml };
  }, [subject, body]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-[#0F172A]">Assessment invite email</h2>
        <p className="mb-4 text-xs text-[#64748B]">
          Sent to a candidate as soon as an admin assigns them an assessment.
          {!hasCustomTemplate && " Currently using the built-in default — save to customize it."}
        </p>

        <form action={saveTemplate} className="space-y-4">
          <label className="block text-sm font-medium text-[#334155]">
            Subject
            <input
              ref={subjectRef}
              name="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setActiveField("subject")}
              className="tg-input mt-1 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-[#334155]">
            Message
            <textarea
              ref={bodyRef}
              name="bodyText"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setActiveField("body")}
              rows={12}
              className="tg-input mt-1 w-full leading-6"
              placeholder="Write the message the candidate will see..."
            />
          </label>

          <div className="rounded-xl bg-[#F8FAFC] p-3">
            <p className="mb-2 text-xs font-semibold text-[#334155]">
              Insert a placeholder — click to add it where you're typing
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDER_FIELDS.map((p) => (
                <button
                  key={p.token}
                  type="button"
                  title={p.description}
                  onClick={() => insertToken(p.token)}
                  className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition"
                >
                  {p.token}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              You can also just type the @ symbol yourself, e.g. @CandidateName. The "Start Assessment" button and link are added automatically below your message.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="tg-button-primary">Save template</button>
            {hasCustomTemplate && (
              <button
                type="submit"
                formAction={resetTemplate}
                className="text-sm font-medium text-[#64748B] hover:text-rose-600 transition"
              >
                Reset to default
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-[#0F172A]">Preview</h2>
        <p className="mb-4 text-xs text-[#64748B]">Updates as you type, using sample candidate data.</p>

        <div className="rounded-xl border border-[#E2E8F0] p-4">
          <p className="mb-3 border-b border-[#F1F5F9] pb-3 text-sm">
            <span className="font-semibold text-[#334155]">Subject: </span>
            <span className="text-[#0F172A]">{preview.subject}</span>
          </p>
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
        </div>
      </div>
    </div>
  );
}
