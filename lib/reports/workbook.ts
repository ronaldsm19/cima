import "server-only";
import ExcelJS from "exceljs";
import { formatDateCR, todayCR } from "@/lib/format/dates";

/**
 * Shared ExcelJS scaffolding so every report looks the same: company header,
 * ₡ number format, sensible column widths, totals row and a parameters sheet
 * (prompt-01 §8 requirements).
 */

export const CURRENCY_FMT = '"₡"#,##0.00';
export const CURRENCY_FMT_0 = '"₡"#,##0';

const BRAND = "FF0E6B4E";
const HEADER_BG = "FFF1F7F4";
const LINE = "FFE6EAE4";

export interface ReportColumn {
  header: string;
  key: string;
  width: number;
  /** "money" right-aligns and applies the ₡ format; "num" is plain numeric. */
  kind?: "text" | "money" | "money0" | "num" | "date";
  /** Include this column in the totals row. */
  total?: boolean;
}

export interface ReportSpec {
  /** File name without extension. */
  fileName: string;
  title: string;
  subtitle?: string;
  sheetName: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  /** Label placed in the first column of the totals row. */
  totalsLabel?: string;
  /** Extra "Parámetros del reporte" sheet entries. */
  params?: { label: string; value: string }[];
}

export async function buildWorkbook(spec: ReportSpec): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Morales & Asoc. · Sistema interno";
  wb.created = new Date();

  const ws = wb.addWorksheet(spec.sheetName, {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const lastCol = spec.columns.length;

  // ── Company header ────────────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, lastCol);
  const brandCell = ws.getCell(1, 1);
  brandCell.value = "Morales & Asoc. · Topografía · CFIA IC-4482";
  brandCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: BRAND } };

  ws.mergeCells(2, 1, 2, lastCol);
  const titleCell = ws.getCell(2, 1);
  titleCell.value = spec.title;
  titleCell.font = { name: "Calibri", size: 14, bold: true };

  ws.mergeCells(3, 1, 3, lastCol);
  const subCell = ws.getCell(3, 1);
  subCell.value = [spec.subtitle, `Generado el ${formatDateCR(todayCR())}`]
    .filter(Boolean)
    .join(" · ");
  subCell.font = { name: "Calibri", size: 9, color: { argb: "FF6B766F" } };

  ws.getRow(4).height = 6;

  // ── Column headers ────────────────────────────────────────────────────────
  const headerRow = ws.getRow(5);
  spec.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF4A554E" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = {
      horizontal: col.kind === "money" || col.kind === "money0" || col.kind === "num" ? "right" : "left",
      vertical: "middle",
    };
    cell.border = { bottom: { style: "thin", color: { argb: LINE } } };
    ws.getColumn(i + 1).width = col.width;
  });
  headerRow.height = 20;

  // ── Data ──────────────────────────────────────────────────────────────────
  spec.rows.forEach((row) => {
    const r = ws.addRow(spec.columns.map((c) => row[c.key] ?? null));
    r.height = 17;
    spec.columns.forEach((col, i) => {
      const cell = r.getCell(i + 1);
      cell.font = { name: "Calibri", size: 10 };
      cell.border = { bottom: { style: "hair", color: { argb: LINE } } };
      if (col.kind === "money") {
        cell.numFmt = CURRENCY_FMT;
        cell.alignment = { horizontal: "right" };
      } else if (col.kind === "money0") {
        cell.numFmt = CURRENCY_FMT_0;
        cell.alignment = { horizontal: "right" };
      } else if (col.kind === "num") {
        cell.alignment = { horizontal: "right" };
      }
    });
  });

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalCols = spec.columns.filter((c) => c.total);
  if (totalCols.length > 0 && spec.rows.length > 0) {
    const values = spec.columns.map((col, i) => {
      if (i === 0) return spec.totalsLabel ?? `Total · ${spec.rows.length}`;
      if (!col.total) return null;
      return spec.rows.reduce((acc, row) => acc + Number(row[col.key] ?? 0), 0);
    });
    const totals = ws.addRow(values);
    totals.height = 20;
    spec.columns.forEach((col, i) => {
      const cell = totals.getCell(i + 1);
      cell.font = { name: "Calibri", size: 10, bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
      cell.border = { top: { style: "thin", color: { argb: LINE } } };
      if (col.kind === "money") cell.numFmt = CURRENCY_FMT;
      if (col.kind === "money0") cell.numFmt = CURRENCY_FMT_0;
      if (col.kind === "money" || col.kind === "money0" || col.kind === "num") {
        cell.alignment = { horizontal: "right" };
      }
    });
  }

  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: lastCol } };

  // ── Parameters sheet ──────────────────────────────────────────────────────
  const ps = wb.addWorksheet("Parámetros");
  ps.getColumn(1).width = 30;
  ps.getColumn(2).width = 46;
  const entries: { label: string; value: string }[] = [
    { label: "Reporte", value: spec.title },
    ...(spec.subtitle ? [{ label: "Alcance", value: spec.subtitle }] : []),
    { label: "Generado el", value: formatDateCR(todayCR()) },
    { label: "Filas", value: String(spec.rows.length) },
    ...(spec.params ?? []),
  ];
  entries.forEach((e, i) => {
    const row = ps.getRow(i + 1);
    row.getCell(1).value = e.label;
    row.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF6B766F" } };
    row.getCell(2).value = e.value;
    row.getCell(2).font = { name: "Calibri", size: 10 };
  });

  return wb.xlsx.writeBuffer();
}

/** Content-Disposition value with the CR date stamped in. */
export function attachmentName(fileName: string): string {
  return `${fileName}-${todayCR()}.xlsx`;
}
