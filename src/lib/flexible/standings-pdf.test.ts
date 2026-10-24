import assert from "node:assert/strict";
import test from "node:test";
import { upgradeEventData } from "./model";
import { standingsSnapshot } from "./standings-data";
import { createStandingsPdf, standingsPdfError, standingsPdfResponse, standingsPublicUrl } from "./standings-pdf";
import { NextRequest } from "next/server";
import { middleware } from "../../../middleware";

function snapshot(count: number) {
  const participants = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, number: i + 1, name: `Peserta ${String(i + 1).padStart(3, "0")}`, communityId: "c1" }));
  const data = upgradeEventData({ settings: { name: "Uji PDF Klasemen", target: Math.max(count, 2), rounds: 5, capacity: 5, advancing: 20 }, participants, communities: [{ id: "c1", name: "Sektor 1", normalizedName: "sektor 1" }], results: Array.from({ length: Math.ceil(count / 5) }, (_, i) => ({ round: 1, table: i + 1, submittedAt: "2026-10-24T00:00:00Z", scores: participants.slice(i * 5, i * 5 + 5).map((person, rank) => ({ participantId: person.id, score: 900 - Number(person.number) * 10, tableRank: rank + 1, tournamentPoint: 5 - rank })) })) });
  return standingsSnapshot(data);
}

test("PDF snapshot uses the existing standings order, saved results, and round history", () => {
  const data = snapshot(10);
  assert.equal(data.standings.length, 10);
  assert.equal(data.standings[0].name, "Peserta 001");
  assert.equal(data.standings[1].name, "Peserta 006");
  assert.equal(data.completedTables, 2);
  assert.equal(data.final, false);
  assert.deepEqual(data.standings[0].history, [{ round: 1, table: 1, score: 890, tableRank: 1, points: 5 }]);
});

test("standings PDF paginates 200 participants and includes canonical and church links", async () => {
  const pdf = await createStandingsPdf({ ...snapshot(200), publicUrl: standingsPublicUrl("261024-101500", "test-token"), downloadedAt: new Date("2026-10-24T03:15:00Z") });
  const source = pdf.toString("latin1");
  assert(source.startsWith("%PDF-"));
  const pages = (source.match(/\/Type \/Page\b/g) ?? []).length;
  assert(pages >= 10 && pages <= 20, `Unexpected page count: ${pages}`);
  assert(source.includes("/URI (https://remi.gpibharapanindah.org/k/261024-101500)"));
  assert(source.includes("/URI (https://gpibharapanindah.org)"));
  assert(!source.includes("0.0.0.0"));
});

test("empty standings produce one PDF page and work without a public link", async () => {
  const pdf = await createStandingsPdf({ ...snapshot(0), publicUrl: null });
  assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length, 1);
  assert(pdf.toString("latin1").includes("/URI (https://remi.gpibharapanindah.org/aturan)"));
  assert.equal(standingsPublicUrl(null, null), null);
  assert.equal(standingsPublicUrl(null, "a".repeat(48)), `https://remi.gpibharapanindah.org/klasemen/${"a".repeat(48)}`);
});

test("PDF responses download as a PDF, never cache, and sanitize filenames", async () => {
  const response = standingsPdfResponse(Buffer.from("%PDF-test"), 'Tes\r\n" .pdf');
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="klasemen-tes-pdf.pdf"');
  assert(response.headers.get("cache-control")?.includes("no-store"));
  assert.equal(standingsPdfError("Tidak aktif", 404).status, 404);
  assert.equal(standingsPdfError("Masuk kembali", 401).status, 401);
  assert.equal(standingsPdfError("Coba lagi", 500).headers.get("x-content-type-options"), "nosniff");
});

test("public standings/PDF/shortlinks bypass login while admin PDF remains protected", async () => {
  const original = process.env.REMI_AUTH_ENABLED;
  process.env.REMI_AUTH_ENABLED = "true";
  try {
    for (const path of ["/klasemen/test", "/klasemen/test/pdf", "/k/261024-101500", "/m/261024-101500"]) {
      const response = await middleware(new NextRequest(`https://remi.gpibharapanindah.org${path}`));
      assert.equal(response.headers.get("x-middleware-next"), "1");
    }
    const response = await middleware(new NextRequest("https://remi.gpibharapanindah.org/tournaments/test/standings/pdf"));
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location")!).pathname, "/login");
  } finally {
    if (original === undefined) delete process.env.REMI_AUTH_ENABLED;
    else process.env.REMI_AUTH_ENABLED = original;
  }
});
