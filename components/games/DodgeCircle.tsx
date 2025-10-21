
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- CONSTANTS ---
const ASPECT_RATIO = 1; // Square
const ORIGINAL_WIDTH = 800;
const PLAYER_COLORS = ['#36d7b7', '#ff6347', '#9370db', '#f0e68c'];
const PLAYER_KEYS = ['a', 'l', 'q', 'p'];
const NUM_PLAYERS = 4;

// --- TYPES ---
type GameState = 'start' | 'playing' | 'end';
interface Player {
  id: number;
  angle: number;
  radius: number;
  speed: number;
  alive: boolean;
  color: string;
}
interface Obstacle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
}

// --- GAME COMPONENT ---
const DodgeCircle: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [winner, setWinner] = useState<number | null>(null);

  const players = useRef<Player[]>([]);
  const obstacles = useRef<Obstacle[]>([]);
  const frameCount = useRef(0);
  const sounds = useSounds(SOUND_EFFECTS);

  const c = useRef({ width: 800, height: 800, scale: 1, centerX: 400, centerY: 400 });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    c.current = { width, height, scale: width / ORIGINAL_WIDTH, centerX: width / 2, centerY: height / 2 };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);
  
  const resetGame = useCallback(() => {
    players.current = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      players.current.push({
        id: i,
        angle: (i / NUM_PLAYERS) * Math.PI * 2,
        radius: c.current.width * 0.35,
        speed: 0.02,
        alive: true,
        color: PLAYER_COLORS[i],
      });
    }
    obstacles.current = [];
    frameCount.current = 0;
    setWinner(null);
    setGameState('start');
  }, []);

  const switchDirection = useCallback((playerIndex: number) => {
    if (gameState !== 'playing' || !players.current[playerIndex]?.alive) return;
    sounds.hover();
    players.current[playerIndex].speed *= -1;
  }, [gameState, sounds]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyIndex = PLAYER_KEYS.indexOf(e.key.toLowerCase());
      if(keyIndex !== -1) {
        switchDirection(keyIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [switchDirection]);

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
      const { width, height, scale, centerX, centerY } = c.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0, 0, width, height);

      if (gameState === 'playing') {
        frameCount.current++;
        if (frameCount.current % 60 === 0) {
          const angle = Math.random() * Math.PI * 2;
          obstacles.current.push({
            x: centerX, y: centerY,
            size: (Math.random() * 15 + 10) * scale,
            vx: Math.cos(angle) * (2 + Math.random()) * scale,
            vy: Math.sin(angle) * (2 + Math.random()) * scale,
          });
        }

        players.current.forEach(p => {
          if (p.alive) p.angle += p.speed;
        });

        obstacles.current.forEach(o => {
          o.x += o.vx; o.y += o.vy;
        });

        let aliveCount = 0;
        let lastAlivePlayer: Player | null = null;
        players.current.forEach(p => {
            if (!p.alive) return;
            const px = centerX + Math.cos(p.angle) * p.radius;
            const py = centerY + Math.sin(p.angle) * p.radius;
            
            for (const o of obstacles.current) {
                const dist = Math.hypot(px - o.x, py - o.y);
                if (dist < o.size + 5 * scale) {
                    p.alive = false;
                    sounds.favorite();
                    break;
                }
            }
            if(p.alive) {
                aliveCount++;
                lastAlivePlayer = p;
            }
        });

        if (aliveCount <= 1 && players.current.length > 1) {
            setWinner(lastAlivePlayer?.id ?? null);
            setGameState('end');
        }
      }

      // Drawing
      obstacles.current.forEach(o => {
          ctx.fillStyle = '#d3d0cb';
          ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2); ctx.fill();
      });
      players.current.forEach(p => {
        if (!p.alive) return;
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * p.radius;
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 15 * scale;
        ctx.beginPath(); ctx.arc(x, y, 10 * scale, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 0;

      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = '';
        if (gameState === 'start') {
            title = 'Dodge Circle';
            subtitle = `P1: A, P2: L, P3: Q, P4: P. Tap to start.`;
        } else if (gameState === 'end') {
            title = winner !== null ? `Player ${winner + 1} Wins!` : 'Draw!';
            subtitle = 'Tap to play again.';
        }
        ctx.font = `700 ${50 * scale}px Orbitron`; ctx.fillText(title, width/2, height/2 - 20*scale);
        ctx.font = `400 ${25 * scale}px Poppins`; ctx.fillText(subtitle, width/2, height/2 + 30*scale);
      }
      animFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, winner]);

  const handleStart = () => {
    if(gameState !== 'playing') {
        sounds.click();
        resetGame();
        setGameState('playing');
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer">
      <canvas ref={canvasRef} onClick={handleStart} className="bg-gable-green rounded-lg shadow-glow w-full h-full" />
    </div>
  );
};

export default DodgeCircle;
