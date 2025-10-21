
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- CONSTANTS ---
const ASPECT_RATIO = 1.2;
const ORIGINAL_WIDTH = 800;
const GRID_SIZE = 9;
const PLAYER_COLORS = ['#36d7b7', '#ff6347'];

// --- TYPES ---
type GameState = 'start' | 'playing' | 'end';
type TileState = 'stable' | 'cracking' | 'gone';
interface Tile {
  state: TileState;
  timer: number;
}
interface Player {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

// --- GAME COMPONENT ---
const LastSquareStanding: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [winner, setWinner] = useState<number | null>(null);

  const grid = useRef<Tile[][]>([]);
  const players = useRef<Player[]>([]);
  const lastMoveTime = useRef([0,0]);
  const sounds = useSounds(SOUND_EFFECTS);

  const c = useRef({ width: 800, height: 667, scale: 1, cellSize: 0, gridX: 0, gridY: 0 });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / ORIGINAL_WIDTH;
    const gridSize = Math.min(width, height) * 0.9;
    c.current = { width, height, scale, cellSize: gridSize / GRID_SIZE, gridX: (width - gridSize)/2, gridY: (height-gridSize)/2 };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);
  
  const resetGame = useCallback(() => {
    grid.current = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0).map(() => ({ state: 'stable', timer: 0 })));
    players.current = [
        { x: 1, y: Math.floor(GRID_SIZE/2), alive: true, color: PLAYER_COLORS[0] },
        { x: GRID_SIZE - 2, y: Math.floor(GRID_SIZE/2), alive: true, color: PLAYER_COLORS[1] }
    ];
    setWinner(null);
    setGameState('start');
  }, []);

  const movePlayer = useCallback((playerIndex: number, dx: number, dy: number) => {
    if(gameState !== 'playing') return;
    const now = Date.now();
    if(now - lastMoveTime.current[playerIndex] < 200) return;

    const p = players.current[playerIndex];
    if(!p.alive) return;
    
    const newX = p.x + dx;
    const newY = p.y + dy;
    
    if (newX < 0 || newY < 0 || newX >= GRID_SIZE || newY >= GRID_SIZE || grid.current[newY][newX].state === 'gone') return;
    
    const otherPlayer = players.current[1-playerIndex];
    if(newX === otherPlayer.x && newY === otherPlayer.y) {
        // Push logic
        const pushToX = otherPlayer.x + dx;
        const pushToY = otherPlayer.y + dy;
        if(pushToX < 0 || pushToY < 0 || pushToX >= GRID_SIZE || pushToY >= GRID_SIZE || grid.current[pushToY][pushToX].state !== 'stable') {
            // Can't push, invalid move
            return;
        }
        sounds.filter();
        otherPlayer.x = pushToX;
        otherPlayer.y = pushToY;
    }
    
    sounds.hover();
    grid.current[p.y][p.x].state = 'cracking';
    grid.current[p.y][p.x].timer = 60; // Start countdown
    p.x = newX;
    p.y = newY;
    lastMoveTime.current[playerIndex] = now;
  }, [gameState, sounds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if(gameState !== 'playing') return;
        switch(e.key.toLowerCase()) {
            case 'w': movePlayer(0, 0, -1); break;
            case 's': movePlayer(0, 0, 1); break;
            case 'a': movePlayer(0, -1, 0); break;
            case 'd': movePlayer(0, 1, 0); break;
            case 'arrowup': movePlayer(1, 0, -1); break;
            case 'arrowdown': movePlayer(1, 0, 1); break;
            case 'arrowleft': movePlayer(1, -1, 0); break;
            case 'arrowright': movePlayer(1, 1, 0); break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, movePlayer]);

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
      const { width, height, scale, cellSize, gridX, gridY } = c.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0, 0, width, height);

      if (gameState === 'playing') {
        grid.current.forEach(row => row.forEach(tile => {
            if(tile.state === 'cracking') {
                tile.timer--;
                if(tile.timer <= 0) {
                    sounds.favorite();
                    tile.state = 'gone';
                }
            }
        }));
        players.current.forEach(p => {
            if(p.alive && grid.current[p.y][p.x].state === 'gone') {
                p.alive = false;
            }
        });

        const alivePlayers = players.current.filter(p => p.alive);
        if(alivePlayers.length <= 1) {
            setWinner(alivePlayers[0] ? players.current.indexOf(alivePlayers[0]) : null);
            setGameState('end');
        }
      }
      
      // Drawing
      for(let y = 0; y < GRID_SIZE; y++) for(let x = 0; x < GRID_SIZE; x++) {
        const tile = grid.current[y][x];
        if (tile.state === 'gone') continue;
        const colorIntensity = Math.floor(211 - (60 - tile.timer) * 2);
        ctx.fillStyle = tile.state === 'cracking' ? `rgb(${colorIntensity}, ${colorIntensity}, ${colorIntensity-20})` : '#d3d0cb';
        ctx.fillRect(gridX + x * cellSize + 2, gridY + y * cellSize + 2, cellSize - 4, cellSize - 4);
      }

      players.current.forEach(p => {
        if(!p.alive) return;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(gridX + (p.x + 0.5) * cellSize, gridY + (p.y + 0.5) * cellSize, cellSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = '';
        if (gameState === 'start') {
            title = 'Last Square Standing'; subtitle = 'P1: WASD | P2: Arrows. Tap to start.';
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
  }, [gameState, winner, sounds]);

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

export default LastSquareStanding;
