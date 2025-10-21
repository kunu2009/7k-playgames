import React, { useState, useEffect } from 'react';
import ParticleBackground from './ParticleBackground';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setFade(true);
    }, 2500);

    const timer2 = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-b from-gable-green to-chathams-blue flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${fade ? 'opacity-0' : 'opacity-100'}`}
    >
      <ParticleBackground />
      <div className="relative z-10 text-center">
        <h1 className="text-6xl md:text-8xl font-orbitron font-bold text-timberwolf tracking-widest animate-fade-in-slow" style={{ textShadow: '0 0 10px #36d7b7, 0 0 20px #36d7b7, 0 0 30px #36d7b7' }}>
          7K GAMES
        </h1>
        <p className="text-lg md:text-xl font-poppins text-bali-hai mt-4 tracking-wider animate-tagline">
          Play. Compete. Create. — The 7K Way.
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;