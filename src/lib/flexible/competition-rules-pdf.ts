import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import { auditExample, exampleTotals, pointRules, rankingCriteria, rulesPublicUrl, rulesSections, rulesVersion } from "./competition-rules";

const ink = "#20221e";
const clean = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\xFF]/g, "-");

export async function createCompetitionRulesPdf() {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false, info: { Title: "Aturan Sistem Pertandingan REMI", Author: "PKB GPIB Harapan Indah", Subject: `Poin, klasemen, seri, dan pemeriksaan hasil - versi ${clean(rulesVersion)}` } });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const pageTitles = ["Skor, poin, dan peringkat meja", "Klasemen dan kelolosan", "Pembagian meja dan status hasil", "Pemeriksaan hasil dan keberatan"];
  const left = 44, width = 507;

  function paragraph(text: string) {
    doc.font("Helvetica").fontSize(9.5).fillColor(ink).text(clean(text), left, doc.y, { width, lineGap: 2.5 });
    doc.moveDown(0.45);
  }
  function table(headers: string[], rows: string[][], widths: number[]) {
    let y = doc.y + 3;
    [headers, ...rows].forEach((row, index) => {
      const height = 20;
      doc.save().fillColor(index === 0 ? "#20221e" : index % 2 === 0 ? "#f1eee4" : "#fffaf0").rect(left, y, width, height).fill().restore();
      let x = left;
      row.forEach((value, col) => { doc.font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(index === 0 ? "#fffaf0" : ink).text(clean(value), x + 8, y + 6, { width: widths[col] - 16, lineBreak: false }); x += widths[col]; });
      y += height;
    });
    doc.y = y + 10;
  }

  for (let page = 1; page <= 4; page++) {
    doc.addPage();
    const logo = path.join(process.cwd(), "public", "images", "logo-gpib-hi.png");
    if (existsSync(logo)) doc.image(logo, left, 28, { fit: [34, 34] });
    doc.font("Helvetica-Bold").fontSize(15).fillColor(ink).text("REMI / ATURAN PERTANDINGAN", 88, 28, { width: 460 });
    doc.font("Helvetica").fontSize(8).text(`Versi ${clean(rulesVersion)} | Acuan panitia dan peserta`, 88, 49, { width: 460 });
    doc.save().strokeColor(ink).lineWidth(1).moveTo(left, 73).lineTo(left + width, 73).stroke().restore();
    doc.font("Helvetica-Bold").fontSize(12).fillColor(ink).text(`${page}. ${pageTitles[page - 1]}`, left, 88, { width });
    doc.y = 112;
    for (const section of rulesSections.filter(item => item.page === page)) {
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(ink).text(section.title, left, doc.y, { width });
      doc.moveDown(0.35);
      section.paragraphs.forEach(paragraph);
      if (section.id === "poin") table(["Peringkat meja", "Sebutan", "Poin"], pointRules.map(row => [String(row.rank), row.medal, String(row.points)]), [170, 170, 167]);
      if (section.id === "klasemen") rankingCriteria.forEach((criterion, i) => paragraph(`${i + 1}. ${criterion}${i < 4 ? " - jika sama, lanjut ke kriteria berikutnya." : "."}`));
      section.bullets.forEach(text => paragraph(`- ${text}`));
      if (section.id === "cek") {
        table(["Babak", "Skor", "Peringkat meja", "Poin"], [...auditExample.map(row => [String(row.round), String(row.score), String(row.rank), String(row.points)]), ["TOTAL", "3.550", "5 babak", String(exampleTotals.points)]], [100, 130, 157, 120]);
      }
      doc.moveDown(0.5);
      if (doc.y > 754) throw new Error(`Isi aturan melebihi area halaman ${page}; sesuaikan layout PDF.`);
    }
    doc.save().strokeColor("#aaa594").lineWidth(0.6).moveTo(left, 775).lineTo(left + width, 775).stroke().restore();
    doc.font("Helvetica").fontSize(7).fillColor(ink).text("PKB GPIB HARAPAN INDAH", left, 786, { width: 180, link: "https://gpibharapanindah.org", underline: true });
    doc.text(rulesPublicUrl, 220, 786, { width: 260, link: rulesPublicUrl, underline: true, align: "center" });
    doc.text(`${page}/4`, 510, 786, { width: 41, align: "right" });
  }
  doc.end();
  return completed;
}
