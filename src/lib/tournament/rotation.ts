export type RotationParticipant = {
  id: string;
  name: string;
  communityId: string | null;
  seedOrder?: number | null;
};

export type PreviousTable = {
  roundNumber: number;
  tableNumber: number;
  players: RotationParticipant[];
};

export type GeneratedTable = {
  tableNumber: number;
  players: RotationParticipant[];
};

export type RotationWarning = {
  type: "REPEATED_MEETING_PREVIOUS_ROUND" | "REPEATED_MEETING_ANY_ROUND" | "SAME_COMMUNITY" | "TABLE_SIZE";
  tableNumber: number;
  message: string;
  participantIds?: string[];
  communityId?: string;
};

type MeetingInfo = {
  count: number;
  rounds: number[];
};

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

export function splitIntoTables(
  participants: RotationParticipant[],
  tableCount: number
): GeneratedTable[] {
  const tables: GeneratedTable[] = Array.from({ length: tableCount }, (_, index) => ({
    tableNumber: index + 1,
    players: [],
  }));

  participants.forEach((participant, index) => {
    tables[index % tableCount].players.push(participant);
  });

  return tables;
}

export function spreadParticipantsByCommunity(
  participants: RotationParticipant[]
): RotationParticipant[] {
  const communityMap = new Map<string, RotationParticipant[]>();

  for (const participant of participants) {
    const key = participant.communityId ?? `unknown-${participant.id}`;
    communityMap.set(key, [...(communityMap.get(key) ?? []), participant]);
  }

  let groups = [...communityMap.values()].sort((a, b) => b.length - a.length);
  const result: RotationParticipant[] = [];

  while (groups.some((group) => group.length > 0)) {
    for (const group of groups) {
      const participant = group.shift();
      if (participant) result.push(participant);
    }

    groups = groups.sort((a, b) => b.length - a.length);
  }

  return result.map((participant, index) => ({
    ...participant,
    seedOrder: participant.seedOrder ?? index + 1,
  }));
}

export function sortBySeedOrder(participants: RotationParticipant[]) {
  return [...participants].sort((a, b) => {
    const aSeed = a.seedOrder ?? 999999;
    const bSeed = b.seedOrder ?? 999999;
    if (aSeed !== bSeed) return aSeed - bSeed;
    return a.name.localeCompare(b.name);
  });
}

export function generatePatternRotation({
  participants,
  tableCount,
  playersPerTable,
  roundNumber,
}: {
  participants: RotationParticipant[];
  tableCount: number;
  playersPerTable: number;
  roundNumber: number;
}): GeneratedTable[] {
  const totalNeeded = tableCount * playersPerTable;

  if (participants.length !== totalNeeded) {
    return splitIntoTables(participants, tableCount);
  }

  const roundOffset = Math.max(0, roundNumber - 1);

  return Array.from({ length: tableCount }, (_, tableIndex) => {
    const players: RotationParticipant[] = [];

    for (let column = 0; column < playersPerTable; column++) {
      const participantIndex =
        column * tableCount +
        ((tableIndex + column * roundOffset) % tableCount);
      players.push(participants[participantIndex]);
    }

    return {
      tableNumber: tableIndex + 1,
      players,
    };
  });
}

export function createPairKey(participantIdA: string, participantIdB: string): string {
  return [participantIdA, participantIdB].sort().join("__");
}

export function buildMeetingMap(previousTables: PreviousTable[]) {
  const meetingMap = new Map<string, MeetingInfo>();

  for (const table of previousTables) {
    for (let i = 0; i < table.players.length; i++) {
      for (let j = i + 1; j < table.players.length; j++) {
        const key = createPairKey(table.players[i].id, table.players[j].id);
        const existing = meetingMap.get(key) ?? { count: 0, rounds: [] };
        existing.count += 1;
        existing.rounds.push(table.roundNumber);
        meetingMap.set(key, existing);
      }
    }
  }

  return meetingMap;
}

export function calculateRotationPenalty({
  tables,
  meetingMap,
  currentRoundNumber,
  playersPerTable,
}: {
  tables: GeneratedTable[];
  meetingMap: Map<string, MeetingInfo>;
  currentRoundNumber: number;
  playersPerTable: number;
}) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];

  for (const table of tables) {
    const community = calculateCommunityPenalty(table);
    penalty += community.penalty;
    warnings.push(...community.warnings);

    const meetings = calculateRepeatedMeetingPenalty({
      table,
      meetingMap,
      currentRoundNumber,
    });
    penalty += meetings.penalty;
    warnings.push(...meetings.warnings);

    const size = calculateTableSizePenalty(table, playersPerTable);
    penalty += size.penalty;
    warnings.push(...size.warnings);
  }

  return { penalty, warnings };
}

