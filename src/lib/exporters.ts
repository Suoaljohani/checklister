"use client";

import type { ReportInput } from "@/components/paper-form";
import { formatValue, isOutOfRange, zoned } from "./utils";

function fileBase(r: ReportInput) {
  const t = r.checklist.title_en.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${t}_${r.month}`;
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function b64ToBytes(dataUrl: string) {
  const bin = atob(dataUrl.split(",")[1] ?? "");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function imageSize(dataUrl: string) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return { w: img.naturalWidth, h: img.naturalHeight };
}

/** Rasterise the SVG logo so Excel and Word can embed it. */
async function logoPng(size = 320) {
  const img = new Image();
  img.src = "/brand/logo.svg";
  await img.decode();
  const ratio = img.naturalHeight / img.naturalWidth || 882 / 922;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = Math.round(size * ratio);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/png"), w: c.width, h: c.height };
}

/* ---------------- PDF (renders the on-screen paper pages) ---------------- */
export async function exportPdf(r: ReportInput, pages: HTMLElement[]) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const landscape = r.checklist.orientation === "landscape";
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4", compress: true });
  const W = landscape ? 297 : 210;
  const H = landscape ? 210 : 297;
  for (let i = 0; i < pages.length; i++) {
    const png = await toPng(pages[i], { pixelRatio: 2.5, backgroundColor: "#ffffff", cacheBust: false });
    if (i > 0) pdf.addPage("a4", landscape ? "landscape" : "portrait");
    pdf.addImage(png, "PNG", 0, 0, W, H, undefined, "FAST");
  }
  pdf.setProperties({ title: r.checklist.title_en, subject: `${r.department?.name_en ?? ""} ${r.month}` });
  download(pdf.output("blob"), `${fileBase(r)}.pdf`);
}

/* ---------------- Excel ---------------- */
export async function exportExcel(r: ReportInput) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "ER Checklists";
  const ws = wb.addWorksheet(r.month, {
    pageSetup: { paperSize: 9, orientation: r.checklist.orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }],
  });
  const c = r.checklist;
  const cols = ["Date", "Day", "Time", ...c.fields.map((f) => (f.unit ? `${f.label_en} (${f.unit})` : f.label_en)), "Staff name", "Employee no.", "Note", "Status", "Signature"];
  const nCols = cols.length;
  ws.columns = cols.map((_, i) => ({ width: i === nCols - 1 ? 22 : i === nCols - 3 ? 28 : i < 3 ? 13 : 16 }));

  const logo = await logoPng(200);
  const logoId = wb.addImage({ base64: logo.data, extension: "png" });

  const lines = Math.max(r.settings.header_en.length, r.settings.header_ar.length);
  for (let i = 0; i < lines; i++) {
    const row = ws.addRow([]);
    row.getCell(1).value = r.settings.header_en[i] ?? "";
    row.getCell(nCols).value = r.settings.header_ar[i] ?? "";
    row.getCell(1).font = { bold: true, size: 11, color: { argb: "FF333333" } };
    row.getCell(nCols).font = { bold: true, size: 11, color: { argb: "FF333333" } };
    row.getCell(nCols).alignment = { horizontal: "right", readingOrder: "rtl" };
  }
  ws.addImage(logoId, { tl: { col: Math.floor(nCols / 2) - 0.5, row: 0 }, ext: { width: 80, height: 80 * (logo.h / logo.w) } });

  ws.addRow([]);
  const title = ws.addRow([c.title_en.toUpperCase()]);
  ws.mergeCells(title.number, 1, title.number, nCols);
  title.getCell(1).font = { bold: true, size: 14 };
  title.getCell(1).alignment = { horizontal: "center" };
  if (c.title_ar) {
    const ar = ws.addRow([c.title_ar]);
    ws.mergeCells(ar.number, 1, ar.number, nCols);
    ar.getCell(1).alignment = { horizontal: "center", readingOrder: "rtl" };
  }
  const [y, m] = r.month.split("-");
  ws.addRow([`DEPARTMENT: ${r.department?.name_en ?? ""}`]).getCell(1).font = { bold: true };
  ws.addRow([`MONTH: ${m}/${y}`]).getCell(1).font = { bold: true };
  ws.addRow([]);

  const head = ws.addRow(cols);
  head.height = 22;
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1691D0" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  ws.views = [{ showGridLines: false, state: "frozen", ySplit: head.number }];

  const thin = { style: "thin" as const, color: { argb: "FFBFC9D4" } };
  for (const s of r.rows) {
    const z = zoned(s.submitted_at);
    const row = ws.addRow([
      z.date,
      z.day,
      z.time,
      ...c.fields.map((f) => {
        const v = s.values[f.key];
        return f.type === "number" && typeof v === "number" ? v : formatValue(f, v);
      }),
      s.employee_name,
      s.employee_no,
      s.note,
      s.flagged ? "Out of range" : "OK",
      "",
    ]);
    row.height = 34;
    row.eachCell({ includeEmpty: true }, (cell, i) => {
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
      cell.alignment = { vertical: "middle", horizontal: i === nCols - 2 ? "left" : "center", wrapText: true };
    });
    c.fields.forEach((f, i) => {
      if (isOutOfRange(f, s.values[f.key])) row.getCell(4 + i).font = { bold: true, color: { argb: "FFB4232F" } };
    });
    if (s.flagged) row.getCell(nCols - 1).font = { bold: true, color: { argb: "FFB4232F" } };
    if (s.signature) {
      const { w, h } = await imageSize(s.signature);
      const id = wb.addImage({ base64: s.signature, extension: "png" });
      const H = 38;
      const W = Math.min(140, (w / h) * H);
      ws.addImage(id, { tl: { col: nCols - 1 + 0.1, row: row.number - 1 + 0.1 }, ext: { width: W, height: H } });
    }
  }

  if (c.range_note) {
    ws.addRow([]);
    const n = ws.addRow([c.range_note]);
    ws.mergeCells(n.number, 1, n.number, nCols);
    n.getCell(1).font = { italic: true, size: 10, color: { argb: "FF555555" } };
  }
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase(r)}.xlsx`);
}

