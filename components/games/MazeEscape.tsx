import React, { useRef, useEffect, useState, useCallback } from 'react';

// --- CONSTANTS ---
const ASPECT_RATIO = 1.6;
const ORIGINAL_WIDTH = 1280;
const MAZE_SIZE = 15; // Must be an odd number
const MOVE_COOLDOWN = 120; // ms

// --- TILE TYPES ---
enum Tile {
  WALL, FLOOR, START, EXIT, CRACKED_WALL,
  LASER_ON, LASER_OFF,
  SPIKE_TRAP_OFF, SPIKE_TRAP_ON
}

// --- PLAYER TYPES ---
interface Player {
  id: number;
  x: number;
  y: number;
  color: string;
  abilityCooldown: number;
  lives: number;
}

// --- MOBILE CONTROLS COMPONENT ---
const MobileControls: React.FC<{ onMove: (player: number, dx: number, dy: number) => void, onAction: (player: number) => void }> = ({ onMove, onAction }) => {
  const ControlButton: React.FC<{ onActivate: () => void, children: React.ReactNode, className?: string }> = ({ onActivate, children, className }) => {
    const intervalRef = useRef<number | null>(null);
    const handlePress = () => {
      onActivate();
      intervalRef.current = window.setInterval(onActivate, MOVE_COOLDOWN + 50);
    };
    const handleRelease = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    return (
      <button
        onTouchStart={handlePress} onTouchEnd={handleRelease} onTouchCancel={handleRelease}
        onMouseDown={handlePress} onMouseUp={handleRelease} onMouseLeave={handleRelease}
        className={`w-12 h-12 md:w-16 md:h-16 rounded-full bg-calypso/30 backdrop-blur-sm text-2xl text-white flex items-center justify-center active:bg-calypso/60 ${className}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none md:hidden">
      {/* Player 1 Controls */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <div className="grid grid-cols-3 grid-rows-3 w-40 h-40">
          <div className="col-start-2"><ControlButton onActivate={() => onMove(0, 0, -1)}>↑</ControlButton></div>
          <div className="col-start-1 row-start-2"><ControlButton onActivate={() => onMove(0, -1, 0)}>←</ControlButton></div>
          <div className="col-start-3 row-start-2"><ControlButton onActivate={() => onMove(0, 1, 0)}>→</ControlButton></div>
          <div className="col-start-2 row-start-3"><ControlButton onActivate={() => onMove(0, 0, 1)}>↓</ControlButton></div>
        </div>
        <ControlButton onActivate={() => onAction(0)} className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 !w-16 !h-16">⚡</ControlButton>
      </div>
      {/* Player 2 Controls */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="grid grid-cols-3 grid-rows-3 w-40 h-40">
          <div className="col-start-2"><ControlButton onActivate={() => onMove(1, 0, -1)}>↑</ControlButton></div>
          <div className="col-start-1 row-start-2"><ControlButton onActivate={() => onMove(1, -1, 0)}>←</ControlButton></div>
          <div className="col-start-3 row-start-2"><ControlButton onActivate={() => onMove(1, 1, 0)}>→</ControlButton></div>
          <div className="col-start-2 row-start-3"><ControlButton onActivate={() => onMove(1, 0, 1)}>↓</ControlButton></div>
        </div>
        <ControlButton onActivate={() => onAction(1)} className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 !w-16 !h-16">💥</ControlButton>
      </div>
    </div>
  );
};

// --- MAZE ESCAPE COMPONENT ---
const MazeEscape: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'win' | 'lose'>('start');
  const [maze, setMaze] = useState<Tile[][]>([]);
  const players = useRef<Player[]>([]);

  const c = useRef({ width: 1280, height: 800, scale: 1, cellSize: 0, gridX: 0, gridY: 0 });
  const lastMoveTime = useRef([0, 0]);
  const trapStateCounter = useRef(0);
  const isMobile = useRef(false);

  const generateMaze = useCallback(() => {
    const newMaze: Tile[][] = Array(MAZE_SIZE).fill(0).map(() => Array(MAZE_SIZE).fill(Tile.WALL));
    const stack: [number, number][] = [];
    const startX = 1, startY = 1;
    newMaze[startY][startX] = Tile.FLOOR;
    stack.push([startX, startY]);

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = [];
      for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx > 0 && nx < MAZE_SIZE - 1 && ny > 0 && ny < MAZE_SIZE - 1 && newMaze[ny][nx] === Tile.WALL) {
          neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
        }
      }

      if (neighbors.length > 0) {
        const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
        newMaze[ny][nx] = Tile.FLOOR;
        newMaze[wy][wx] = Tile.FLOOR;
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }
    
    // Place start, exit, and traps
    newMaze[1][1] = Tile.START;
    newMaze[MAZE_SIZE - 2][MAZE_SIZE - 2] = Tile.EXIT;
    for (let i = 0; i < MAZE_SIZE * 2; i++) {
        const x = Math.floor(Math.random() * (MAZE_SIZE - 2)) + 1;
        const y = Math.floor(Math.random() * (MAZE_SIZE - 2)) + 1;
        if(newMaze[y][x] === Tile.FLOOR) {
            const trapType = Math.random();
            if(trapType < 0.2) newMaze[y][x] = Tile.CRACKED_WALL;
            else if(trapType < 0.4) newMaze[y][x] = Tile.LASER_ON;
            else if(trapType < 0.6) newMaze[y][x] = Tile.SPIKE_TRAP_OFF;
        }
    }

    setMaze(newMaze);
  }, []);
  
  const resetGame = useCallback(() => {
    generateMaze();
    players.current = [
        { id: 0, x: 1, y: 1, color: '#36d7b7', abilityCooldown: 0, lives: 3 },
        { id: 1, x: 1, y: 2, color: '#ff6347', abilityCooldown: 0, lives: 3 },
    ];
    setGameState('start');
  }, [generateMaze]);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / ORIGINAL_WIDTH;
    const cellSize = Math.min(width, height) * 0.9 / MAZE_SIZE;
    c.current = { width, height, scale, cellSize, gridX: (width - cellSize * MAZE_SIZE) / 2, gridY: (height - cellSize * MAZE_SIZE) / 2 };
    if(canvasRef.current) { canvasRef.current.width = width; canvasRef.current.height = height; }
  }, []);

  const movePlayer = useCallback((playerIndex: number, dx: number, dy: number) => {
    if (gameState !== 'playing' || !maze.length) return;
    const now = performance.now();
    if (now - lastMoveTime.current[playerIndex] < MOVE_COOLDOWN) return;

    const p = players.current[playerIndex];
    const newX = p.x + dx;
    const newY = p.y + dy;

    if (newX < 0 || newX >= MAZE_SIZE || newY < 0 || newY >= MAZE_SIZE) return;
    
    const targetTile = maze[newY][newX];
    const isPassable = [Tile.FLOOR, Tile.START, Tile.EXIT, Tile.LASER_OFF, Tile.SPIKE_TRAP_OFF, Tile.SPIKE_TRAP_ON].includes(targetTile);
    const otherPlayer = players.current[1 - playerIndex];
    const isOccupied = newX === otherPlayer.x && newY === otherPlayer.y;

    if (isPassable && !isOccupied) {
      p.x = newX;
      p.y = newY;
      lastMoveTime.current[playerIndex] = now;
    }
  }, [gameState, maze]);

  const useAbility = useCallback((playerIndex: number) => {
    if (gameState !== 'playing' || !maze.length) return;
    const now = performance.now();
    const p = players.current[playerIndex];
    if (p.abilityCooldown > now) return;

    for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const ax = p.x + dx, ay = p.y + dy;
        if (ax < 0 || ax >= MAZE_SIZE || ay < 0 || ay >= MAZE_SIZE) continue;
        
        const targetTile = maze[ay][ax];
        if (playerIndex === 0 && targetTile === Tile.LASER_ON) { // Engineer
            maze[ay][ax] = Tile.LASER_OFF;
            p.abilityCooldown = now + 3000;
            setTimeout(() => { if (maze[ay][ax] === Tile.LASER_OFF) maze[ay][ax] = Tile.LASER_ON; }, 5000);
            break;
        } else if (playerIndex === 1 && targetTile === Tile.CRACKED_WALL) { // Brute
            maze[ay][ax] = Tile.FLOOR;
            p.abilityCooldown = now + 1000;
            break;
        }
    }
  }, [gameState, maze]);
  
  useEffect(() => {
    isMobile.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    updateDimensions();
    resetGame();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [resetGame, updateDimensions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if(gameState === 'start') { setGameState('playing'); return; }
        if(gameState !== 'playing') { resetGame(); return; }

        if (e.key === 'w') movePlayer(0, 0, -1);
        else if (e.key === 's') movePlayer(0, 0, 1);
        else if (e.key === 'a') movePlayer(0, -1, 0);
        else if (e.key === 'd') movePlayer(0, 1, 0);
        else if (e.key === ' ') useAbility(0);
        else if (e.key === 'ArrowUp') movePlayer(1, 0, -1);
        else if (e.key === 'ArrowDown') movePlayer(1, 0, 1);
        else if (e.key === 'ArrowLeft') movePlayer(1, -1, 0);
        else if (e.key === 'ArrowRight') movePlayer(1, 1, 0);
        else if (e.key === 'Enter') useAbility(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, movePlayer, useAbility, resetGame]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !maze.length) return;
    let animFrameId: number;

    const TILE_COLORS: Record<Tile, string> = {
      [Tile.WALL]: '#13262f', [Tile.FLOOR]: '#17557b',
      [Tile.START]: '#d3d0cb', [Tile.EXIT]: '#f0e68c',
      [Tile.CRACKED_WALL]: '#3a4a52', [Tile.LASER_ON]: '#ff6347',
      [Tile.LASER_OFF]: '#17557b', [Tile.SPIKE_TRAP_OFF]: '#17557b',
      [Tile.SPIKE_TRAP_ON]: '#regent-gray',
    };

    const draw = (time: number) => {
      const { width, height, scale, cellSize, gridX, gridY } = c.current;
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#0a141a'; ctx.fillRect(0,0,width,height);
      
      // Game logic
      if (gameState === 'playing') {
          trapStateCounter.current++;
          if(trapStateCounter.current % 120 === 60) {
              setMaze(m => m.map(row => row.map(tile => tile === Tile.SPIKE_TRAP_OFF ? Tile.SPIKE_TRAP_ON : tile === Tile.SPIKE_TRAP_ON ? Tile.SPIKE_TRAP_OFF : tile)));
          }

          let p1AtExit = false, p2AtExit = false;
          players.current.forEach(p => {
              const tile = maze[p.y][p.x];
              if (tile === Tile.LASER_ON || tile === Tile.SPIKE_TRAP_ON) {
                  p.lives--;
                  p.x = 1; p.y = p.id === 0 ? 1 : 2;
                  if (p.lives <= 0) setGameState('lose');
              }
              if (tile === Tile.EXIT) {
                  if (p.id === 0) p1AtExit = true; else p2AtExit = true;
              }
          });
          if (p1AtExit && p2AtExit) setGameState('win');
      }

      // Drawing
      for(let y=0; y<MAZE_SIZE; y++) for(let x=0; x<MAZE_SIZE; x++) {
          ctx.fillStyle = TILE_COLORS[maze[y][x]];
          ctx.fillRect(gridX + x * cellSize, gridY + y * cellSize, cellSize, cellSize);
          if (maze[y][x] === Tile.LASER_ON && (Math.floor(time / 200) % 2)) {
             ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
             ctx.fillRect(gridX + x * cellSize, gridY + y * cellSize, cellSize, cellSize);
          }
      }

      players.current.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 15 * scale;
          ctx.beginPath();
          ctx.arc(gridX + (p.x + 0.5) * cellSize, gridY + (p.y + 0.5) * cellSize, cellSize * 0.35, 0, Math.PI * 2);
          ctx.fill();
      });
      ctx.shadowBlur = 0;

      // UI Text
      ctx.fillStyle = '#d3d0cb'; ctx.font = `700 ${24 * scale}px Orbitron`;
      ctx.textAlign = 'left';
      ctx.fillText(`P1 Lives: ${players.current[0].lives}`, 20 * scale, 30 * scale);
      ctx.textAlign = 'right';
      ctx.fillText(`P2 Lives: ${players.current[1].lives}`, width - 20 * scale, 30 * scale);
      
      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        const messages = {
            start: { title: 'Maze Escape', subtitle: isMobile.current ? 'Use on-screen controls' : 'P1: WASD+Space, P2: Arrows+Enter' },
            win: { title: 'You Escaped!', subtitle: 'Tap or press any key to play again.' },
            lose: { title: 'Trapped!', subtitle: 'Tap or press any key to try again.' }
        };
        const msg = messages[gameState];
        ctx.font = `700 ${50 * scale}px Orbitron`; ctx.fillText(msg.title, width/2, height/2 - 20 * scale);
        ctx.font = `400 ${25 * scale}px Poppins`; ctx.fillText(msg.subtitle, width/2, height/2 + 30 * scale);
      }

      animFrameId = requestAnimationFrame(draw);
    };
    animFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, maze]);

  const handleStartGame = () => {
    if (gameState === 'start') {
        setGameState('playing');
    } else if (gameState === 'win' || gameState === 'lose') {
        resetGame();
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative font-poppins text-white cursor-pointer" style={{touchAction: 'none'}}>
      <canvas ref={canvasRef} onClick={handleStartGame} className="bg-gable-green rounded-lg shadow-glow w-full h-full" />
      {isMobile.current && <MobileControls onMove={movePlayer} onAction={useAbility} />}
    </div>
  );
};

export default MazeEscape;
