import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { auth } from "@/lib/auth/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-app p-6">
      <div className="w-full max-w-[400px]">
        {/* Marca */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#1B9E70] to-[#0B5C41]">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="#EAF7F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 2.5 15.5 14h-13L9 2.5Z" />
              <path d="M9 9.5v4.5" />
              <circle cx="9" cy="8" r="1.6" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-bold tracking-[-0.02em] text-ink">Morales &amp; Asoc.</div>
            <div className="text-[12.5px] text-ink-mid">Topografía · CFIA IC-4482</div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <h1 className="text-[15px] font-bold tracking-[-0.01em] text-ink">Iniciá sesión</h1>
          <p className="mb-5 mt-1 text-[12.5px] text-ink-mid">
            Sistema interno de planilla, clientes y proyectos.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
