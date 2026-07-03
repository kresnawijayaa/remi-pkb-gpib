"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ViewerLinkModal({ viewerPath }: { viewerPath: string }) {
  const [open, setOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(viewerPath);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setViewerUrl(new URL(viewerPath, window.location.origin).toString());
  }, [viewerPath]);

  async function copyLink() {
    await navigator.clipboard.writeText(viewerUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function openViewer() {
    window.open(viewerUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Viewer
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 px-4 py-6">
          <div className="w-full max-w-xl border border-border bg-card">
            <div className="flex items-start justify-between gap-4 border-b border-border p-4">
              <div>
                <div className="text-xl font-semibold">Link viewer</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Bagikan link ini ke layar/proyektor tanpa meninggalkan halaman admin.
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Tutup
              </Button>
            </div>

            <div className="grid gap-4 p-4">
              <div className="grid gap-2">
                <div className="text-sm font-semibold">URL viewer</div>
                <Input value={viewerUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={copyLink}>
                  {copied ? "Link tersalin" : "Copy link"}
                </Button>
                <Button type="button" onClick={openViewer}>
                  Buka di tab baru
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
