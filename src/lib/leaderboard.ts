export type LeaderboardEntry = {
  rank: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  isYou: boolean;
};

export type LeaderboardData = { entries: LeaderboardEntry[] };
