
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- CONSTANTS ---
const ASPECT_RATIO = 1; // Square canvas
const ORIGINAL_WIDTH = 800;
const MAX_HEALTH = 5000;
const PLAYER_COLORS = ['#36d7b7', '#ff6347', '#9370db', '#f0e68c'];

// --- TYPES ---
type GameState = 'start' | 'playing' | 'end';
interface DamageNumber {
  id: number;
  x: number;
  y: number;
  amount: number;
  life: number;
  color: string;
}

// --- GAME COMPONENT ---
const TapTitans: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>('start');
  const [bossHealth, setBossHealth] = useState(MAX_HEALTH);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const sounds = useSounds(SOUND_EFFECTS);

  const damageNumbers = useRef<DamageNumber[]>([]);
  const bossHitAnim = useRef(0);

  const c = useRef({ width: 800, height: 800, scale: 1 });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    c.current = { width, height, scale: width / ORIGINAL_WIDTH };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);
  
  const resetGame = useCallback(() => {
    setBossHealth(MAX_HEALTH);
    setScores([0, 0, 0, 0]);
    damageNumbers.current = [];
    setGameState('start');
  }, []);

  const handleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();

    const rect = canvasRef.current!.getBoundingClientRect();
    const touches = 'touches' in e ? e.touches : [e];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        let playerIndex = -1;
        if (x < c.current.width / 2 && y < c.current.height / 2) playerIndex = 0; // Top-left
        else if (x > c.current.width / 2 && y < c.current.height / 2) playerIndex = 1; // Top-right
        else if (x < c.current.width / 2 && y > c.current.height / 2) playerIndex = 2; // Bottom-left
        else if (x > c.current.width / 2 && y > c.current.height / 2) playerIndex = 3; // Bottom-right

        if (playerIndex !== -1) {
            sounds.hover();
            const damage = 5 + Math.floor(Math.random() * 5);
            setBossHealth(h => Math.max(0, h - damage));
            setScores(s => {
                const newScores = [...s];
                newScores[playerIndex] += damage;
                return newScores;
            });
            damageNumbers.current.push({
                id: Math.random(),
                x: c.current.width / 2 + (Math.random() - 0.5) * 100,
                y: c.current.height / 2 + (Math.random() - 0.5) * 100,
                amount: damage,
                life: 60,
                color: PLAYER_COLORS[playerIndex],
            });
            bossHitAnim.current = 1;
        }
    }
  }, [gameState, sounds]);

  useEffect(() => {
    if(bossHealth <= 0 && gameState === 'playing') {
        sounds.favorite();
        setGameState('end');
    }
  }, [bossHealth, gameState, sounds]);

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
      const { width, height, scale } = c.current;
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0,0,width,height);
      
      // Draw player zones
      for(let i=0; i<4; i++) {
          ctx.fillStyle = PLAYER_COLORS[i];
          ctx.globalAlpha = 0.15;
          const x = (i % 2) * (width / 2);
          const y = Math.floor(i / 2) * (height / 2);
          ctx.fillRect(x, y, width/2, height/2);
      }
      ctx.globalAlpha = 1;

      if(bossHitAnim.current > 0) bossHitAnim.current -= 0.05;
      
      // Draw Boss
      const bossSize = (width / 4) + (bossHitAnim.current * 10 * scale);
      ctx.fillStyle = '#d3d0cb'; ctx.shadowColor = '#d3d0cb'; ctx.shadowBlur = 30 * scale;
      ctx.beginPath();
      ctx.arc(width/2, height/2, bossSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw damage numbers
      damageNumbers.current = damageNumbers.current.filter(d => d.life > 0);
      damageNumbers.current.forEach(d => {
          d.life--; d.y -= 1;
          ctx.font = `700 ${24 * scale}px Orbitron`;
          ctx.fillStyle = d.color;
          ctx.globalAlpha = d.life / 60;
          ctx.fillText(d.amount.toString(), d.x, d.y);
      });
      ctx.globalAlpha = 1;

      // UI
      // Boss Health Bar
      const barWidth = width * 0.8;
      ctx.fillStyle = '#ff6347';
      ctx.fillRect(width * 0.1, height * 0.05, barWidth, 30 * scale);
      ctx.fillStyle = '#36d7b7';
      ctx.fillRect(width * 0.1, height * 0.05, barWidth * (bossHealth / MAX_HEALTH), 30 * scale);
      
      // Scores
      ctx.fillStyle = '#d3d0cb';
      ctx.font = `700 ${24 * scale}px Orbitron`;
      ctx.textAlign = 'left';
      ctx.fillText(`P1: ${scores[0]}`, 20*scale, height - 20 * scale);
      ctx.fillText(`P3: ${scores[2]}`, 20*scale, 40 * scale);
      ctx.textAlign = 'right';
      ctx.fillText(`P2: ${scores[1]}`, width - 20*scale, height - 20 * scale);
      ctx.fillText(`P4: ${scores[3]}`, width - 20*scale, 40 * scale);

      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = '';
        if(gameState === 'start') {
            title = 'Tap Titans'; subtitle = 'Tap your corner to attack! Tap to Start.';
        } else {
            const winner = scores.indexOf(Math.max(...scores)) + 1;
            title = 'Titan Defeated!'; subtitle = `Player ${winner} did the most damage! Tap to play again.`;
        }
        ctx.font = `700 ${50 * scale}px Orbitron`; ctx.fillText(title, width/2, height/2 - 20*scale);
        ctx.font = `400 ${25 * scale}px Poppins`; ctx.fillText(subtitle, width/2, height/2 + 30*scale);
      }

      animFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, bossHealth, scores]);
  
  const handleInteractionStart = () => {
    if(gameState !== 'playing') {
        sounds.click();
        resetGame();
        setGameState('playing');
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer" style={{touchAction: 'none'}}>
      <canvas ref={canvasRef} 
        onTouchStart={handleTap} 
        onMouseDown={e => {
            handleTap(e);
            handleInteractionStart();
        }}
        className="bg-gable-green rounded-lg shadow-glow w-full h-full" 
      />
    </div>
  );
};

export default TapTitans;
