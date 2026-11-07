"use client";

import type { Checklist, Department } from "@/lib/types";
import { checklistLink, reportLink, type QrKind } from "./qr-card";

/* All QR codes on A4 pages, 3 x 3 tiles per page, with dashed cut lines. Drawn at 300 dpi. */

const MM = 300 / 25.4;
const PW = 2480;
const PH = 3508;
const MARGIN = Math.round(6 * MM);
const TW = (PW - MARGIN * 2) / 3;
const TH = (PH - MARGIN * 2) / 3;
const REPORT = "#283A83";

type Item = { c: Checklist; dep?: Department; url: string };

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length > 1) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  let t = text.replace(/\s+/g, " ").trim();
  if (ctx.measureText(t).width <= maxW) return t;
  while (ctx.measureText(`${t}…`).width > maxW && t.length > 1) t = t.slice(0, -1);
  return `${t}…`;
}

/** "English · Arabic" on one centred line. Each part is placed by its centre so neither can be reordered. */
function mixedLine(ctx: CanvasRenderingContext2D, en: string, ar: string, cx: number, y: number, enFont: string, arFont: string) {
  const sep = "  ·  ";
  ctx.direction = "ltr";
  ctx.font = enFont;
  const ew = ctx.measureText(en).width;
  const sw = ctx.measureText(sep).width;
  ctx.font = arFont;
  ctx.direction = "rtl";
  const aw = ctx.measureText(ar).width;
  const x0 = cx - (ew + sw + aw) / 2;
  ctx.textAlign = "center";
  ctx.fillText(ar, x0 + ew + sw + aw / 2, y);
  ctx.direction = "ltr";
  ctx.font = enFont;
  ctx.fillText(en, x0 + ew / 2, y);
  ctx.fillText(sep, x0 + ew + sw / 2, y);
}

async function drawTile(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number, kind: QrKind, font: string, logo: HTMLImageElement | null) {
  const QR = (await import("qrcode")).default;
  const color = it.c.color || "#1691D0";
  const cx = x + TW / 2;
  const pad = Math.round(3.5 * MM);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, TW, TH);
  ctx.clip();

  // Department band
  const bandH = Math.round(11.5 * MM);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, TW, bandH);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = `600 31px ${font}`;
  ctx.fillText(fit(ctx, it.dep?.name_en ?? "", TW - 60), cx, y + 54);
  if (it.dep?.name_ar) {
    ctx.direction = "rtl";
    ctx.font = `500 31px ${font}`;
    ctx.fillText(fit(ctx, it.dep.name_ar, TW - 60), cx, y + 100);
    ctx.direction = "ltr";
  }

  // Report tag
  let top = y + bandH;
  if (kind === "report") {
    ctx.font = `700 26px ${font}`;
    const tag = "REPORT · تقرير";
    const w = ctx.measureText(tag).width + 40;
    ctx.fillStyle = REPORT;
    ctx.beginPath();
    ctx.roundRect(x + TW - w - 22, top + 16, w, 46, 23);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(tag, x + TW - w / 2 - 22, top + 48);
  }

  // Logo
  top += Math.round(2 * MM);
  if (logo) {
    const lh = Math.round(10.5 * MM);
    const lw = (logo.naturalWidth / logo.naturalHeight || 922 / 882) * lh;
    ctx.drawImage(logo, cx - lw / 2, top, lw, lh);
    top += lh;
  }

  // Titles
  ctx.fillStyle = "#0d2138";
  ctx.font = `700 40px ${font}`;
  top += 22;
  for (const l of wrap(ctx, it.c.title_en, TW - pad * 2, 3)) {
    top += 47;
    ctx.fillText(l, cx, top);
  }
  if (it.c.title_ar) {
    ctx.fillStyle = "#334155";
    ctx.font = `500 34px ${font}`;
    ctx.direction = "rtl";
    for (const l of wrap(ctx, it.c.title_ar, TW - pad * 2, 2)) {
      top += 45;
      ctx.fillText(l, cx, top);
    }
    ctx.direction = "ltr";
  }

  // QR in a coloured frame, anchored to the bottom
  const bottomBar = Math.round(2.2 * MM);
  const extra = kind === "open" && it.c.locked ? 44 : 0;
  const capSpace = Math.round(9 * MM) + extra;
  const frame = Math.round(1.6 * MM);
  const inner = Math.round(1.8 * MM);
  const box = Math.round(39 * MM);
  const qx = cx - box / 2;
  const qy = y + TH - bottomBar - capSpace - box;
  const qrColor = kind === "report" ? REPORT : color;
  ctx.fillStyle = qrColor;
  ctx.beginPath();
  ctx.roundRect(qx, qy, box, box, Math.round(3.2 * MM));
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qx + frame, qy + frame, box - frame * 2, box - frame * 2, Math.round(1.8 * MM));
  ctx.fill();
  const qs = box - frame * 2 - inner * 2;
  const qr = await QR.toDataURL(it.url, { errorCorrectionLevel: "M", margin: 0, width: qs, color: { dark: "#0d2138", light: "#ffffff" } });
  ctx.drawImage(await loadImage(qr), qx + frame + inner, qy + frame + inner, qs, qs);

  // Caption
  ctx.fillStyle = "#0d2138";
  const capY = qy + box + 52;
  if (kind === "report") mixedLine(ctx, "Latest report (PDF)", "آخر تقرير محدّث", cx, capY, `700 31px ${font}`, `500 31px ${font}`);
  else mixedLine(ctx, "Scan to open", "امسح للفتح", cx, capY, `700 33px ${font}`, `500 33px ${font}`);
  if (extra) {
    ctx.fillStyle = "#b45309";
    mixedLine(ctx, "Password needed", "يحتاج كلمة المرور", cx, capY + 42, `600 26px ${font}`, `600 26px ${font}`);
  }

  // Bottom bar
  ctx.fillStyle = kind === "report" ? REPORT : color;
  ctx.fillRect(x, y + TH - bottomBar, TW, bottomBar);
  ctx.restore();

  // Dashed cut line
  ctx.save();
  ctx.strokeStyle = "#b8c2cc";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(x, y, TW, TH);
  ctx.restore();
}

