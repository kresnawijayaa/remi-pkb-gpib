export type ScoreInput = { id: string; score: string };

export function scoreEntryState(inputs: ScoreInput[], manual: Record<string, string>) {
  const complete = inputs.length > 0 && inputs.every(item => item.score.trim() !== "" && Number.isInteger(Number(item.score)) && Math.abs(Number(item.score)) <= 999999);
  const rows = inputs.map(item => {
    if (!complete) return { id: item.id, tied: false, options: [] as number[], rank: "", group: "" };
    const score = Number(item.score);
    const peers = inputs.filter(other => Number(other.score) === score);
    const first = 1 + inputs.filter(other => Number(other.score) > score).length;
    const options = peers.map((_, index) => first + index);
    const tied = peers.length > 1;
    const rank = tied ? manual[item.id] ?? "" : String(first);
    return { id: item.id, tied, options, rank, group: JSON.stringify([score, options, peers.map(peer => peer.id).sort()]) };
  });
  const valid = complete && rows.every(row => row.rank !== "" && row.options.includes(Number(row.rank))) && new Set(rows.map(row => row.rank)).size === inputs.length;
  return { complete, rows, valid };
}

export function reconcileManualRanks(before: ScoreInput[], after: ScoreInput[], manual: Record<string, string>) {
  const previous = scoreEntryState(before, manual);
  const current = scoreEntryState(after, manual);
  return Object.fromEntries(current.rows.filter(row => row.tied && row.group === previous.rows.find(item => item.id === row.id)?.group).map(row => [row.id, manual[row.id] ?? ""]));
}
