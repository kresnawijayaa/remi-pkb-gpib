"use client";

import { useMemo, useState } from "react";
import { buildDistribution, type DistributionProfile } from "@/lib/flexible/dev-seed";
import { ActionForm, Confirm, SendButton } from "./form";

export function DevTools({ eventId, version, remaining }: { eventId: string; version: number; remaining: number }) {
  const [count, setCount] = useState(Math.min(remaining, 100));
  const [communities, setCommunities] = useState(10);
  const [profile, setProfile] = useState<DistributionProfile>("realistic");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2147483647));
  const distribution = useMemo(() => buildDistribution(Math.max(1, count), communities, profile, seed), [count, communities, profile, seed]);
  return <details className="neo-panel neo-disclosure neo-dev"><summary>Developer tools</summary><p>Isi data uji kombinatorial dengan distribusi komunitas yang tidak merata untuk menguji shuffle.</p><ActionForm eventId={eventId} version={version} operation="dev-seed"><div className="neo-fields"><label>Jumlah peserta<input name="count" type="number" min="1" max={remaining} value={count} onChange={event => setCount(Number(event.target.value))} /></label><label>Jumlah komunitas<input name="communityCount" type="number" min="2" max="30" value={communities} onChange={event => setCommunities(Number(event.target.value))} /></label><label>Profil distribusi<select name="profile" value={profile} onChange={event => setProfile(event.target.value as DistributionProfile)}><option value="realistic">Realistis (long tail)</option><option value="extreme">Ekstrem (satu sektor dominan)</option><option value="random">Acak tidak merata</option></select></label><label>PIN developer<input name="developerPin" type="password" required autoComplete="off" /></label></div><input type="hidden" name="seed" value={seed} /><div className="neo-distribution">{distribution.map((value, index) => <span key={index} style={{ height: `${Math.max(8, value / Math.max(...distribution) * 100)}%` }} title={`Sektor Uji ${index + 1}: ${value}`}><small>{value}</small></span>)}</div><div className="neo-actions"><button className="neo-button neo-secondary" type="button" onClick={() => setSeed(Math.floor(Math.random() * 2147483647))}>Acak distribusi</button></div><Confirm>Tambahkan data uji ke daftar peserta saat ini.</Confirm><SendButton disabled={remaining < 1}>Tambahkan data uji</SendButton></ActionForm></details>;
}
