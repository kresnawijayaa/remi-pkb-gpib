import { getSharedEvent } from "@/lib/flexible/store";
import { createSchedulePdf } from "@/lib/flexible/schedule-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function filename(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || "turnamen-remi";
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const event = await getSharedEvent(token);
  if (!event) return new Response("Link pembagian tidak aktif.", { status: 404 });
  const requestUrl = new URL(request.url);
  const round = Number(requestUrl.searchParams.get("round"));
  const draw = event.draws.find(item => item.number === round);
  if (!draw) return new Response("Babak tidak ditemukan atau belum dikunci.", { status: 404 });
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
}
