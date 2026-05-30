"use client";

import type { CSSProperties } from "react";
import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export type QuestionResponseBlock =
  | { kind: "section"; section: string }
  | { kind: "category"; section: string; category: string }
  | {
      kind: "question";
      section: string;
      category: string;
      question: ReportPayload["groupedQuestionReview"][string][number]["items"][number];
    };

export function QuestionResponsesPage({ pageBlocks }: { pageBlocks: QuestionResponseBlock[] }) {
  const { theme } = useReportTheme();
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
        Question response review
      </h3>
      {pageBlocks.map((block, idx) => {
        if (block.kind === "section") {
          return (
            <div
              key={`${block.kind}-${block.section}-${idx}`}
              className="rounded-md border p-4"
              style={{ borderColor: theme.border, breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <h4 className="font-semibold" style={{ color: theme.primary }}>
                {block.section}
              </h4>
            </div>
          );
        }

        if (block.kind === "category") {
          return (
            <p
              key={`${block.kind}-${block.section}-${block.category}-${idx}`}
              className="text-sm font-medium"
              style={{
                color: theme.secondary,
                breakInside: "avoid",
                pageBreakInside: "avoid",
              }}
            >
              {block.category}
            </p>
          );
        }

        const item = block.question;
        const options = Array.isArray(item.options) && item.options.length >= 4 ? item.options : (["—", "—", "—", "—"] as const);
        const selectedOption = typeof item.selectedOption === "number" && Number.isFinite(item.selectedOption) ? item.selectedOption : 0;
        const correctOption = typeof item.correctOption === "number" && Number.isFinite(item.correctOption) ? item.correctOption : 0;
        const isAttempted = selectedOption >= 1 && selectedOption <= 4;
        const borderColor = !isAttempted
          ? theme.border
          : Boolean(item.isCorrect)
            ? theme.correct
            : theme.incorrect;

        return (
          <div
            key={`question-${item.id}-${idx}`}
            className="rounded-md border p-4"
            style={{
              borderColor,
              backgroundColor: theme.subtleBackground,
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            <p className="text-sm font-medium">{item.questionText}</p>
            <div className="mt-2 space-y-1 text-xs">
              {options.map((option, index) => {
                const optionNumber = index + 1;
                const isCorrectOption = optionNumber === correctOption;
                const isSelected = optionNumber === selectedOption;
                const style: CSSProperties = {
                  color: theme.secondary,
                  backgroundColor: "transparent",
                };
                if (isCorrectOption) {
                  style.color = theme.correct;
                  style.backgroundColor = "#ecfdf5";
                }
                if (isSelected && !isCorrectOption) {
                  style.color = theme.incorrect;
                  style.backgroundColor = "#fef2f2";
                }
                return (
                  <div key={`${item.id}-${option}`} className="rounded px-2 py-1" style={style}>
                    {optionNumber}. {option}
                    {isSelected ? "  (Selected)" : ""}
                    {isCorrectOption ? "  (Correct)" : ""}
                  </div>
                );
              })}
            </div>
            <p
              className="mt-2 text-xs font-semibold"
              style={{
                color: !isAttempted ? theme.muted : item.isCorrect ? theme.correct : theme.incorrect,
              }}
            >
              {!isAttempted ? "Unattempted" : item.isCorrect ? "Correct" : "Incorrect"}
            </p>
          </div>
        );
      })}
    </section>
  );
}
