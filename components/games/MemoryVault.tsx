
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';
import { statsManager } from '../../utils/statsManager';

// --- CONSTANTS ---
const ASPECT_RATIO = 1.2;
const ORIGINAL_WIDTH = 800;
const GRID_SIZE = 4;
const COLORS = ['#36d7b7', '#ff6347', '#9370db', '#87ceeb', '#f0e68c', '#366e8d', '#8da3b0', '#d3d0cb'];

// --- TYPES ---
type GameState = 'start' | 'showing' | 'playing' | 'gameOver';

interface Tile {
  id: number;
  color: string;
  flash: number; // 0 to 1 for flash intensity
}

// --- GAME COMPONENT ---
const MemoryVault: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>('start');
  const [level, setLevel] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const sounds = useSounds(SOUND_EFFECTS);

  const sequence = useRef<number[]>([]);
  const playerInputIndex = useRef(0);
  const tiles = useRef<Tile[]>([]);

  const c = useRef({
    width: 800, height: 667, scale: 1,
    gridSize: 0, cellSize: 0, gridX: 0, gridY: 0, gap: 0,
  });

  useEffect(() => {
    setHighScore(statsManager.getGameStats('memory-vault').highScore);
  }, []);

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / ORIGINAL_WIDTH;
    const gridSize = Math.min(width, height) * 0.8;
    const gap = gridSize / 20;
    c.current = {
      width, height, scale, gridSize,
      cellSize: (gridSize - gap * (GRID_SIZE - 1)) / GRID_SIZE,
      gridX: (width - gridSize) / 2,
      gridY: (height - gridSize) / 2,
      gap,
    };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);

  const generateTiles = useCallback(() => {
    tiles.current = [];
    const availableColors = [...COLORS, ...COLORS];
    for(let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const colorIndex = Math.floor(Math.random() * availableColors.length);
        tiles.current.push({ id: i, color: availableColors.splice(colorIndex, 1)[0], flash: 0 });
    }
  }, []);

  const nextLevel = useCallback(() => {
    setLevel(l => l + 1);
    sequence.current.push(Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE)));
    playerInputIndex.current = 0;
    setGameState('showing');

    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.current.length) {
        const tileId = sequence.current[i];
        tiles.current[tileId].flash = 1;
        sounds.hover();
        i++;
      } else {
        clearInterval(interval);
        setGameState('playing');
      }
    }, 600);
  }, [sounds]);
  
  const resetGame = useCallback(() => {
    generateTiles();
    sequence.current = [];
    playerInputIndex.current = 0;
    setLevel(0);
    setGameState('start');
  }, [generateTiles]);

  const handlePlayerInput = useCallback((tileId: number) => {
    if (gameState !== 'playing') return;

    if (tiles.current[tileId].id === sequence.current[playerInputIndex.current]) {
      sounds.click();
      tiles.current[tileId].flash = 1;
      playerInputIndex.current++;
      if (playerInputIndex.current >= sequence.current.length) {
        setTimeout(nextLevel, 500);
      }
    } else {
      sounds.favorite();
      const newHighScore = statsManager.updateHighScore('memory-vault', level);
      setHighScore(newHighScore);
      setGameState('gameOver');
    }
  }, [gameState, level, nextLevel, sounds]);

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
      const { width, height, scale, cellSize, gridX, gridY, gap } = c.current;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#13262f';
      ctx.fillRect(0, 0, width, height);
      
      tiles.current.forEach((tile, i) => {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const x = gridX + col * (cellSize + gap);
        const y = gridY + row * (cellSize + gap);

        if (tile.flash > 0) tile.flash -= 0.05;
        
        ctx.globalAlpha = 0.6 + tile.flash * 0.4;
        ctx.fillStyle = tile.color;
        ctx.shadowColor = tile.color;
        ctx.shadowBlur = tile.flash * 30 * scale;
        ctx.fillRect(x, y, cellSize, cellSize);
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#d3d0cb';
      ctx.textAlign = 'left';
      ctx.font = `700 ${24 * scale}px Orbitron`;
      ctx.fillText(`Level: ${level}`, 20 * scale, 30 * scale);
      ctx.textAlign = 'right';
      ctx.fillText(`High Score: ${highScore}`, width - 20 * scale, 30 * scale);
      
      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)';
        ctx.fillRect(0, 0, width, height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = '';
        switch(gameState) {
            case 'start': title = 'Memory Vault'; subtitle = 'Tap to Start'; break;
            case 'showing': title = `Level ${level}`; subtitle = 'Watch carefully...'; break;
            case 'gameOver': title = 'Game Over'; subtitle = `You reached level ${level}. Tap to restart.`; break;
        }
        ctx.font = `700 ${50 * scale}px Orbitron`;
        ctx.fillText(title, width / 2, height / 2 - 20 * scale);
        ctx.font = `400 ${25 * scale}px Poppins`;
        ctx.fillText(subtitle, width / 2, height / 2 + 30 * scale);
      }
      
      animFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrameId);
  }, [gameState, level, highScore]);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState === 'start' || gameState === 'gameOver') {
      sounds.click();
      if(gameState === 'start') {
        resetGame();
        nextLevel();
      } else {
        resetGame();
      }
      return;
    }
    if (gameState !== 'playing') return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const { cellSize, gridX, gridY, gap } = c.current;
    for (let i = 0; i < tiles.current.length; i++) {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const tileX = gridX + col * (cellSize + gap);
        const tileY = gridY + row * (cellSize + gap);
        if (x > tileX && x < tileX + cellSize && y > tileY && y < tileY + cellSize) {
            handlePlayerInput(i);
            break;
        }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer">
      <canvas ref={canvasRef} onMouseDown={handleCanvasClick} onTouchStart={handleCanvasClick} className="bg-gable-green rounded-lg shadow-glow w-full h-full" />
    </div>
  );
};

export default MemoryVault;
