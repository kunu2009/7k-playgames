
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';
import { statsManager } from '../../utils/statsManager';

// --- CONSTANTS ---
const ASPECT_RATIO = 800 / 500;
const ORIGINAL_WIDTH = 800;
const MAX_HEALTH = 100;
const PLAYER_DAMAGE = 15;
const AI_DAMAGE = 10;
const PARRY_WINDOW = 250; // ms
const STRIKE_WINDOW = 800; // ms

// --- TYPES ---
type GameState = 'start' | 'playing' | 'win' | 'lose';
type AIState = 'idle' | 'telegraphing' | 'attacking' | 'vulnerable' | 'hit';

// --- GAME COMPONENT ---
const ShadowDuel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>('start');
  const [playerHealth, setPlayerHealth] = useState(MAX_HEALTH);
  const [aiHealth, setAIHealth] = useState(MAX_HEALTH);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const sounds = useSounds(SOUND_EFFECTS);
  const aiState = useRef<AIState>('idle');
  const aiActionTimeout = useRef<number | null>(null);
  const lastParryTime = useRef(0);
  const playerHitAnim = useRef(0);
  const aiHitAnim = useRef(0);
  
  // Scalable dimensions
  const c = useRef({
    width: 800, height: 500, scale: 1,
    floorY: 0, playerX: 0, aiX: 0, charWidth: 0, charHeight: 0,
  });

  useEffect(() => {
    setHighScore(statsManager.getGameStats('shadow-duel').highScore);
  }, []);

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / ORIGINAL_WIDTH;
    c.current = {
      width, height, scale,
      floorY: height * 0.85,
      playerX: width * 0.25,
      aiX: width * 0.75,
      charWidth: 80 * scale,
      charHeight: 150 * scale,
    };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);

  const resetGame = useCallback(() => {
    if (aiActionTimeout.current) clearTimeout(aiActionTimeout.current);
    setPlayerHealth(MAX_HEALTH);
    setAIHealth(MAX_HEALTH);
    aiState.current = 'idle';
    setScore(0);
    setGameState('start');
  }, []);

  const aiThink = useCallback(() => {
    if (aiState.current !== 'idle' || gameState !== 'playing') return;
    
    aiState.current = 'telegraphing';
    aiActionTimeout.current = window.setTimeout(() => {
      aiState.current = 'attacking';
      
      aiActionTimeout.current = window.setTimeout(() => {
        const parrySuccess = Date.now() - lastParryTime.current < PARRY_WINDOW;
        if (parrySuccess) {
          sounds.filter();
          aiState.current = 'vulnerable';
          aiActionTimeout.current = window.setTimeout(aiThink, STRIKE_WINDOW);
        } else {
          sounds.favorite();
          playerHitAnim.current = 1;
          setPlayerHealth(h => Math.max(0, h - AI_DAMAGE));
          aiState.current = 'idle';
          aiActionTimeout.current = window.setTimeout(aiThink, 1000);
        }
      }, 300); // Attack duration
    }, Math.random() * 1500 + 800); // Telegraph duration
  }, [gameState, sounds]);

  const handleParry = () => {
    if (gameState !== 'playing') return;
    lastParryTime.current = Date.now();
  };

  const handleStrike = () => {
    if (gameState !== 'playing' || aiState.current !== 'vulnerable') return;
    sounds.click();
    if (aiActionTimeout.current) clearTimeout(aiActionTimeout.current);
    aiHitAnim.current = 1;
    setAIHealth(h => Math.max(0, h - PLAYER_DAMAGE));
    setScore(s => s + 100);
    aiState.current = 'hit';
    aiActionTimeout.current = window.setTimeout(() => {
      aiState.current = 'idle';
      aiThink();
    }, 500);
  };
  
  useEffect(() => {
    if (gameState === 'playing' && aiState.current === 'idle') {
      aiActionTimeout.current = window.setTimeout(aiThink, 1500);
    }
    if (playerHealth <= 0) {
      if (aiActionTimeout.current) clearTimeout(aiActionTimeout.current);
      const newHighScore = statsManager.updateHighScore('shadow-duel', score);
      setHighScore(newHighScore);
      setGameState('lose');
    }
    if (aiHealth <= 0) {
      if (aiActionTimeout.current) clearTimeout(aiActionTimeout.current);
      setScore(s => s + 500); // Bonus for winning
      const newHighScore = statsManager.updateHighScore('shadow-duel', score + 500);
      setHighScore(newHighScore);
      setGameState('win');
    }
    return () => { if (aiActionTimeout.current) clearTimeout(aiActionTimeout.current); };
  }, [gameState, aiThink, playerHealth, aiHealth, score]);

  useEffect(() => {
    updateConstants();
    resetGame();
    window.addEventListener('resize', updateConstants);
    return () => window.removeEventListener('resize', updateConstants);
  }, [resetGame, updateConstants]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let animFrameId: number;
    const draw = () => {
      const { width, height, scale, floorY, playerX, aiX, charWidth, charHeight } = c.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#0f1e26'; ctx.fillRect(0, floorY, width, height - floorY);
      
      if (playerHitAnim.current > 0) playerHitAnim.current -= 0.05;
      if (aiHitAnim.current > 0) aiHitAnim.current -= 0.05;

      // Draw Player
      ctx.save();
      ctx.translate(playerX, floorY - charHeight);
      if (playerHitAnim.current > 0) ctx.translate((Math.random()-0.5) * 10 * scale, (Math.random()-0.5) * 10 * scale);
      ctx.fillStyle = '#36d7b7'; ctx.shadowColor = '#36d7b7'; ctx.shadowBlur = 20 * scale;
      ctx.fillRect(0, 0, charWidth, charHeight); ctx.restore();

      // Draw AI
      ctx.save();
      ctx.translate(aiX, floorY - charHeight);
      if (aiHitAnim.current > 0) ctx.translate((Math.random()-0.5) * 10 * scale, (Math.random()-0.5) * 10 * scale);
      let aiColor = '#ff6347';
      if(aiState.current === 'telegraphing') aiColor = '#f0e68c';
      if(aiState.current === 'vulnerable') aiColor = '#87ceeb';
      ctx.fillStyle = aiColor; ctx.shadowColor = aiColor; ctx.shadowBlur = 20 * scale;
      ctx.fillRect(0, 0, charWidth, charHeight); ctx.restore();

      ctx.shadowBlur = 0;
      // Health Bars
      const barWidth = width * 0.4; const barHeight = 25 * scale;
      ctx.fillStyle = '#0f1e26';
      ctx.fillRect(width * 0.05, 20 * scale, barWidth, barHeight);
      ctx.fillRect(width * 0.95 - barWidth, 20 * scale, barWidth, barHeight);
      ctx.fillStyle = '#36d7b7';
      ctx.fillRect(width * 0.05, 20 * scale, barWidth * (playerHealth / MAX_HEALTH), barHeight);
      ctx.fillStyle = '#ff6347';
      ctx.fillRect(width * 0.95 - barWidth, 20 * scale, barWidth * (aiHealth / MAX_HEALTH), barHeight);

      // Score
      ctx.fillStyle = '#d3d0cb'; ctx.textAlign = 'center';
      ctx.font = `700 ${24 * scale}px Orbitron`;
      ctx.fillText(`Score: ${score}`, width/2, 45*scale);

      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = `High Score: ${highScore}`;
        switch(gameState) {
            case 'start': title = 'Shadow Duel'; subtitle = 'Parry the telegraphed attack, then Strike!'; break;
            case 'win': title = 'You are Victorious!'; subtitle = `Final Score: ${score}`; break;
            case 'lose': title = 'You have been Defeated'; subtitle = `Final Score: ${score}`; break;
        }
        ctx.font = `700 ${50 * scale}px Orbitron`; ctx.fillText(title, width / 2, height / 2 - 20 * scale);
        ctx.font = `400 ${25 * scale}px Poppins`; ctx.fillText(subtitle, width / 2, height / 2 + 30 * scale);
      }
      animFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, playerHealth, aiHealth, score, highScore]);

  const handleStart = () => {
    if(gameState !== 'playing') {
        sounds.click();
        resetGame();
        setGameState('playing');
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer font-poppins relative">
      <canvas ref={canvasRef} onClick={handleStart} className="bg-gable-green rounded-lg shadow-glow w-full h-full" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-4">
        <button onClick={handleParry} className="px-8 py-4 bg-calypso text-white font-bold rounded-lg shadow-lg text-xl uppercase hover:bg-opacity-90 active:scale-95 transition-all">Parry</button>
        <button onClick={handleStrike} className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg shadow-lg text-xl uppercase hover:bg-opacity-90 active:scale-95 transition-all">Strike</button>
      </div>
    </div>
  );
};

export default ShadowDuel;
