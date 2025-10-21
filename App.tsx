import React, { useState, useMemo, useCallback } from 'react';
import { Game, GameType } from './types';
import { ALL_GAMES } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
import FilterTabs from './components/FilterTabs';
import GameCard from './components/GameCard';
import GameModal from './components/GameModal';
import ParticleBackground from './components/ParticleBackground';
import SplashScreen from './components/SplashScreen';
import GameContainer from './components/GameContainer';
import { useSounds } from './hooks/useSounds';
import { SOUND_EFFECTS } from './utils/sounds';

type FilterType = 'ALL' | GameType | 'FAVORITES';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [favorites, setFavorites] = useLocalStorage<string[]>('7k-favorites', []);
  const sounds = useSounds(SOUND_EFFECTS);

  const handleFavoriteToggle = useCallback((gameId: string) => {
    sounds.favorite();
    setFavorites(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  }, [setFavorites, sounds]);
  
  const filteredGames = useMemo(() => {
    switch (filter) {
      case 'SOLO':
        return ALL_GAMES.filter(g => g.type === GameType.SOLO);
      case 'MULTIPLAYER':
        return ALL_GAMES.filter(g => g.type === GameType.MULTIPLAYER);
      case 'FAVORITES':
        return ALL_GAMES.filter(g => favorites.includes(g.id));
      default:
        return ALL_GAMES;
    }
  }, [filter, favorites]);
  
  const handlePlayGame = useCallback((game: Game) => {
    setSelectedGame(null);
    setActiveGame(game);
  }, []);

  const handleExitGame = useCallback(() => {
    setActiveGame(null);
  }, []);

  const handleFilterChange = (newFilter: FilterType) => {
    sounds.filter();
    setFilter(newFilter);
  };

  const handleCardSelect = (game: Game) => {
    sounds.click();
    setSelectedGame(game);
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (activeGame) {
    return <GameContainer game={activeGame} onExit={handleExitGame} />;
  }

  return (
    <div className="bg-gradient-to-b from-gable-green to-chathams-blue min-h-screen font-poppins text-timberwolf overflow-hidden relative">
      <ParticleBackground />
      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FilterTabs activeFilter={filter} onFilterChange={handleFilterChange} />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8 mt-8">
            {filteredGames.map(game => (
              <GameCard 
                key={game.id}
                game={game}
                isFavorite={favorites.includes(game.id)}
                onSelect={handleCardSelect}
                onFavoriteToggle={handleFavoriteToggle}
                onHover={sounds.hover}
              />
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-bali-hai">No Games Found</h2>
              <p className="text-regent-gray mt-2">Try selecting a different category or adding some favorites!</p>
            </div>
          )}
        </main>
      </div>

      {selectedGame && (
        <GameModal 
          game={selectedGame} 
          onClose={() => setSelectedGame(null)} 
          onPlay={handlePlayGame}
        />
      )}
    </div>
  );
}

export default App;
