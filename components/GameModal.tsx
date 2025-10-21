import React, { useState, useEffect } from 'react';
import { Game } from '../types';
import CloseIcon from './icons/CloseIcon';
import { statsManager } from '../utils/statsManager';

interface GameModalProps {
  game: Game;
  onClose: () => void;
  onPlay: (game: Game) => void;
}

const GameModal: React.FC<GameModalProps> = ({ game, onClose, onPlay }) => {
  const [stats, setStats] = useState({ highScore: 0, timesPlayed: 0 });

  useEffect(() => {
    if (game) {
      setStats(statsManager.getGameStats(game.id));
    }
  }, [game]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-chathams-blue to-gable-green rounded-2xl w-full max-w-md lg:max-w-3xl max-h-[90vh] overflow-y-auto shadow-neon-teal border border-calypso relative animate-modal-pop-in"
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
            
            <div className="mb-6 pt-4 border-t border-calypso/30">
              <h3 className="text-lg font-orbitron text-bali-hai mb-2">Stats</h3>
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-2xl font-bold text-timberwolf">{stats.highScore.toLocaleString()}</div>
                  <div className="text-xs text-regent-gray">High Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-timberwolf">{stats.timesPlayed.toLocaleString()}</div>
                  <div className="text-xs text-regent-gray">Times Played</div>
                </div>
              </div>
            </div>

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