export function calculateCommunityPenalty(table: GeneratedTable) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];
  const communityMap = new Map<string, RotationParticipant[]>();

  for (const player of table.players) {
    if (!player.communityId) continue;
    communityMap.set(player.communityId, [...(communityMap.get(player.communityId) ?? []), player]);
  }

  for (const [communityId, players] of communityMap.entries()) {
    const count = players.length;
    if (count <= 1) continue;

    if (count === 2) penalty += 100;
    else if (count === 3) penalty += 400;
    else if (count === 4) penalty += 800;
    else penalty += 1500;

    warnings.push({
      type: "SAME_COMMUNITY",
      tableNumber: table.tableNumber,
      communityId,
      participantIds: players.map((player) => player.id),
      message: `Meja ${table.tableNumber} memiliki ${count} peserta dari komunitas/sektor yang sama.`,
    });
  }

  return { penalty, warnings };
}

export function calculateRepeatedMeetingPenalty({
  table,
  meetingMap,
  currentRoundNumber,
}: {
  table: GeneratedTable;
  meetingMap: Map<string, MeetingInfo>;
  currentRoundNumber: number;
}) {
  let penalty = 0;
  const warnings: RotationWarning[] = [];
  const previousRoundNumber = currentRoundNumber - 1;

  for (let i = 0; i < table.players.length; i++) {
    for (let j = i + 1; j < table.players.length; j++) {
      const playerA = table.players[i];
      const playerB = table.players[j];
      const meetingInfo = meetingMap.get(createPairKey(playerA.id, playerB.id));
      if (!meetingInfo) continue;

      if (meetingInfo.rounds.includes(previousRoundNumber)) {
        penalty += 1000;
        warnings.push({
          type: "REPEATED_MEETING_PREVIOUS_ROUND",
          tableNumber: table.tableNumber,
          participantIds: [playerA.id, playerB.id],
          message: `${playerA.name} dan ${playerB.name} sudah bertemu di babak sebelumnya.`,
        });
      } else {
        penalty += 500 * meetingInfo.count;
        warnings.push({
          type: "REPEATED_MEETING_ANY_ROUND",
          tableNumber: table.tableNumber,
          participantIds: [playerA.id, playerB.id],
          message: `${playerA.name} dan ${playerB.name} pernah bertemu ${meetingInfo.count} kali sebelumnya.`,
        });
      }
    }
  }

  return { penalty, warnings };
}

export function calculateTableSizePenalty(table: GeneratedTable, playersPerTable: number) {
  const count = table.players.length;
  if (count === playersPerTable) return { penalty: 0, warnings: [] as RotationWarning[] };

  let penalty = 1000;
  if (Math.abs(count - playersPerTable) === 1) penalty = 50;

  return {
    penalty,
    warnings: [
      {
        type: "TABLE_SIZE" as const,
        tableNumber: table.tableNumber,
        message: `Meja ${table.tableNumber} berisi ${count} peserta.`,
      },
    ],
  };
}

export function getRotationQuality(penalty: number) {
  if (penalty === 0) return "EXCELLENT";
  if (penalty <= 500) return "GOOD";
  if (penalty <= 1500) return "FAIR";
  return "NEED_REVIEW";
}

export function swapPlayers({
  tables,
  tableAIndex,
  playerAIndex,
  tableBIndex,
  playerBIndex,
}: {
  tables: GeneratedTable[];
  tableAIndex: number;
  playerAIndex: number;
  tableBIndex: number;
  playerBIndex: number;
}) {
  const result = tables.map((table) => ({
    ...table,
    players: [...table.players],
  }));

  const playerA = result[tableAIndex].players[playerAIndex];
  const playerB = result[tableBIndex].players[playerBIndex];

  result[tableAIndex].players[playerAIndex] = playerB;
  result[tableBIndex].players[playerBIndex] = playerA;

  return result;
}

