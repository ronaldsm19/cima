import { NextResponse, type NextRequest } from "next/server";
import { requirePermissionAction } from "@/lib/auth/access";
import { buildReport, type ReportKey, type ReportParams } from "@/lib/reports/builders";
import { attachmentName, buildWorkbook } from "@/lib/reports/workbook";

// ExcelJS needs the Node runtime (not Edge)
export const runtime = "nodejs";

const VALID: ReportKey[] = [
  "planilla-periodo",
  "pagos-empleado",
  "resumen-anual",
  "cuentas-por-cobrar",
  "ingresos-por-tipo",
  "proyectos-abiertos",
  "vacaciones",
  "rentabilidad",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> },
) {
  const { tipo } = await params;
  if (!VALID.includes(tipo as ReportKey)) {
    return NextResponse.json({ error: "Ese reporte no existe." }, { status: 404 });
  }

  try {
    await requirePermissionAction("reportes.generar");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sin permiso." },
      { status: 403 },
    );
  }

  const sp = request.nextUrl.searchParams;
  const opts: ReportParams = {
    periodId: sp.get("periodo") ?? undefined,
    employeeId: sp.get("empleado") ?? undefined,
    year: sp.get("anio") ? Number(sp.get("anio")) : undefined,
    desde: sp.get("desde") ?? undefined,
    hasta: sp.get("hasta") ?? undefined,
  };

  try {
    const spec = await buildReport(tipo as ReportKey, opts);
    const buffer = await buildWorkbook(spec);
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${attachmentName(spec.fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[reportes] fallo generando", tipo, error);
    return NextResponse.json(
      { error: "No se pudo generar el reporte. Revisá los parámetros e intentá de nuevo." },
      { status: 500 },
    );
  }
}
