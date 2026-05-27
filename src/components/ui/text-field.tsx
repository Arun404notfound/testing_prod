function toTitleLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

export function TextField({
  name,
  label = toTitleLabel(name),
  type = "text",
}: {
  name: string;
  label?: string;
  type?: string;
}) {
  return (
    <label className="text-sm text-[#334155]">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        min={type === "number" ? 1 : undefined}
        className="tg-input"
        required
      />
    </label>
  );
}