export function addSmallRandomVariation({
  tables,
  swapCount = 8,
}: {
  tables: GeneratedTable[];
  swapCount?: number;
}) {
  let result = tables.map((table) => ({
    ...table,
    players: [...table.players],
  }));

  if (result.length < 2) return result;

  for (let i = 0; i < swapCount; i++) {
    const tableAIndex = Math.floor(Math.random() * result.length);
    let tableBIndex = Math.floor(Math.random() * result.length);

    while (tableBIndex === tableAIndex) {
      tableBIndex = Math.floor(Math.random() * result.length);
    }

    const playerAIndex = Math.floor(Math.random() * result[tableAIndex].players.length);
    const playerBIndex = Math.floor(Math.random() * result[tableBIndex].players.length);

    result = swapPlayers({
      tables: result,
      tableAIndex,
      playerAIndex,
      tableBIndex,
      playerBIndex,
    });
  }

  return result;
}

export function improveByLocalSwap({
  tables,
  meetingMap,
  currentRoundNumber,
  playersPerTable,
  maxIterations = 150,
}: {
  tables: GeneratedTable[];
  meetingMap: Map<string, MeetingInfo>;
  currentRoundNumber: number;
  playersPerTable: number;
  maxIterations?: number;
}) {
  let currentTables = tables.map((table) => ({
    ...table,
    players: [...table.players],
  }));

  let currentResult = calculateRotationPenalty({
    tables: currentTables,
    meetingMap,
    currentRoundNumber,
    playersPerTable,
  });

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let bestSwap:
      | null
      | {
          tableAIndex: number;
          playerAIndex: number;
          tableBIndex: number;
          playerBIndex: number;
          penalty: number;
        } = null;

    for (let tableAIndex = 0; tableAIndex < currentTables.length; tableAIndex++) {
      for (let playerAIndex = 0; playerAIndex < currentTables[tableAIndex].players.length; playerAIndex++) {
        for (let tableBIndex = tableAIndex + 1; tableBIndex < currentTables.length; tableBIndex++) {
          for (let playerBIndex = 0; playerBIndex < currentTables[tableBIndex].players.length; playerBIndex++) {
            const candidateTables = swapPlayers({
              tables: currentTables,
              tableAIndex,
              playerAIndex,
              tableBIndex,
              playerBIndex,
            });
            const candidateResult = calculateRotationPenalty({
              tables: candidateTables,
              meetingMap,
              currentRoundNumber,
              playersPerTable,
            });

            if (candidateResult.penalty < currentResult.penalty) {
              if (!bestSwap || candidateResult.penalty < bestSwap.penalty) {
                bestSwap = {
                  tableAIndex,
                  playerAIndex,
                  tableBIndex,
                  playerBIndex,
                  penalty: candidateResult.penalty,
                };
              }
            }
          }
        }
      }
    }

    if (!bestSwap) break;

    currentTables = swapPlayers({
      tables: currentTables,
      tableAIndex: bestSwap.tableAIndex,
      playerAIndex: bestSwap.playerAIndex,
      tableBIndex: bestSwap.tableBIndex,
      playerBIndex: bestSwap.playerBIndex,
    });

    currentResult = calculateRotationPenalty({
      tables: currentTables,
      meetingMap,
      currentRoundNumber,
      playersPerTable,
    });

    if (currentResult.penalty === 0) break;
  }

  return {
    tables: currentTables,
    totalPenalty: currentResult.penalty,
    warnings: currentResult.warnings,
    quality: getRotationQuality(currentResult.penalty),
  };
}

export function generateRotation({
  participants,
  previousTables,
  tableCount,
  playersPerTable,
  currentRoundNumber,
  variationSwapCount = 0,
  maxIterations = 150,
}: {
  participants: RotationParticipant[];
  previousTables: PreviousTable[];
  tableCount: number;
  playersPerTable: number;
  currentRoundNumber: number;
  variationSwapCount?: number;
  maxIterations?: number;
}) {
  const meetingMap = buildMeetingMap(previousTables);
  const seededParticipants = participants.every((participant) => participant.seedOrder)
    ? sortBySeedOrder(participants)
    : spreadParticipantsByCommunity(participants);

  const patternTables = generatePatternRotation({
    participants: seededParticipants,
    tableCount,
    playersPerTable,
    roundNumber: currentRoundNumber,
  });

  const baseTables =
    variationSwapCount > 0
      ? addSmallRandomVariation({ tables: patternTables, swapCount: variationSwapCount })
      : patternTables;

  const improved = improveByLocalSwap({
    tables: baseTables,
    meetingMap,
    currentRoundNumber,
    playersPerTable,
    maxIterations,
  });

  return {
    ...improved,
    seededParticipants,
  };
}
