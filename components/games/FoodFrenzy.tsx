
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- CONSTANTS ---
const ASPECT_RATIO = 800 / 600;
const ORIGINAL_WIDTH = 800;
const PLAYER_COLORS = ['#36d7b7', '#ff6347', '#9370db'];
const FOOD_ICONS = ['🍎', '🍌', '🍇', '🍉', '🍓'];
const NUM_PLAYERS = 3;

// --- TYPES ---
type GameState = 'start' | 'playing' | 'end';
interface Player {
  x: number;
  score: number;
  color: string;
}
interface Food {
  x: number;
  y: number;
  vy: number;
  icon: string;
  color: string;
}

// --- GAME COMPONENT ---
const FoodFrenzy: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [scores, setScores] = useState([0,0,0]);
  const [timeLeft, setTimeLeft] = useState(60);

  const players = useRef<Player[]>([]);
  const foodItems = useRef<Food[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const sounds = useSounds(SOUND_EFFECTS);

  const c = useRef({ width: 800, height: 600, scale: 1, plateWidth: 0, plateHeight: 0 });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / ORIGINAL_WIDTH;
    c.current = { width, height, scale, plateWidth: 100 * scale, plateHeight: 20 * scale };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);
  
  const resetGame = useCallback(() => {
    players.current = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      players.current.push({
        x: (c.current.width / (NUM_PLAYERS + 1)) * (i + 1),
        score: 0,
        color: PLAYER_COLORS[i],
      });
    }
    foodItems.current = [];
    setScores([0,0,0]);
    setTimeLeft(60);
    setGameState('start');
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
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft <= 0 && gameState === 'playing') {
      setGameState('end');
    }
  }, [gameState, timeLeft]);

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
      const { width, height, scale, plateWidth } = c.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0, 0, width, height);
      
      if (gameState === 'playing') {
        // Player movement
        const playerSpeed = 8 * scale;
        if(keysPressed.current['a']) players.current[0].x -= playerSpeed;
        if(keysPressed.current['d']) players.current[0].x += playerSpeed;
        if(keysPressed.current['j']) players.current[1].x -= playerSpeed;
        if(keysPressed.current['l']) players.current[1].x += playerSpeed;
        if(keysPressed.current['arrowleft']) players.current[2].x -= playerSpeed;
        if(keysPressed.current['arrowright']) players.current[2].x += playerSpeed;

        players.current.forEach(p => {
            p.x = Math.max(plateWidth/2, Math.min(width - plateWidth/2, p.x));
        });

        // Food logic
        if (Math.random() < 0.1) {
            foodItems.current.push({
                x: Math.random() * width, y: -20, vy: (Math.random() * 3 + 2) * scale,
                icon: FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)],
                color: PLAYER_COLORS[Math.floor(Math.random() * NUM_PLAYERS)],
            });
        }
        
        foodItems.current.forEach((food, fIndex) => {
            food.y += food.vy;
            if(food.y > height) foodItems.current.splice(fIndex, 1);

            players.current.forEach((p, pIndex) => {
                if(food.y > height - 50 * scale && Math.abs(food.x - p.x) < plateWidth / 2) {
                    if(food.color === p.color) {
                        sounds.click();
                        p.score += 10;
                    } else {
                        sounds.favorite();
                        p.score -= 5;
                    }
                    foodItems.current.splice(fIndex, 1);
                    setScores(players.current.map(pl => pl.score));
                }
            });
        });
      }

      // Drawing
      players.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - plateWidth / 2, height - 40 * scale, plateWidth, c.current.plateHeight);
      });
      foodItems.current.forEach(f => {
        ctx.font = `${40 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(f.icon, f.x, f.y);
      });

      // UI
      ctx.fillStyle = '#d3d0cb';
      ctx.font = `700 ${24 * scale}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.fillText(`Time: ${timeLeft}`, width / 2, 40 * scale);
      players.current.forEach((p, i) => {
        ctx.fillStyle = p.color;
        ctx.fillText(`P${i+1}: ${p.score}`, (width / (NUM_PLAYERS + 1)) * (i+1), 80*scale);
      });

      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = '';
        if (gameState === 'start') {
            title = 'Food Frenzy'; subtitle = 'P1:A/D | P2:J/L | P3:Arrows. Tap to Start.';
        } else {
            const winner = scores.indexOf(Math.max(...scores)) + 1;
            title = 'Time\'s Up!'; subtitle = `Player ${winner} wins with ${Math.max(...scores)} points! Tap to play again.`;
        }
        ctx.font = `700 ${50 * scale}px Orbitron`; ctx.fillText(title, width/2, height/2 - 20*scale);
        ctx.font = `400 ${25 * scale}px Poppins`; ctx.fillText(subtitle, width/2, height/2 + 30*scale);
      }
      animFrameId = requestAnimationFrame(gameLoop);
    };
    gameLoop();
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, scores, timeLeft, sounds]);

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

export default FoodFrenzy;
