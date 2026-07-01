export type TournamentStatus = "draft" | "active" | "finished" | "cancelled";
export type RoundType = "qualification" | "final";
export type RoundStatus = "draft" | "active" | "locked" | "cancelled";
export type TableStatus = "draft" | "submitted" | "locked";

export type Tournament = {
  id: string;
  name: string;
  eventDate: string | null;
  location: string | null;
  status: TournamentStatus;
  qualificationRoundCount: number;
  playersPerTable: number;
  finalistCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Community = {
  id: string;
  tournamentId: string;
  name: string;
  normalizedName: string;
};

export type Participant = {
  id: string;
  tournamentId: string;
  communityId: string | null;
  communityName: string | null;
  seedOrder: number | null;
  participantNumber: number;
  name: string;
  phone: string | null;
  status: "active" | "withdrawn" | "disqualified";
};

export type Round = {
  id: string;
  tournamentId: string;
  roundNumber: number;
  roundType: RoundType;
  status: RoundStatus;
  rotationPenalty: number | null;
  rotationQuality: string | null;
  rotationWarnings: RotationWarningSummary[];
  lockedAt: string | null;
};

export type RotationWarningSummary = {
  type: "REPEATED_MEETING_PREVIOUS_ROUND" | "REPEATED_MEETING_ANY_ROUND" | "SAME_COMMUNITY" | "TABLE_SIZE";
  tableNumber: number;
  message: string;
  participantIds?: string[];
  communityId?: string;
};

export type MatchTable = {
  id: string;
  tournamentId: string;
  roundId: string;
  tableNumber: number;
  tableName: string | null;
  status: TableStatus;
  submittedAt: string | null;
};

export type TablePlayer = {
  id: string;
  tournamentId: string;
  roundId: string;
  roundNumber?: number;
  tableId: string;
  participantId: string;
  participantName: string;
  participantNumber: number;
  communityName: string | null;
  seatNumber: number;
  score: number | null;
  tableRank: number | null;
  tournamentPoint: number | null;
};

export type StandingRow = {
  participantId: string;
  participantNumber: number;
  name: string;
  communityName: string | null;
  totalPoint: number;
  totalScore: number;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
  rounds: Record<number, { score: number; tableRank: number; tournamentPoint: number }>;
};