/** Builds and downloads the PDF. Returns the number of codes. */
export async function downloadQrSheet(checklists: Checklist[], departments: Department[], kind: QrKind, onProgress?: (done: number, total: number) => void) {
  const deps = new Map(departments.map((d) => [d.id, d]));
  const list = checklists
    .filter((c) => c.active && deps.get(c.department_id)?.active !== false)
    .sort((a, b) => (deps.get(a.department_id)?.sort ?? 0) - (deps.get(b.department_id)?.sort ?? 0) || a.sort - b.sort);
  const items: Item[] = await Promise.all(
    list.map(async (c) => ({ c, dep: deps.get(c.department_id), url: kind === "report" ? await reportLink(c) : checklistLink(c) })),
  );
  if (!items.length) return 0;

  await document.fonts?.ready;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const logo = await loadImage("/brand/logo.svg").catch(() => null);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  for (let p = 0; p * 9 < items.length; p++) {
    const canvas = document.createElement("canvas");
    canvas.width = PW;
    canvas.height = PH;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PW, PH);
    const page = items.slice(p * 9, p * 9 + 9);
    for (let i = 0; i < 9; i++) {
      const x = MARGIN + (i % 3) * TW;
      const y = MARGIN + Math.floor(i / 3) * TH;
      if (page[i]) {
        await drawTile(ctx, page[i], x, y, kind, font, logo);
        onProgress?.(p * 9 + i + 1, items.length);
      } else {
        ctx.save();
        ctx.strokeStyle = "#e5e9ee";
        ctx.lineWidth = 3;
        ctx.setLineDash([18, 12]);
        ctx.strokeRect(x, y, TW, TH);
        ctx.restore();
      }
    }
    if (p > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  }
  pdf.setProperties({ title: kind === "report" ? "Checklist report QR codes" : "Checklist QR codes" });
  const blob = pdf.output("blob");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = kind === "report" ? "Checklist-Report-QR-Codes.pdf" : "Checklist-QR-Codes.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return items.length;
}
