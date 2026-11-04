"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { Check, Copy, Download, LoaderCircle, Printer } from "lucide-react";
import { Modal } from "@/components/modal";
import type { Checklist, Department } from "@/lib/types";

/** Permanent link printed in the QR code. /c/<id> finds the department at scan time. */
export function checklistLink(c: Pick<Checklist, "id">) {
  return `${location.origin}/c/${encodeURIComponent(c.id)}`;
}

function fileName(c: Checklist) {
  return `QR_${c.title_en.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 50)}.png`;
}

/* ---------------- Card drawing (A6 portrait at 300 dpi; prints well on A5/A6) ---------------- */

const W = 1240;
const H = 1748;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/).filter(Boolean);
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
  return lines;
}

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export async function drawQrCard(c: Checklist, department: Department | undefined): Promise<string> {
  const QR = (await import("qrcode")).default;
  await document.fonts?.ready;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const url = checklistLink(c);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Coloured band at the top and bottom
  ctx.fillStyle = c.color;
  ctx.fillRect(0, 0, W, 22);
  ctx.fillRect(0, H - 22, W, 22);

  // Hospital logo + name
  let y = 70;
  try {
    const logo = await loadImage("/brand/logo.svg");
    const lw = 230;
    const lh = (logo.naturalHeight / logo.naturalWidth || 882 / 922) * lw;
    ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + 26;
  } catch {
    y += 40;
  }

  // Department
  if (department) {
    ctx.fillStyle = "#5b6b7a";
    ctx.font = `600 38px ${font}`;
    const dep = department.name_ar ? `${department.name_en.trim()} · ${department.name_ar}` : department.name_en.trim();
    for (const l of wrap(ctx, dep, W - 160).slice(0, 2)) {
      y += 46;
      ctx.fillText(l, W / 2, y);
    }
    y += 26;
  }

  // Title (English, then Arabic)
  ctx.fillStyle = "#0d2138";
  ctx.font = `700 60px ${font}`;
  for (const l of wrap(ctx, c.title_en, W - 140).slice(0, 3)) {
    y += 70;
    ctx.fillText(l, W / 2, y);
  }
  if (c.title_ar) {
    ctx.fillStyle = "#334155";
    ctx.font = `500 46px ${font}`;
    ctx.direction = "rtl";
    for (const l of wrap(ctx, c.title_ar, W - 160).slice(0, 2)) {
      y += 60;
      ctx.fillText(l, W / 2, y);
    }
    ctx.direction = "ltr";
  }

  // QR code in a coloured rounded frame, sized to the space left
  const captionSpace = 230;
  const size = Math.min(720, H - y - 60 - captionSpace);
  const frame = 26;
  const qx = (W - size) / 2;
  const qy = y + 50;
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.roundRect(qx - frame, qy - frame, size + frame * 2, size + frame * 2, 48);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qx - 8, qy - 8, size + 16, size + 16, 28);
  ctx.fill();
  const qrUrl = await QR.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: size, color: { dark: "#0d2138", light: "#ffffff" } });
  ctx.drawImage(await loadImage(qrUrl), qx, qy, size, size);
  y = qy + size + frame;

  // Caption
  ctx.fillStyle = "#0d2138";
  ctx.font = `700 46px ${font}`;
  y += 82;
  ctx.fillText("Scan to open this checklist", W / 2, y);
  ctx.font = `500 42px ${font}`;
  ctx.direction = "rtl";
  y += 58;
  ctx.fillText("امسح الرمز لفتح القائمة مباشرة", W / 2, y);
  ctx.direction = "ltr";
  if (c.locked) {
    ctx.fillStyle = "#b45309";
    ctx.font = `600 32px ${font}`;
    y += 50;
    ctx.fillText("Locked · staff password needed  ·  مقفلة · تحتاج كلمة مرورك", W / 2, y);
  }

  // Link, small, for typing by hand
  ctx.fillStyle = "#94a3b8";
  ctx.font = `400 26px ${font}`;
  ctx.fillText(url.replace(/^https?:\/\//, ""), W / 2, H - 52);

  return canvas.toDataURL("image/png");
}

/* ---------------- Printing ---------------- */

function printImage(png: string, title: string) {
  const f = document.createElement("iframe");
  Object.assign(f.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(f);
  const d = f.contentDocument!;
  d.open();
  d.write(`<!doctype html><html><head><title>${title.replace(/[<>&]/g, "")}</title>
<style>@page{size:A5 portrait;margin:0}html,body{margin:0;height:100%}
body{display:flex;align-items:center;justify-content:center}
img{max-width:100%;max-height:100vh;display:block}</style></head>
<body><img src="${png}"></body></html>`);
  d.close();
  const img = d.querySelector("img")!;
  const go = () => {
    f.contentWindow?.focus();
    f.contentWindow?.print();
    setTimeout(() => f.remove(), 60_000);
  };
  if (img.complete) go();
  else img.onload = go;
}

/* ---------------- Dialog ---------------- */

export function QrDialog({ checklist, department, onClose }: { checklist: Checklist | null; department?: Department; onClose: () => void }) {
  const [png, setPng] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!checklist) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when a different checklist opens
    setPng("");
    setErr("");
    drawQrCard(checklist, department)
      .then((p) => live && setPng(p))
      .catch(() => live && setErr("Could not make the QR code"));
    return () => {
      live = false;
    };
  }, [checklist, department]);

  function download() {
    if (!checklist || !png) return;
    const a = document.createElement("a");
    a.href = png;
    a.download = fileName(checklist);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function copy() {
    if (!checklist) return;
    try {
      await navigator.clipboard.writeText(checklistLink(checklist));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <Modal
      open={!!checklist}
      onClose={onClose}
      title="QR code"
      footer={
        <>
          <button className="btn btn-ghost mr-auto" onClick={copy} disabled={!checklist}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
          </button>
          <button className="btn btn-ghost" onClick={() => checklist && png && printImage(png, checklist.title_en)} disabled={!png}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="btn btn-primary" onClick={download} disabled={!png}>
            <Download className="h-4 w-4" /> Download
          </button>
        </>
      }
    >
      <p className="mb-3 text-[13px] text-ink-3">
        Print it and put it where the check is done. Staff scan it with the phone camera and the checklist opens directly.
        <span className="mt-1 block" dir="rtl">
          اطبعه وضعه في مكان الفحص. يمسحه الموظف بكاميرا الجوال فتفتح القائمة مباشرة.
        </span>
      </p>
      <div className="grid place-items-center rounded-2xl bg-white/90 p-3">
        {png ? (
          <img src={png} alt={`QR code for ${checklist?.title_en}`} className="h-auto max-h-[56vh] w-auto rounded-lg shadow-lg" />
        ) : err ? (
          <p className="p-10 text-[14px] text-danger">{err}</p>
        ) : (
          <LoaderCircle className="m-16 h-8 w-8 animate-spin text-ink-3" />
        )}
      </div>
    </Modal>
  );
}
