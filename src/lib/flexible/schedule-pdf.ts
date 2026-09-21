import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Draw, Person } from "./model";

type PublicPerson = Person & { community: string };

type SchedulePdfInput = {
  name: string;
  draw: Draw;
  participants: PublicPerson[];
  publicUrl: string;
};

const churchUrl = "https://gpibharapanindah.org";
const ink = "#20221e";
const paper = "#fffaf0";
const yellow = "#f8dc45";

function pdfText(value: string | number) {
  return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\xFF]/g, "?");
}

function fitText(doc: PDFKit.PDFDocument, value: string, width: number) {
  const text = pdfText(value);
  if (doc.widthOfString(text) <= width) return text;
  let clipped = text;
  while (clipped.length && doc.widthOfString(`${clipped}...`) > width) clipped = clipped.slice(0, -1);
  return `${clipped}...`;
}

function drawTableCard(doc: PDFKit.PDFDocument, draw: Draw, table: string[], tableIndex: number, people: Map<string, PublicPerson>, x: number, y: number, width: number) {
  const headerHeight = 27;
  const rowHeight = 21;
  const height = headerHeight + table.length * rowHeight + 10;
  doc.save().lineWidth(1.2).fillColor(paper).strokeColor(ink).rect(x, y, width, height).fillAndStroke().restore();
  doc.save().fillColor(yellow).strokeColor(ink).rect(x, y, width, headerHeight).fillAndStroke().restore();
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(10).text(`MEJA ${String(tableIndex + 1).padStart(2, "0")}`, x + 10, y + 8, { width: width - 70 });
  doc.font("Helvetica").fontSize(7).text(`Babak ${draw.number}`, x + width - 55, y + 9, { width: 45, align: "right" });

  table.forEach((participantId, seat) => {
    const person = people.get(participantId);
    const rowY = y + headerHeight + 7 + seat * rowHeight;
    if (seat > 0) doc.save().strokeColor("#d2cfc5").lineWidth(0.5).moveTo(x + 9, rowY - 4).lineTo(x + width - 9, rowY - 4).stroke().restore();
    doc.save().lineWidth(0.7).strokeColor(ink).rect(x + 9, rowY, 14, 14).stroke().restore();
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(7).text(String(seat + 1), x + 9, rowY + 4, { width: 14, align: "center" });
    doc.font("Helvetica-Bold").fontSize(8.5).text(fitText(doc, person?.name ?? "Peserta tidak ditemukan", width - 43), x + 30, rowY, { width: width - 39, lineBreak: false });
    doc.font("Helvetica").fontSize(6.5).fillColor("#55574f").text(fitText(doc, `#${person?.number ?? "-"} - ${person?.community || "Tanpa komunitas"}`, width - 43), x + 30, rowY + 10, { width: width - 39, lineBreak: false });
  });
}

function drawPageFrame(doc: PDFKit.PDFDocument, input: SchedulePdfInput, pageNumber: number, pageCount: number) {
  const logoPath = path.join(process.cwd(), "public", "images", "logo-gpib-hi.png");
  doc.save().fillColor(yellow).strokeColor(ink).lineWidth(1.2).rect(42, 27, 38, 38).fillAndStroke().restore();
  if (existsSync(logoPath)) {
    try { doc.image(logoPath, 45, 30, { fit: [32, 32], align: "center", valign: "center" }); } catch { /* Tetap tampilkan header teks jika logo tidak dapat dibaca. */ }
  }
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(15).text("REMI", 91, 29, { width: 150 });
  doc.font("Helvetica").fontSize(6.5).text("PEMBAGIAN MEJA RESMI", 91, 48, { characterSpacing: 0.8 });
  doc.font("Helvetica-Bold").fontSize(9).text(pdfText(input.name), 250, 29, { width: 303, align: "right" });
  doc.font("Helvetica").fontSize(7).text(`Babak ${String(input.draw.number).padStart(2, "0")} - ${input.draw.tables.length} meja`, 250, 45, { width: 303, align: "right" });
  doc.save().strokeColor(ink).lineWidth(1.2).moveTo(42, 76).lineTo(553, 76).stroke().restore();

  doc.save().strokeColor(ink).lineWidth(0.8).moveTo(42, 776).lineTo(553, 776).stroke().restore();
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(7).text("PKB GPIB HARAPAN INDAH", 42, 785, { width: 170, link: churchUrl, underline: true });
  doc.font("Helvetica").fontSize(6.5).text(pdfText(input.publicUrl), 178, 785, { width: 300, align: "center", link: input.publicUrl, underline: true });
  doc.font("Helvetica-Bold").fontSize(7).text(`${pageNumber}/${pageCount}`, 500, 785, { width: 53, align: "right" });
  doc.font("Helvetica").fontSize(6).fillColor("#55574f").text("Klik nama gereja atau link pembagian untuk membuka versi web.", 42, 802, { width: 511, align: "center" });
}

export async function createSchedulePdf(input: SchedulePdfInput) {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false, bufferPages: true, compress: true, info: { Title: `Pembagian Meja - ${pdfText(input.name)} - Babak ${input.draw.number}`, Author: "PKB GPIB Harapan Indah", Subject: "Pembagian meja turnamen REMI" } });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const people = new Map(input.participants.map(person => [person.id, person]));
  const columnWidth = 247.5;
  input.draw.tables.forEach((table, index) => {
    if (index % 8 === 0) doc.addPage();
    const position = index % 8;
    const x = position % 2 === 0 ? 42 : 305.5;
    const y = 96 + Math.floor(position / 2) * 164;
    drawTableCard(doc, input.draw, table, index, people, x, y, columnWidth);
  });
  if (!input.draw.tables.length) doc.addPage();

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);
    drawPageFrame(doc, input, index - range.start + 1, range.count);
  }
  doc.end();
  return completed;
}
