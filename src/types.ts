export interface Score {
  id: number;
  name: string;
  score: number;
  level: number;
  created_at: string;
}

export type GameState = 'START' | 'PLAYING' | 'GAME_OVER' | 'LEVEL_UP' | 'LEADERBOARD';
