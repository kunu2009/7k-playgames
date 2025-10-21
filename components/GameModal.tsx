import React from 'react';
import { Game } from '../types';
import CloseIcon from './icons/CloseIcon';

interface GameModalProps {
  game: Game;
  onClose: () => void;
  onPlay: (game: Game) => void;
}

const GameModal: React.FC<GameModalProps> = ({ game, onClose, onPlay }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-chathams-blue to-gable-green rounded-2xl w-full max-w-md lg:max-w-3xl max-h-[90vh] overflow-y-auto shadow-neon-teal border border-calypso relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-bali-hai hover:text-timberwolf transition-colors z-10"
          aria-label="Close"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="grid lg:grid-cols-2 gap-0">
          <div className="lg:rounded-l-2xl overflow-hidden">
            <img src={game.coverArt} alt={`${game.title} cover`} className="w-full h-64 lg:h-full object-cover" />
          </div>
          <div className="p-8 flex flex-col">
            <h2 className="text-3xl font-bold font-orbitron text-timberwolf mb-2">{game.title}</h2>
            <div className="text-sm font-semibold text-calypso mb-4">{game.mode}</div>
            <p className="text-bali-hai flex-grow mb-6">{game.description}</p>
            <button 
              className="mt-auto w-full bg-calypso text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-opacity-90 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-bali-hai"
              onClick={() => onPlay(game)}
            >
              Play Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModal;