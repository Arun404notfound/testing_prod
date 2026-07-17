"use client";

import { useFormStatus } from "react-dom";

export function CreateJobRoleButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tg-button-primary w-fit disabled:opacity-60">
      {pending ? "Creating…" : "Create and start mapping"}
    </button>
  );
}

export function ImportJobRoleButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tg-button-primary w-fit disabled:opacity-60">
      {pending ? "Importing…" : "Import workbook"}
    </button>
  );
}
