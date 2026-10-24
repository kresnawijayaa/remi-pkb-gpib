import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import type { StandingsSnapshot } from "./standings-data";

const ink = "#20221e";
const churchUrl = "https://gpibharapanindah.org";
const rulesUrl = "https://remi.gpibharapanindah.org/aturan";
const widths = [28, 220, 34, 34, 34, 38, 48, 75];
const labels = ["Rank", "Peserta", "Main", "Gold", "Silver", "Bronze", "Poin", "Total skor"];
function text(value: string | number) { return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\xFF]/g, "?"); }

export function standingsPublicUrl(shortCode: string | null | undefined, token: string | null | undefined) {
  if (!token) return null;
  return new URL(shortCode ? `/k/${shortCode}` : `/klasemen/${token}`, "https://remi.gpibharapanindah.org").toString();
}

export async function createStandingsPdf(input: StandingsSnapshot & { publicUrl: string | null; downloadedAt?: Date }) {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false, bufferPages: true, info: { Title: `Klasemen - ${text(input.name)}`, Author: "PKB GPIB Harapan Indah" } });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const downloaded = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(input.downloadedAt ?? new Date()) + " WIB";
  const logo = path.join(process.cwd(), "public/images/logo-gpib-hi.png");
  let y = 0;

  function page() {
    doc.addPage();
    doc.fillColor("#f8dc45").strokeColor(ink).rect(42, 27, 38, 38).fillAndStroke();
    if (existsSync(logo)) { try { doc.image(logo, 45, 30, { fit: [32, 32] }); } catch { /* Header text remains if logo is unavailable. */ } }
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(16).text("REMI", 91, 29, { width: 200 });
    doc.font("Helvetica").fontSize(8).text(input.final ? "HASIL AKHIR" : "KLASEMEN SEMENTARA", 91, 49, { width: 240 });
    doc.fontSize(7).text(`Diunduh ${downloaded}`, 315, 31, { width: 238, align: "right" });
    doc.text(`${input.standings.length} peserta tercatat | ${input.rounds} babak | ${input.completedTables}/${input.expectedTables} hasil meja`, 290, 49, { width: 263, align: "right" });
    doc.font("Helvetica-Bold").fontSize(12);
    const titleHeight = doc.heightOfString(text(input.name), { width: 511 });
    doc.text(text(input.name), 42, 80, { width: 511 });
    y = 80 + titleHeight + 9;
    doc.font("Helvetica").fontSize(7).text("Urutan: total poin, total skor, Gold, Silver, lalu Bronze (terbesar lebih dahulu).", 42, y, { width: 511 });
    y += 12;
    doc.text(input.final ? "Salinan hasil saat diunduh. Periksa versi web jika ada koreksi." : "Sementara: hasil meja tersimpan sudah dihitung; belum tentu seluruh babak lengkap atau disahkan.", 42, y, { width: 511 });
    y += 18;
    doc.fillColor(ink).rect(42, y, 511, 24).fill();
    let x = 42;
    labels.forEach((label, index) => {
      doc.fillColor("#fffaf0").font("Helvetica-Bold").fontSize(7).text(label, x + 3, y + 8, { width: widths[index] - 6, align: index === 1 ? "left" : "center", lineBreak: false });
      x += widths[index];
    });
    y += 24;
  }
  page();
  for (const row of input.standings) {
    const name = text(row.name);
    const subtitle = text(`#${row.number} - ${row.community || "Tanpa komunitas"}`);
    doc.font("Helvetica-Bold").fontSize(9);
    const nameHeight = doc.heightOfString(name, { width: widths[1] - 12 });
    doc.font("Helvetica").fontSize(7);
    const communityHeight = doc.heightOfString(subtitle, { width: widths[1] - 12 });
    const height = Math.max(34, nameHeight + communityHeight + 12);
    if (y + height > 730) page();
    const fills = ["#f9e893", "#e1e7e8", "#efd8c2"];
    doc.fillColor(row.rank <= 3 ? fills[row.rank - 1] : row.rank % 2 === 0 ? "#f3f0e8" : "#fffdf7").rect(42, y, 511, height).fill();
    const cells = [row.rank, "", `${row.played}/${input.rounds}`, row.firsts, row.seconds, row.thirds, row.points, row.totalScore];
    let x = 42;
    cells.forEach((value, index) => {
      doc.fillColor(ink).font(index === 0 || index === 6 ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      if (index === 1) {
        doc.font("Helvetica-Bold").fontSize(9).text(name, x + 6, y + 5, { width: widths[1] - 12 });
        doc.font("Helvetica").fontSize(7).text(subtitle, x + 6, y + 7 + nameHeight, { width: widths[1] - 12 });
      } else doc.text(text(value), x + 2, y + (height - 9) / 2, { width: widths[index] - 4, align: "center", lineBreak: false });
      x += widths[index];
    });
    doc.strokeColor("#d2cfc5").lineWidth(0.4).moveTo(42, y + height).lineTo(553, y + height).stroke();
    y += height;
  }
  if (!input.standings.length) doc.fillColor(ink).font("Helvetica").fontSize(10).text("Belum ada hasil meja yang tersimpan.", 42, y + 20, { width: 511 });
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);
    doc.fillColor(ink).font("Helvetica").fontSize(6.5).text("Seri penuh di batas kelolosan memerlukan keputusan panitia; nomor peserta bukan pemecah seri.", 42, 750, { width: 511 });
    doc.strokeColor(ink).lineWidth(0.8).moveTo(42, 774).lineTo(553, 774).stroke();
    doc.font("Helvetica-Bold").fontSize(7).text("PKB GPIB HARAPAN INDAH", 42, 784, { width: 170, link: churchUrl, underline: true });
    const url = input.publicUrl ?? rulesUrl;
    doc.font("Helvetica").fontSize(6.5).text(url, 205, 784, { width: 280, link: url, underline: true, align: "center" });
    doc.fontSize(7).text(`${index - range.start + 1}/${range.count}`, 500, 784, { width: 53, align: "right" });
  }
  doc.end();
  return completed;
}

export function standingsPdfResponse(pdf: Buffer, name: string) {
  const slug = text(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "turnamen-remi";
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="klasemen-${slug}.pdf"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}

export function standingsPdfError(message: string, status: number) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
