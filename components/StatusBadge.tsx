import { statusLabel } from "@/lib/format";

const TONES: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700",
  sent: "bg-sky-100 text-sky-900",
  accepted: "bg-emerald-100 text-emerald-900",
  declined: "bg-rose-100 text-rose-900",
  expired: "bg-amber-100 text-amber-900",
  partially_supplied: "bg-amber-100 text-amber-950",
  partially_paid: "bg-indigo-100 text-indigo-900",
  paid: "bg-emerald-100 text-emerald-950",
  cancelled: "bg-stone-200 text-stone-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[status] || "bg-stone-100 text-stone-700"}`}>
      {statusLabel(status)}
    </span>
  );
}
