import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "Pertandingan lama adalah arsip baca-saja." }, { status: 410 });
}
