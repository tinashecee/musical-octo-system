export function Banner({ tone, children }: { tone: "error" | "ok" | "info"; children: React.ReactNode }) {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-950"
      : tone === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : "border-amber-200 bg-amber-50 text-amber-950";
  return <div className={`rounded-lg border px-3 py-2 text-sm ${toneClass}`}>{children}</div>;
}
