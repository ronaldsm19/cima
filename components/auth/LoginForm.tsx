"use client";

import { AlertTriangle } from "lucide-react";
import { useActionState } from "react";
import { authenticate } from "@/lib/actions/auth";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[12px] font-semibold text-ink-mid">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          placeholder="nombre@morales.cr"
          className="field-focus h-[38px] w-full rounded-[10px] border border-control-border bg-surface px-3 text-[13.5px] text-ink placeholder:text-ink-faint"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[12px] font-semibold text-ink-mid">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field-focus h-[38px] w-full rounded-[10px] border border-control-border bg-surface px-3 text-[13.5px] text-ink"
        />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2.5 text-[12.5px] text-[#8E3323]">
          <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-[38px] rounded-[10px] bg-brand text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
