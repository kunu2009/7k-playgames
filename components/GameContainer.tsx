import React from 'react';
import { Game } from '../types';
import ParticleBackground from './ParticleBackground';
import PingPong from './games/PingPong';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface GameContainerProps {
  game: Game;
  onExit: () => void;
}

const GameContainer: React.FC<GameContainerProps> = ({ game, onExit }) => {
  const renderGame = () => {
    switch (game.id) {
      case 'ping-pong':
        return <PingPong />;
      // Add other game components here
      default:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold font-orbitron">Coming Soon!</h2>
            <p className="text-bali-hai mt-2">The game "{game.title}" is under construction.</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-gradient-to-b from-gable-green to-chathams-blue min-h-screen font-poppins text-timberwolf overflow-hidden relative flex flex-col items-center justify-center">
      <ParticleBackground />
      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={onExit}
          className="flex items-center space-x-2 px-4 py-2 bg-calypso/50 hover:bg-calypso/80 rounded-lg transition-all duration-300"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back to Hub</span>
        </button>
      </div>
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {renderGame()}
      </div>
    </div>
  );
};

export default GameContainer;
