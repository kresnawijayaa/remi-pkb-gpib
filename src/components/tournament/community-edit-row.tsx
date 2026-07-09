"use client";

import { useEffect, useState } from "react";
import { deleteCommunityAction, updateCommunityAction } from "@/app/actions";
import type { Community } from "@/types/tournament";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CommunityEditRow({
  tournamentId,
  community,
  participantCount,
}: {
  tournamentId: string;
  community: Community;
  participantCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(community.name);

  useEffect(() => {
    setName(community.name);
    setEditing(false);
  }, [community.name]);

  const dirty = name !== community.name;

  const resetEdit = () => {
    setName(community.name);
    setEditing(false);
  };

  return (
    <div className={cn("grid gap-2 p-3 lg:grid-cols-[minmax(0,1fr)_120px_72px_72px] lg:items-center", editing && "bg-secondary/30")}>
      <form action={updateCommunityAction} className="contents">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="communityId" value={community.id} />
        <Input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!editing}
          required
          aria-label="Nama komunitas"
        />
        <div className="text-sm text-muted-foreground">{participantCount} peserta</div>
        {!editing ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : dirty ? (
          <SubmitButton size="sm" variant="outline" pendingText="...">
            Simpan
          </SubmitButton>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={resetEdit}>
            Batal
          </Button>
        )}
      </form>
      <form
        action={deleteCommunityAction}
        onSubmit={(event) => {
          if (!window.confirm(`Hapus komunitas ${community.name}? Peserta di komunitas ini akan menjadi tanpa komunitas.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="communityId" value={community.id} />
        <SubmitButton size="sm" variant="ghost" pendingText="...">
          Hapus
        </SubmitButton>
      </form>
    </div>
  );
}
