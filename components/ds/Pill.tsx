export type PillTone = "pagado" | "pendiente" | "vencido" | "neutro";

const TONES: Record<PillTone, string> = {
  pagado: "bg-ok-tint text-ok-text",
  pendiente: "bg-warn-tint text-warn-text",
  vencido: "bg-bad-tint text-bad-text",
  neutro: "bg-[#EDF2EF] text-[#4A6B5C]",
};

/** Estado pill per README: 23px tall, radius 99, 11.5/700, capitalize.
 *  gap is explicit — a lone whitespace text node doesn't render in flex. */
export function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-[23px] items-center gap-1 rounded-full px-2.5 text-[11.5px] font-bold capitalize ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
