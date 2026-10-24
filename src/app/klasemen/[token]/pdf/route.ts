import { getSharedStandings } from "@/lib/flexible/store";
import { createStandingsPdf, standingsPublicUrl, standingsPdfResponse, standingsPdfError } from "@/lib/flexible/standings-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const event = await getSharedStandings(token);
    if (!event) return standingsPdfError("Link klasemen tidak aktif.", 404);
    const pdf = await createStandingsPdf({ ...event, publicUrl: standingsPublicUrl(event.shortCode, token) });
    return standingsPdfResponse(pdf, event.name);
  } catch {
    console.error("Gagal membuat PDF klasemen publik.");
    return standingsPdfError("PDF belum berhasil dibuat. Coba lagi atau hubungi panitia.", 500);
  }
}
