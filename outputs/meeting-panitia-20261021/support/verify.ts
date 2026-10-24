import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { parseRosterFile } from "../../../src/lib/flexible/import";
import { generateDraw, type EventData } from "../../../src/lib/flexible/model";
import { randomFrom } from "../../../src/lib/flexible/dev-seed";
import { rankTable } from "../../../src/lib/flexible/scoring";

async function main() {
  const root = path.resolve("outputs/meeting-panitia-20261021");
  const checks: object[] = [];
  for (const [name, count, communities] of [["01-peserta-demo-20",20,4], ["02-peserta-skala-200",200,10], ["03-peserta-meja-merata-12",12,3]] as const) {
    for (const extension of ["xlsx","csv"]) {
      const filename = `data/${name}.${extension}`;
      const rows = await parseRosterFile(new File([await fs.readFile(path.join(root, filename))], filename));
      assert.equal(rows.length, count);
      assert.equal(new Set(rows.map(row => row.community)).size, communities);
      const data: EventData = { dataVersion:2, settings:{ name:"Latihan",target:count,capacity:5,rounds:5,advancing:Math.min(20,count) }, communities:Array.from({length:communities},(_,i)=>({id:`c${i}`,name:`Sektor Latihan ${String(i+1).padStart(2,"0")}`,normalizedName:`sektor latihan ${String(i+1).padStart(2,"0")}`})), participants:rows.map((row,index)=>({ id:`p${index}`,number:index+1,name:row.name,communityId:`c${index%communities}` })), draws:[],results:[],resultStates:[],qualifiedIds:[],qualificationLockedAt:null,drawShareCode:null,standingsShareToken:null,standingsShareHash:null,standingsShareCode:null,audit:[],parentId:null };
      const draw = generateDraw(data, 1, randomFrom(20261021));
      assert.equal(new Set(draw.tables.flat()).size,count);
      assert.equal(draw.tables.length, Math.ceil(count/5));
      assert.equal(draw.tables.every(table=>table.length===(count===12?4:5)),true);
      checks.push({filename,status:"PASS",participants:count,communities,tables:draw.tables.length,tableSizes:draw.tables.map(table=>table.length)});
    }
  }
  for (const [name, expected] of [["05-sengaja-duplikat", "duplikat"], ["06-sengaja-header-salah", "Header wajib"]]) {
    for (const extension of ["xlsx","csv"]) {
      const filename = `latihan-error/${name}.${extension}`;
      let message = "";
      try { await parseRosterFile(new File([await fs.readFile(path.join(root, filename))], filename)); } catch (error) { message = (error as Error).message; }
      assert.ok(message.includes(expected));
      checks.push({filename,status:"EXPECTED_REJECTION",message});
    }
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(root,"data/04-acuan-skor-bukan-untuk-impor.xlsx"));
  const sheet = workbook.getWorksheet("Skor per meja")!;
  let totalPoints = 0;
  for (let start = 2; start <= 61; start += 5) {
    const entries = Array.from({length:5},(_,index)=>{
      const row = sheet.getRow(start+index);
      return {participantId:`seat${index+1}`,score:Number(row.getCell(4).value),manualRank:Number(row.getCell(5).value)};
    });
    const ranked = rankTable(entries);
    for (let index=0;index<5;index++) {
      const expected = ranked.find(row=>row.participantId===entries[index].participantId)!;
      assert.equal(expected.tableRank,entries[index].manualRank);
      const pointCell = sheet.getRow(start+index).getCell(6).value as {result:number};
      assert.equal(pointCell.result,expected.tournamentPoint);
      totalPoints += pointCell.result;
    }
  }
  assert.equal(totalPoints,180);
  assert.equal(workbook.getWorksheet("Cek satu peserta")!.getCell("B6").text,"Belum lengkap");
  assert.equal(workbook.getWorksheet("Cek satu peserta")!.getCell("D6").text,"Belum lengkap");
  checks.push({filename:"data/04-acuan-skor-bukan-untuk-impor.xlsx",status:"PASS",scoreRows:60,tables:12,totalPoints,checkerBlank:true});
  const report = {checkedAt:new Date().toISOString(),scope:"Local file parsing and in-memory scoring/draw only. No database or production writes.",checks};
  await fs.writeFile(path.join(root,"support/hasil-verifikasi.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
