"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { requireDeveloperAccess } from "@/lib/developer-access";
import { deleteEvents } from "@/lib/flexible/store";
import { parseDeletionRequest } from "@/lib/flexible/bulk-delete";
import { RuleError } from "@/lib/flexible/model";

export type BulkDeleteState = { error?: string; message?: string };

export async function bulkDeleteEvents(_previous: BulkDeleteState, form: FormData): Promise<BulkDeleteState> {
  await requireAuth();
  try {
    await requireDeveloperAccess();
    const selection = parseDeletionRequest(String(form.get("selection") ?? ""), form.get("confirmation"));
    await deleteEvents(selection);
    revalidatePath("/", "layout");
    return { message: `${selection.length} turnamen dihapus permanen. Arsip lama tidak diubah.` };
  } catch (error) {
    return { error: error instanceof RuleError ? error.message : "Penghapusan belum berhasil. Muat ulang daftar sebelum mencoba lagi." };
  }
}
