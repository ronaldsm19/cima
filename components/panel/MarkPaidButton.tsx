"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { markPaid } from "@/lib/actions/planilla";

/** 30px ghost button that fills brand on hover (README "Falta pagarles" rows). */
export function MarkPaidButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await markPaid([itemId], true);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Pago aplicado.");
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="h-[30px] flex-none rounded-lg border border-control-border bg-surface px-2.5 text-[12px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:border-brand hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:text-ink-faint"
    >
      Marcar pagado
    </button>
  );
}
