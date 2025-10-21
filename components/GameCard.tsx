import React from 'react';
import { Game } from '../types';
import StarIcon from './icons/StarIcon';
import UsersIcon from './icons/UsersIcon';

interface GameCardProps {
  game: Game;
  isFavorite: boolean;
  onSelect: (game: Game) => void;
  onFavoriteToggle: (id: string) => void;
  onHover: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, isFavorite, onSelect, onFavoriteToggle, onHover }) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle(game.id);
  };

  return (
    <div 
      className="bg-calypso/20 rounded-xl overflow-hidden shadow-glow hover:shadow-glow-hover border border-calypso/30 cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-2 group relative"
      onClick={() => onSelect(game)}
      onMouseEnter={onHover}
    >
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-gable-green via-gable-green/50 to-transparent z-10"></div>
      <img src={game.coverArt} alt={game.title} className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-110" />
      
      <div className="p-4 relative z-20">
        <h3 className="text-lg font-bold font-orbitron text-timberwolf truncate">{game.title}</h3>
        <p className="text-sm text-regent-gray mt-1 h-10">{game.tagline}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2 text-bali-hai text-xs font-semibold">
            <UsersIcon className="w-4 h-4" />
            <span>{game.mode}</span>
          </div>
        </div>
      </div>
       <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 z-30 p-2 bg-black/30 rounded-full transition-all duration-300 hover:bg-black/50"
          aria-label="Toggle Favorite"
        >
          <StarIcon className={`w-5 h-5 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`} />
        </button>

      <div className="absolute top-0 left-0 w-full h-full rounded-xl ring-1 ring-inset ring-calypso/20 group-hover:ring-calypso/80 transition-all duration-300"></div>
    </div>
  );
};

export default GameCard;
