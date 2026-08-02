"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClientModal } from "@/components/clientes/ClientModal";

export function ClientChips({
  clients,
  activeId,
  canCrud,
}: {
  clients: { id: string; nombre: string }[];
  activeId: string | null;
  canCrud: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {clients.map((c) => (
        <Link
          key={c.id}
          href={`/clientes/${c.id}`}
          className={`flex h-8 items-center rounded-full px-[13px] text-[12.5px] font-semibold transition-colors duration-[140ms] ${
            c.id === activeId
              ? "bg-brand text-white"
              : "border border-[#E0E6DF] bg-surface text-ink-strong hover:border-[#C6D0C7]"
          }`}
        >
          {c.nombre}
        </Link>
      ))}
      {canCrud ? (
        <button
          type="button"
          onClick={() => setModal(true)}
          className="flex h-8 items-center gap-1 rounded-full border border-dashed border-[#B9C7BD] px-[13px] text-[12.5px] font-semibold text-brand transition-colors duration-[140ms] hover:bg-brand-tint"
        >
          <Plus size={13} strokeWidth={2.2} aria-hidden /> Agregar cliente
        </button>
      ) : null}
      {modal ? (
        <ClientModal onClose={() => setModal(false)} onSaved={(id) => router.push(`/clientes/${id}`)} />
      ) : null}
    </div>
  );
}
