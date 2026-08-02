"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { NAV_GROUPS, type BadgeTone, type NavItem } from "./nav";

export interface SidebarProps {
  /** Nav items already filtered by the user's permissions (server-side). */
  allowedHrefs: string[];
  /** Badge counts by key; null/absent hides the badge. */
  badges: Record<string, number | null>;
  userName: string;
  userRoleLabel: string;
}

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-white/[0.08] text-[#8E9C95]",
  amber: "bg-[#D69E2E]/[0.16] text-[#E0B357]",
  red: "bg-[#D65A46]/[0.18] text-[#E58C7C]",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Sidebar({ allowedHrefs, badges, userName, userRoleLabel }: SidebarProps) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => allowedHrefs.includes(i.href)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="flex w-[236px] flex-none flex-col gap-[22px] bg-sidebar px-[14px] pb-4 pt-[18px] max-[960px]:w-full max-[960px]:flex-row max-[960px]:items-center max-[960px]:gap-3 max-[960px]:overflow-x-auto max-[960px]:py-2">
      {/* Marca */}
      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-[18px] max-[960px]:border-b-0 max-[960px]:pb-0">
        <div className="flex size-[34px] flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-[#1B9E70] to-[#0B5C41]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#EAF7F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 2.5 15.5 14h-13L9 2.5Z" />
            <path d="M9 9.5v4.5" />
            <circle cx="9" cy="8" r="1.6" />
          </svg>
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-[13.5px] font-bold text-[#F2F7F4]">Morales &amp; Asoc.</div>
          <div className="text-[11px] text-[#7E8D86] max-[960px]:hidden">Topografía · CFIA IC-4482</div>
        </div>
      </div>

      {/* Grupos */}
      <nav className="flex flex-1 flex-col gap-[22px] max-[960px]:flex-row max-[960px]:items-center max-[960px]:gap-1">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1 max-[960px]:flex-row max-[960px]:gap-1">
            <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[#67766E] max-[960px]:hidden">
              {group.title}
            </div>
            {group.items.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                active={pathname.startsWith(item.href)}
                count={item.badge ? (badges[item.badge.key] ?? null) : null}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Pie: usuario */}
      <div className="flex items-center gap-[10px] border-t border-white/[0.08] pt-3 max-[960px]:hidden">
        <div className="flex size-8 flex-none items-center justify-center rounded-full bg-[#1D3229] text-[12px] font-bold text-[#7FD3AE]">
          {initials(userName)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[12.5px] font-semibold text-[#F2F7F4]">{userName}</div>
          <div className="truncate text-[11px] text-[#7E8D86]">{userRoleLabel}</div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex size-7 items-center justify-center rounded-lg text-[#7E8D86] transition-colors duration-[140ms] hover:bg-white/[0.08] hover:text-[#F2F7F4]"
          >
            <LogOut size={14} strokeWidth={1.8} aria-hidden />
            <span className="sr-only">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

function SidebarItem({ item, active, count }: { item: NavItem; active: boolean; count: number | null }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex h-10 items-center gap-[11px] rounded-[10px] px-3 text-[13.5px] transition-colors duration-[140ms] ${
        active
          ? "bg-white/10 font-semibold text-[#F2F7F4]"
          : "font-medium text-[#A9B6AF] hover:bg-white/[0.06] hover:text-[#F2F7F4]"
      }`}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden />
      <span>{item.label}</span>
      {item.badge && count !== null && count > 0 ? (
        <span
          className={`ml-auto flex h-5 items-center rounded-full px-2 text-[11px] font-bold ${BADGE_STYLES[item.badge.tone]}`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
