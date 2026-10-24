import { isAuthenticated } from "@/lib/auth";
import { getEvent } from "@/lib/flexible/store";
import { standingsSnapshot } from "@/lib/flexible/standings-data";
import { createStandingsPdf, standingsPublicUrl, standingsPdfResponse, standingsPdfError } from "@/lib/flexible/standings-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    if (!(await isAuthenticated())) return standingsPdfError("Sesi berakhir. Masuk kembali untuk mengunduh klasemen.", 401);
    const { tournamentId } = await params;
    const event = await getEvent(tournamentId);
    if (!event) return standingsPdfError("Turnamen tidak ditemukan.", 404);
    const pdf = await createStandingsPdf({ ...standingsSnapshot(event.data), publicUrl: standingsPublicUrl(event.data.standingsShareCode, event.data.standingsShareToken) });
    return standingsPdfResponse(pdf, event.data.settings.name);
  } catch {
    console.error("Gagal membuat PDF klasemen panitia.");
    return standingsPdfError("PDF belum berhasil dibuat. Coba lagi atau hubungi pengelola.", 500);
  }
}