/* ---------------- Word ---------------- */
export async function exportWord(r: ReportInput) {
  const d = await import("docx");
  const { AlignmentType, BorderStyle, Document, ImageRun, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType } = d;
  const c = r.checklist;
  const landscape = c.orientation === "landscape";
  const logo = await logoPng(300);
  const font = "Times New Roman";
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  const line = { style: BorderStyle.SINGLE, size: 6, color: "222222" };
  const borders = { top: line, bottom: line, left: line, right: line };

  const p = (text: string, o: { bold?: boolean; size?: number; rtl?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string } = {}) =>
    new Paragraph({
      alignment: o.align ?? AlignmentType.CENTER,
      bidirectional: o.rtl,
      spacing: { after: 0 },
      children: [new TextRun({ text, bold: o.bold, size: o.size ?? 22, font, rightToLeft: o.rtl, color: o.color })],
    });

  const header = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders: noBorders, verticalAlign: VerticalAlign.CENTER, width: { size: 38, type: WidthType.PERCENTAGE }, children: r.settings.header_en.map((l) => p(l, { bold: true, color: "333333" })) }),
          new TableCell({
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 24, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({ type: "png", data: b64ToBytes(logo.data), transformation: { width: 84, height: Math.round(84 * (logo.h / logo.w)) } })],
              }),
            ],
          }),
          new TableCell({ borders: noBorders, verticalAlign: VerticalAlign.CENTER, width: { size: 38, type: WidthType.PERCENTAGE }, children: r.settings.header_ar.map((l) => p(l, { rtl: true, color: "333333" })) }),
        ],
      }),
    ],
  });

  const headCell = (en: string, ar?: string) =>
    new TableCell({
      borders,
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: "EEF4F8" },
      children: [p(en, { bold: true, size: en.length > 10 ? 16 : 19 }), ...(ar ? [p(ar, { size: 15, rtl: true })] : [])],
    });
  const cell = (text: string, red = false) =>
    new TableCell({ borders, verticalAlign: VerticalAlign.CENTER, children: [p(text, { size: 20, bold: red, color: red ? "B4232F" : undefined })] });

  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        headCell("DATE", "التاريخ"),
        headCell("DAY", "اليوم"),
        headCell("TIME", "الوقت"),
        ...c.fields.map((f) => headCell(f.label_en.toUpperCase(), f.label_ar)),
        headCell("NAME", "الاسم"),
        headCell("SIGNATURE", "التوقيع"),
      ],
    }),
  ];
  for (const s of r.rows) {
    const z = zoned(s.submitted_at);
    let sig = cell("");
    if (s.signature) {
      const { w, h } = await imageSize(s.signature);
      const H = 22;
      sig = new TableCell({
        borders,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new ImageRun({ type: "png", data: b64ToBytes(s.signature), transformation: { width: Math.round(Math.min(80, (w / h) * H)), height: H } }),
            ],
          }),
        ],
      });
    }
    rows.push(
      new TableRow({
        height: { value: 380, rule: "atLeast" },
        children: [cell(z.date), cell(z.dayShort), cell(z.time), ...c.fields.map((f) => cell(formatValue(f, s.values[f.key]), isOutOfRange(f, s.values[f.key]))), cell(s.employee_name), sig],
      }),
    );
  }
  for (let i = r.rows.length; i < 5; i++) rows.push(new TableRow({ height: { value: 380, rule: "atLeast" }, children: Array.from({ length: c.fields.length + 5 }, () => cell("")) }));

  const [y, m] = r.month.split("-");
  const doc = new Document({
    creator: "ER Checklists",
    title: c.title_en,
    sections: [
      {
        properties: {
          page: {
            size: { orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT, width: 11906, height: 16838 },
            margin: { top: 700, bottom: 700, left: 800, right: 800 },
          },
        },
        footers: {
          default: new d.Footer({ children: [p(c.footer_note, { size: 16, color: "888888" })] }),
        },
        children: [
          header,
          new Paragraph({ spacing: { before: 300 }, children: [] }),
          p(c.title_en.toUpperCase(), { bold: true, size: 28 }),
          ...(c.title_ar ? [p(c.title_ar, { rtl: true, size: 22 })] : []),
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "DEPARTMENT: ", bold: true, font, size: 24 }), new TextRun({ text: r.department?.name_en ?? "", font, size: 24 })] }),
          new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "MONTH: ", bold: true, font, size: 24 }), new TextRun({ text: `${m}/${y}`, font, size: 24 })] }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
          ...(c.range_note ? [new Paragraph({ spacing: { before: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: c.range_note, size: 18, font, color: "444444" })] })] : []),
        ],
      },
    ],
  });
  download(await Packer.toBlob(doc), `${fileBase(r)}.docx`);
}
