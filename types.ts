
export enum GameType {
  SOLO = 'SOLO',
  MULTIPLAYER = 'MULTIPLAYER',
}

export interface Game {
  id: string;
  title: string;
  tagline: string;
  mode: string;
  type: GameType;
  description: string;
  coverArt: string;
  controls?: string;
}