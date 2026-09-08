"use client";

import { useState } from "react";
import { ActionForm, Confirm, SendButton } from "./form";

export function DevScoreTools({ eventId, version, round, lockedRounds }: { eventId: string; version: number; round: number; lockedRounds: number }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2147483647));
  return <details className="neo-panel neo-disclosure neo-dev"><summary>Developer tools · skor simulasi</summary><p>Isi semua meja secara otomatis untuk testing atau demo. Hasil sebelumnya pada babak yang dipilih akan ditimpa.</p><ActionForm eventId={eventId} version={version} operation="dev-score" round={round}><div className="neo-fields"><label>Cakupan<select name="scope" defaultValue="all"><option value="all">Semua babak terkunci ({lockedRounds})</option><option value="round">Babak {round} saja</option></select></label><label>Profil skor<select name="profile" defaultValue="normal"><option value="normal">Normal · skor berbeda</option><option value="ties">Dengan skor seri</option></select></label><label>PIN developer<input name="developerPin" type="password" required autoComplete="off" /></label></div><input type="hidden" name="seed" value={seed} /><div className="neo-actions"><button type="button" className="neo-button neo-secondary" onClick={() => setSeed(Math.floor(Math.random() * 2147483647))}>Acak skenario</button></div><Confirm>Timpa skor pada cakupan yang dipilih dengan data simulasi.</Confirm><SendButton>Isi skor simulasi</SendButton></ActionForm></details>;
}
