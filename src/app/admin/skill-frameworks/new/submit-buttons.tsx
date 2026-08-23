"use client";

import { useFormStatus } from "react-dom";

export function CreateSkillFrameworkButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tg-button-primary w-fit disabled:opacity-60">
      {pending ? "Creating…" : "Create and start mapping"}
    </button>
  );
}
