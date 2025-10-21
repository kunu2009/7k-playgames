
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- CONSTANTS ---
const ASPECT_RATIO = 1.6;
const ORIGINAL_WIDTH = 1280;
const PLAYER_COLORS = ['#36d7b7', '#ff6347'];

// --- TYPES ---
type GameState = 'start' | 'playing' | 'end';
interface Tank {
  id: number;
  x: number; y: number;
  angle: number;
  speed: number;
  alive: boolean;
  color: string;
  shootCooldown: number;
}
interface Bullet {
  x: number; y: number;
  angle: number;
  speed: number;
  ownerId: number;
}
interface Particle {
  x: number, y: number, vx: number, vy: number, life: number, color: string
}

// --- GAME COMPONENT ---
const TankRoyale: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [winner, setWinner] = useState<number | null>(null);

  const tanks = useRef<Tank[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const sounds = useSounds(SOUND_EFFECTS);

  const c = useRef({ width: 1280, height: 800, scale: 1, tankSize: 0, bulletSize: 0 });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / ORIGINAL_WIDTH;
    c.current = { width, height, scale, tankSize: 40 * scale, bulletSize: 5 * scale };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);
  
  const resetGame = useCallback(() => {
    const { width, height, tankSize } = c.current;
    tanks.current = [
      { id: 0, x: tankSize*2, y: height/2, angle: 0, speed: 0, alive: true, color: PLAYER_COLORS[0], shootCooldown: 0 },
      { id: 1, x: width - tankSize*2, y: height/2, angle: Math.PI, speed: 0, alive: true, color: PLAYER_COLORS[1], shootCooldown: 0 },
    ];
    bullets.current = [];
    particles.current = [];
    setWinner(null);
    setGameState('start');
  }, []);
  
  const createExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 30; i++) {
        particles.current.push({
            x, y, color,
            vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
            life: Math.random() * 50 + 20,
        });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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
    const gameLoop = () => {
      const { width, height, scale, tankSize, bulletSize } = c.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#366e8d'; ctx.lineWidth = 10 * scale;
      ctx.strokeRect(0,0,width,height);

      if (gameState === 'playing') {
        const p1Keys = { up: 'w', down: 's', left: 'a', right: 'd', fire: ' ' };
        const p2Keys = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', fire: 'enter' };
        
        tanks.current.forEach((tank, index) => {
          if (!tank.alive) return;
          const keys = index === 0 ? p1Keys : p2Keys;
          
          if (keysPressed.current[keys.up]) tank.speed = 3 * scale;
          else if (keysPressed.current[keys.down]) tank.speed = -2 * scale;
          else tank.speed = 0;
          
          if (keysPressed.current[keys.left]) tank.angle -= 0.05;
          if (keysPressed.current[keys.right]) tank.angle += 0.05;

          tank.x += Math.cos(tank.angle) * tank.speed;
          tank.y += Math.sin(tank.angle) * tank.speed;
          
          tank.x = Math.max(tankSize, Math.min(width - tankSize, tank.x));
          tank.y = Math.max(tankSize, Math.min(height - tankSize, tank.y));
          
          if (tank.shootCooldown > 0) tank.shootCooldown--;
          if (keysPressed.current[keys.fire] && tank.shootCooldown === 0) {
            sounds.hover();
            bullets.current.push({
              x: tank.x + Math.cos(tank.angle) * tankSize,
              y: tank.y + Math.sin(tank.angle) * tankSize,
              angle: tank.angle,
              speed: 8 * scale,
              ownerId: tank.id
            });
            tank.shootCooldown = 40;
          }
        });

        bullets.current.forEach((b, bIndex) => {
          b.x += Math.cos(b.angle) * b.speed;
          b.y += Math.sin(b.angle) * b.speed;
          
          if (b.x < bulletSize || b.x > width - bulletSize) { b.angle = Math.PI - b.angle; sounds.filter(); }
          if (b.y < bulletSize || b.y > height - bulletSize) { b.angle = -b.angle; sounds.filter(); }

          tanks.current.forEach(tank => {
            if (!tank.alive || tank.id === b.ownerId) return;
            if (Math.hypot(b.x - tank.x, b.y - tank.y) < tankSize / 1.5) {
              tank.alive = false;
              sounds.favorite();
              createExplosion(tank.x, tank.y, tank.color);
              bullets.current.splice(bIndex, 1);
            }
          });
        });

        const aliveTanks = tanks.current.filter(t => t.alive);
        if(aliveTanks.length <= 1) {
            setWinner(aliveTanks[0]?.id ?? null);
            setGameState('end');
        }
      }

      bullets.current.forEach(b => {
        ctx.fillStyle = PLAYER_COLORS[b.ownerId];
        ctx.beginPath(); ctx.arc(b.x, b.y, bulletSize, 0, Math.PI * 2); ctx.fill();
      });

      tanks.current.forEach(tank => {
        if (!tank.alive) return;
        ctx.save();
        ctx.translate(tank.x, tank.y);
        ctx.rotate(tank.angle);
        ctx.fillStyle = tank.color;
        ctx.fillRect(-tankSize/2, -tankSize/2, tankSize, tankSize);
        ctx.fillStyle = '#d3d0cb';
        ctx.fillRect(0, -tankSize/8, tankSize*0.8, tankSize/4);
        ctx.restore();
      });
      
      particles.current = particles.current.filter(p => p.life > 0);
      particles.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.globalAlpha = p.life / 60; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
      ctx.globalAlpha = 1;

      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = '';
        if(gameState === 'start') {
            title = 'Tank Royale'; subtitle = 'P1: WASD+Space | P2: Arrows+Enter. Tap to start.';
        } else {
            title = winner !== null ? `Player ${winner + 1} Wins!` : 'Draw!';
            subtitle = 'Tap to play again.';
        }
        ctx.font = `700 ${50 * scale}px Orbitron`; ctx.fillText(title, width/2, height/2 - 20*scale);
        ctx.font = `400 ${25 * scale}px Poppins`; ctx.fillText(subtitle, width/2, height/2 + 30*scale);
      }
      animFrameId = requestAnimationFrame(gameLoop);
    };
    gameLoop();
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, winner, sounds, createExplosion]);

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

export default TankRoyale;
