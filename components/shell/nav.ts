import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  Calculator,
  FileSpreadsheet,
  Folder,
  LayoutDashboard,
  ScrollText,
  Settings,
  Table,
  User,
} from "lucide-react";
import type { PermissionKey } from "@/lib/auth/permissions";

export type BadgeTone = "neutral" | "amber" | "red";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: PermissionKey;
  /** Key into the badge-count record computed by the layout. */
  badge?: { key: string; tone: BadgeTone };
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { href: "/panel", label: "Panel", icon: LayoutDashboard, permission: "panel.ver" },
      {
        href: "/planilla",
        label: "Planilla",
        icon: Table,
        permission: "planilla.ver",
        badge: { key: "planillaPendientes", tone: "amber" },
      },
      {
        href: "/vacaciones",
        label: "Vacaciones",
        icon: CalendarDays,
        permission: "vacaciones.ver",
      },
    ],
  },
  {
    title: "Registros",
    items: [
      {
        href: "/empleados",
        label: "Empleados",
        icon: User,
        permission: "empleados.ver",
        badge: { key: "empleados", tone: "neutral" },
      },
      {
        href: "/clientes",
        label: "Clientes",
        icon: Building2,
        permission: "clientes.ver",
        badge: { key: "clientes", tone: "neutral" },
      },
      {
        href: "/proyectos",
        label: "Proyectos",
        icon: Folder,
        permission: "proyectos.ver",
        badge: { key: "proyectosVencidos", tone: "red" },
      },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        href: "/simulador",
        label: "Simulador",
        icon: Calculator,
        permission: "simulador.usar",
      },
      {
        href: "/reportes",
        label: "Reportes",
        icon: FileSpreadsheet,
        permission: "reportes.generar",
      },
      {
        href: "/configuracion",
        label: "Configuración",
        icon: Settings,
        permission: "configuracion.parametros",
      },
      { href: "/auditoria", label: "Bitácora", icon: ScrollText, permission: "auditoria.ver" },
    ],
  },
];

/** Header title/subtitle per route prefix. */
export const SCREEN_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/panel": { title: "Panel principal", subtitle: "Vista del período en curso" },
  "/planilla": { title: "Planilla del período", subtitle: "Semanal, quincenal y mensual en un solo corte" },
  "/vacaciones": { title: "Calendario de vacaciones", subtitle: "Feriados de ley marcados" },
  "/empleados": { title: "Empleados", subtitle: "Fichas, contratos e historial de pagos" },
  "/clientes": { title: "Clientes", subtitle: "Proyectos, abonos y saldos por cobrar" },
  "/proyectos": { title: "Proyectos", subtitle: "Monto acordado, prima pactada y registro de abonos" },
  "/feriados": { title: "Feriados", subtitle: "Días de pago obligatorio y trasladables" },
  "/simulador": { title: "Simulador de salarios", subtitle: "Bruto a neto y neto a bruto, sin guardar nada" },
  "/reportes": { title: "Reportes", subtitle: "Exportaciones a Excel" },
  "/configuracion": { title: "Configuración", subtitle: "Parámetros, usuarios y permisos" },
  "/auditoria": { title: "Bitácora", subtitle: "Quién cambió qué y cuándo" },
  "/mi": { title: "Mi portal", subtitle: "Colillas, vacaciones y proyectos asignados" },
};
