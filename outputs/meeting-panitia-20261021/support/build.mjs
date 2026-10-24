import fs from 'node:fs/promises';
import console from 'node:console';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
import JSZip from 'jszip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ink = '#232620', blue = '#D6E6FB', cream = '#FFFCF5';
await fs.mkdir(path.join(root, 'data'), { recursive: true });
await fs.mkdir(path.join(root, 'latihan-error'), { recursive: true });
await fs.mkdir(path.join(root, 'support/previews'), { recursive: true });
const header = ['Nama', 'Komunitas / Sektor'];
function people(count, communities) {
  return Array.from({ length: count }, (_, index) => [`Latihan ${String(index + 1).padStart(3, '0')}`, `Sektor Latihan ${String(index % communities + 1).padStart(2, '0')}`]);
}
function style(sheet, rows, columns, widths) {
  sheet.showGridLines = false;
  const range = sheet.getRangeByIndexes(0, 0, rows, columns);
  range.format.font = { name: 'Arial', size: 11, color: ink };
  range.format.fill = cream;
  range.format.rowHeight = 24;
  range.format.verticalAlignment = 'center';
  const headings = sheet.getRangeByIndexes(0, 0, 1, columns);
  headings.format.fill = ink;
  headings.format.font = { name: 'Arial', size: 11, color: '#FFFCF5', bold: true };
  headings.format.rowHeight = 32;
  headings.format.horizontalAlignment = 'center';
  widths.forEach((width, index) => { sheet.getRangeByIndexes(0, index, rows, 1).format.columnWidth = width; });
  sheet.freezePanes.freezeRows(1);
}
async function save(wb, filename, previews) {
  wb.recalculate();
  for (const [name, range] of previews) {
    console.log((await wb.inspect({ kind: 'region', sheetId: name, range, maxChars: 650, tableMaxRows: 3, tableMaxCols: 7 })).ndjson);
    const preview = await wb.render({ sheetName: name, range, scale: 1.5, format: 'png' });
    await fs.writeFile(path.join(root, 'support/previews', `${path.basename(filename, '.xlsx')}-${name}.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(root, filename));
  // ExcelJS 4.4 does not recognize SpreadsheetML element prefixes. Preserve
  // the namespace and values, changing only the equivalent XML spelling.
  const savedPath = path.join(root, filename);
  const zip = await JSZip.loadAsync(await fs.readFile(savedPath));
  for (const entry of Object.values(zip.files)) {
    if (!entry.name.endsWith('.xml')) continue;
    const xml = await entry.async('string');
    if (xml.includes('xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')) {
      zip.file(entry.name, xml.replaceAll('xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/(<\/?)(?:x:)/g, '$1'));
    }
  }
  await fs.writeFile(savedPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('SAVED', filename);
}
async function roster(filename, rows, headings = header) {
  const wb = Workbook.create();
  const sheet = wb.worksheets.add('Peserta');
  sheet.getRange(`A1:B${rows.length + 1}`).values = [headings, ...rows];
  style(sheet, rows.length + 1, 2, [30, 30]);
  await save(wb, filename, [['Peserta', `A1:B${Math.min(rows.length + 1, 9)}`]]);
  // CSV is a fallback format, not an additional workbook variant.
  const csv = [headings, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  await fs.writeFile(path.join(root, filename.replace('.xlsx', '.csv')), '\ufeff' + csv, 'utf8');
}
await roster('data/01-peserta-demo-20.xlsx', people(20, 4));
await roster('data/02-peserta-skala-200.xlsx', people(200, 10));
await roster('data/03-peserta-meja-merata-12.xlsx', people(12, 3));
await roster('latihan-error/05-sengaja-duplikat.xlsx', [people(3, 3)[0], people(3, 3)[1], people(3, 3)[0]]);
await roster('latihan-error/06-sengaja-header-salah.xlsx', people(3, 3), ['Peserta', 'Asal']);

const scoreSets = [
  [[900,700,500,500,300], [650,850,450,750,550], [0,400,300,200,100], [510,610,710,810,910]],
  [[600,800,1000,400,200], [720,720,520,320,120], [450,550,650,750,850], [990,790,590,390,190]],
  [[810,710,610,510,410], [460,660,860,760,560], [350,450,550,650,750], [920,820,620,520,720]],
];
const wb = Workbook.create();
const scores = wb.worksheets.add('Skor per meja');
const scoreRows = [];
scoreSets.forEach((tables, round) => tables.forEach((values, table) => {
  const sorted = values.map((value, seat) => ({ value, seat })).sort((a,b) => b.value-a.value || a.seat-b.seat);
  values.forEach((value, seat) => {
    const rank = sorted.findIndex(item => item.seat === seat) + 1;
    const tied = values.filter(item => item === value).length > 1;
    scoreRows.push([round + 1, table + 1, seat + 1, value, rank, null, tied ? 'Manual panitia (latihan)' : 'Otomatis']);
  });
}));
scores.getRange('A1:G61').values = [['Babak', 'Meja', 'Urutan tampil', 'Skor', 'Peringkat', 'Poin', 'Pengisian peringkat'], ...scoreRows];
style(scores, 61, 7, [10, 10, 17, 13, 14, 12, 34]);
scores.getRange('A2:F61').format.horizontalAlignment = 'right';
scores.getRange('F2:F61').format.horizontalAlignment = 'center';
scores.getRange('F2:F61').formulas = scoreRows.map((_,i) => [`=6-E${i+2}`]);
scores.getRange('A2:G61').conditionalFormats.addCustom('$G2="Manual panitia (latihan)"', { fill: '#F5EBCF' });
const check = wb.worksheets.add('Cek satu peserta');
check.getRange('A1:F1').values = [['Babak', 'Skor peserta', 'Peringkat meja', 'Poin', 'Gold', 'Silver']];
check.getRange('A2:C4').values = [[1, null, null], [2, null, null], [3, null, null]];
style(check, 9, 6, [14, 20, 20, 14, 14, 14]);
check.getRange('B2:C4').format.fill = '#FFF1C7';
check.getRange('B2:B4').dataValidation = { rule: { type: 'whole', operator: 'between', formula1: -1000000, formula2: 1000000 } };
check.getRange('C2:C4').dataValidation = { rule: { type: 'whole', operator: 'between', formula1: 1, formula2: 5 } };
check.getRange('D2:F4').formulas = [2,3,4].map(r => [`=IF(C${r}="","",6-C${r})`, `=IF(C${r}="","",IF(C${r}=1,1,0))`, `=IF(C${r}="","",IF(C${r}=2,1,0))`]);
check.getRange('A6:F6').values = [['Total 3 babak', null, 'Poin', null, null, null]];
check.getRange('B6').formulas = [['=IF(COUNT(B2:B4)<3,"Belum lengkap",SUM(B2:B4))']];
check.getRange('D6:F6').formulas = [['=IF(COUNT(C2:C4)<3,"Belum lengkap",SUM(D2:D4))', '=IF(COUNT(C2:C4)<3,"",SUM(E2:E4))', '=IF(COUNT(C2:C4)<3,"",SUM(F2:F4))']];
check.getRange('A8').values = [['Bronze']];
check.getRange('B8').formulas = [['=IF(COUNT(C2:C4)<3,"Belum lengkap",COUNTIFS(C2:C4,3))']];
check.getRange('A6:F6').format.fill = blue;
check.getRange('A9').values = [['Isi sel kuning dari riwayat web. Bukan file untuk diimpor.']];
check.getRange('A9:F9').format.fill = '#FFFCF5';
// Change-input verification; leave the delivered checker blank for the operator.
check.getRange('B2:C4').values = [[900,1],[500,3],[700,2]];
wb.recalculate();
console.log('CHECK_FILLED', JSON.stringify(check.getRange('B6:F6').values));
if (check.getRange('B6').values[0][0] !== 2100 || check.getRange('D6').values[0][0] !== 12) throw new Error('Score checker failed');
check.getRange('B2:C4').clear({ applyTo: 'contents' });
await save(wb, 'data/04-acuan-skor-bukan-untuk-impor.xlsx', [['Skor per meja','A1:G11'], ['Cek satu peserta','A1:F9']]);
console.log('Finished six workbooks. All participants and scores are synthetic training data.');
