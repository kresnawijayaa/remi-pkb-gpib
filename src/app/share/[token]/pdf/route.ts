import { getSharedEvent } from "@/lib/flexible/store";
import { createSchedulePdf } from "@/lib/flexible/schedule-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function filename(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || "turnamen-remi";
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const event = await getSharedEvent(token);
    if (!event) return new Response("Link pembagian tidak aktif.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    const requestUrl = new URL(request.url);
    const round = Number(requestUrl.searchParams.get("round"));
    const draw = event.draws.find(item => item.number === round);
    if (!draw) return new Response("Babak tidak ditemukan atau belum dikunci.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    const publicPath = event.shortCode ? `/m/${event.shortCode}` : `/share/${token}`;
    const pdf = await createSchedulePdf({ name: event.name, draw, participants: event.participants, publicUrl: new URL(publicPath, requestUrl.origin).toString() });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pembagian-meja-${filename(event.name)}-babak-${draw.number}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Gagal membuat PDF pembagian meja", error);
    return new Response("PDF belum berhasil dibuat. Silakan coba lagi atau hubungi panitia.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
}
