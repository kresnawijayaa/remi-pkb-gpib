import { notFound, redirect } from "next/navigation";
import { getPublicTokenByShortCode } from "@/lib/flexible/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = await getPublicTokenByShortCode("standings", code);
  if (!token) notFound();
  redirect(`/klasemen/${token}`);
}
