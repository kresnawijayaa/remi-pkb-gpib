import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { normalizeCommunityName, RuleError } from "./model";

export type ImportRow = { row: number; name: string; community: string };
const aliases = { name: ["nama", "name", "nama lengkap"], community: ["komunitas / sektor", "komunitas", "sektor", "community"] };

function clean(value: unknown) { return String(value ?? "").trim().replace(/\s+/g, " "); }
function rowsFromMatrix(matrix: unknown[][]) {
  const headers = (matrix[0] ?? []).map(value => clean(value).toLocaleLowerCase("id-ID"));
  const nameIndex = headers.findIndex(value => aliases.name.includes(value));
  const communityIndex = headers.findIndex(value => aliases.community.includes(value));
  if (nameIndex < 0 || communityIndex < 0) throw new RuleError("Header wajib: Nama dan Komunitas / Sektor. Unduh template agar formatnya sesuai.");
  const rows: ImportRow[] = [];
  for (let index = 1; index < matrix.length; index++) {
    const name = clean(matrix[index]?.[nameIndex]);
    const community = clean(matrix[index]?.[communityIndex]);
    if (!name && !community) continue;
    if (name.length < 2 || name.length > 100) throw new RuleError(`Baris ${index + 1}: nama harus 2–100 karakter.`);
    if (community.length < 2 || community.length > 80) throw new RuleError(`Baris ${index + 1}: komunitas / sektor harus 2–80 karakter.`);
    rows.push({ row: index + 1, name, community });
  }
  if (!rows.length) throw new RuleError("File tidak berisi peserta.");
  if (rows.length > 500) throw new RuleError("Maksimal 500 baris peserta per file.");
  const seen = new Set<string>();
  for (const item of rows) {
    const key = `${item.name.toLocaleLowerCase("id-ID")}|${normalizeCommunityName(item.community)}`;
    if (seen.has(key)) throw new RuleError(`Baris ${item.row}: pasangan nama dan komunitas duplikat di dalam file.`);
    seen.add(key);
  }
  return rows;
}

export async function parseRosterFile(file: File) {
  if (file.size > 2 * 1024 * 1024) throw new RuleError("Ukuran file maksimal 2 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xls") throw new RuleError("Format .xls lama tidak didukung. Simpan ulang sebagai .xlsx atau .csv.");
  if (!extension || !["xlsx", "csv", "tsv"].includes(extension)) throw new RuleError("Gunakan file .xlsx, .csv, atau .tsv.");
  if (extension === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const contents = Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(contents);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new RuleError("Workbook tidak memiliki sheet.");
    const matrix: unknown[][] = [];
    sheet.eachRow({ includeEmpty: true }, row => matrix.push((row.values as unknown[]).slice(1).map(value => typeof value === "object" && value && "text" in value ? (value as { text: string }).text : value)));
    return rowsFromMatrix(matrix);
  }
  const delimiter = extension === "tsv" ? "\t" : undefined;
  const matrix = parse(Buffer.from(await file.arrayBuffer()), { bom: true, delimiter, relax_column_count: true, skip_empty_lines: false }) as unknown[][];
  return rowsFromMatrix(matrix);
}
