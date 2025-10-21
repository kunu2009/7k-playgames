
const STATS_KEY_PREFIX = '7k-game-stats-';

interface GameStats {
  highScore: number;
  timesPlayed: number;
}

const getGameStats = (gameId: string): GameStats => {
  try {
    const item = window.localStorage.getItem(`${STATS_KEY_PREFIX}${gameId}`);
    const defaultStats = { highScore: 0, timesPlayed: 0 };
    return item ? { ...defaultStats, ...JSON.parse(item) } : defaultStats;
  } catch (error) {
    console.error(`Error reading stats for ${gameId}`, error);
    return { highScore: 0, timesPlayed: 0 };
  }
};

const incrementTimesPlayed = (gameId: string): void => {
  const stats = getGameStats(gameId);
  stats.timesPlayed += 1;
  try {
    window.localStorage.setItem(`${STATS_KEY_PREFIX}${gameId}`, JSON.stringify(stats));
  } catch (error) {
    console.error(`Error saving stats for ${gameId}`, error);
  }
};

const updateHighScore = (gameId: string, newScore: number): number => {
  const stats = getGameStats(gameId);
  if (newScore > stats.highScore) {
    stats.highScore = newScore;
    try {
      window.localStorage.setItem(`${STATS_KEY_PREFIX}${gameId}`, JSON.stringify(stats));
    } catch (error) {
      console.error(`Error saving stats for ${gameId}`, error);
    }
  }
  return stats.highScore;
};

export const statsManager = {
  getGameStats,
  incrementTimesPlayed,
  updateHighScore,
};
