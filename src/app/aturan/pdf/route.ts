import { createCompetitionRulesPdf } from "@/lib/flexible/competition-rules-pdf";

export const runtime = "nodejs";
// Public, generic rulebook only. No tournament data or authentication cookies.
export async function GET() {
  try {
    const pdf = await createCompetitionRulesPdf();
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="aturan-pertandingan-remi-v1.pdf"', "Cache-Control": "public, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Gagal membuat PDF aturan pertandingan", error);
    return new Response("PDF aturan belum dapat dibuat. Silakan coba lagi.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
}
