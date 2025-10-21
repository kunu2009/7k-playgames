
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- CONSTANTS ---
const ASPECT_RATIO = 800 / 500;
const ORIGINAL_WIDTH = 800;
const GRID_COLS = 10;
const GRID_ROWS = 6;
const COLORS = ['#36d7b7', '#ff6347', '#9370db', '#87ceeb', '#f0e68c', '#366e8d'];
const INITIAL_TIME = 60; // seconds

// --- TYPES ---
interface Node {
  id: number;
  row: number;
  col: number;
  color: string;
  cleared: boolean;
}

interface PathNode {
  row: number;
  col: number;
  dir: number; // 0: none, 1: up, 2: right, 3: down, 4: left
  turns: number;
  path: { row: number, col: number }[];
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; size: number; color: string;
}

// --- GAME COMPONENT ---
const MindMerge: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const sounds = useSounds(SOUND_EFFECTS);

  const grid = useRef<(Node | null)[][]>([]);
  const selectedNode = useRef<Node | null>(null);
  const lastFrameTime = useRef(0);
  const timeAccumulator = useRef(0);
  const winningPath = useRef<{ row: number; col: number }[]>([]);
  const pathFade = useRef(0);
  const particles = useRef<Particle[]>([]);

  // Scalable dimensions
  const c = useRef({
    width: 800,
    height: 500,
    scale: 1,
    nodeRadius: 20,
    gridOffsetX: 50,
    gridOffsetY: 50,
    cellWidth: 70,
    cellHeight: 70,
  });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const scale = containerWidth / ORIGINAL_WIDTH;

    const width = containerWidth;
    const height = containerWidth / ASPECT_RATIO;
    const gridWidth = width * 0.8;
    const gridHeight = height * 0.8;
    
    c.current = {
      width, height, scale,
      nodeRadius: (gridWidth / GRID_COLS) * 0.35,
      cellWidth: gridWidth / GRID_COLS,
      cellHeight: gridHeight / GRID_ROWS,
      gridOffsetX: (width - gridWidth) / 2,
      gridOffsetY: (height - gridHeight) / 2 + (height * 0.05),
    };
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }, []);

  const initializeBoard = useCallback(() => {
    const newGrid: (Node | null)[][] = Array(GRID_ROWS).fill(0).map(() => Array(GRID_COLS).fill(null));
    const availableNodes: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c_ = 0; c_ < GRID_COLS; c_++) {
        availableNodes.push({ row: r, col: c_ });
      }
    }
    availableNodes.sort(() => Math.random() - 0.5); // Shuffle

    let id = 0;
    while (availableNodes.length > 0) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const node1Pos = availableNodes.pop()!;
      const node2Pos = availableNodes.pop()!;

      newGrid[node1Pos.row][node1Pos.col] = { id: id++, ...node1Pos, color, cleared: false };
      newGrid[node2Pos.row][node2Pos.col] = { id: id++, ...node2Pos, color, cleared: false };
    }
    grid.current = newGrid;
  }, []);

  const findPath = useCallback((start: Node, end: Node) => {
    const queue: PathNode[] = [];
    const visited = new Set<string>();
    
    const startPathNode: PathNode = { row: start.row, col: start.col, dir: 0, turns: -1, path: [{row: start.row, col: start.col}] };
    queue.push(startPathNode);
    visited.add(`${start.row}-${start.col}`);
    
    const dr = [-1, 0, 1, 0];
    const dc = [0, 1, 0, -1];

    while(queue.length > 0) {
      const curr = queue.shift()!;

      if (curr.row === end.row && curr.col === end.col) {
        return curr.path;
      }

      for (let i = 0; i < 4; i++) {
        let newRow = curr.row + dr[i];
        let newCol = curr.col + dc[i];
        const newDir = i + 1;
        
        while (newRow >= -1 && newRow <= GRID_ROWS && newCol >= -1 && newCol <= GRID_COLS) {
            const posKey = `${newRow}-${newCol}`;
            const turns = curr.dir === 0 || curr.dir === newDir ? curr.turns : curr.turns + 1;
            
            if (turns > 2 || visited.has(posKey)) {
                newRow += dr[i];
                newCol += dc[i];
                continue;
            }

            if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
              if (grid.current[newRow][newCol] !== null && !(newRow === end.row && newCol === end.col)) {
                break; // Path blocked by another node
              }
            }
            
            const newPath = [...curr.path, {row: newRow, col: newCol}];
            if (newRow === end.row && newCol === end.col) {
              return newPath;
            }
            
            visited.add(posKey);
            queue.push({ row: newRow, col: newCol, dir: newDir, turns, path: newPath });

            newRow += dr[i];
            newCol += dc[i];
        }
      }
    }
    return null;
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) {
        particles.current.push({
            x, y, color,
            vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
            life: Math.random() * 50 + 20, size: Math.random() * 2 + 1,
        });
    }
  }, []);

  const resetGame = useCallback(() => {
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    initializeBoard();
    selectedNode.current = null;
    winningPath.current = [];
    particles.current = [];
    setGameState('start');
  }, [initializeBoard]);

  const handleInput = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (gameState === 'start') {
      sounds.click();
      setGameState('playing');
      lastFrameTime.current = performance.now();
      return;
    }
    if (gameState === 'gameOver') {
      sounds.click();
      resetGame();
      return;
    }
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const col = Math.floor((x - c.current.gridOffsetX) / c.current.cellWidth);
    const row = Math.floor((y - c.current.gridOffsetY) / c.current.cellHeight);
    
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;

    const clickedNode = grid.current[row][col];
    if (!clickedNode || clickedNode.cleared) return;

    if (!selectedNode.current) {
      sounds.hover();
      selectedNode.current = clickedNode;
    } else {
      if (selectedNode.current.id !== clickedNode.id && selectedNode.current.color === clickedNode.color) {
        const path = findPath(selectedNode.current, clickedNode);
        if (path) {
          sounds.favorite();
          const { gridOffsetX, gridOffsetY, cellWidth, cellHeight } = c.current;
          createParticles(gridOffsetX + (selectedNode.current.col + 0.5) * cellWidth, gridOffsetY + (selectedNode.current.row + 0.5) * cellHeight, selectedNode.current.color);
          createParticles(gridOffsetX + (clickedNode.col + 0.5) * cellWidth, gridOffsetY + (clickedNode.row + 0.5) * cellHeight, clickedNode.color);
          
          selectedNode.current.cleared = true;
          clickedNode.cleared = true;
          grid.current[selectedNode.current.row][selectedNode.current.col] = null;
          grid.current[clickedNode.row][clickedNode.col] = null;
          setScore(s => s + 100);
          setTimeLeft(t => Math.min(INITIAL_TIME, t + 1.5));
          winningPath.current = path;
          pathFade.current = 1.0;
        } else {
            sounds.filter();
        }
      }
      selectedNode.current = null;
    }
  }, [gameState, findPath, resetGame, sounds, createParticles]);

  useEffect(() => {
    window.addEventListener('resize', updateConstants);
    updateConstants();
    resetGame();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      const ctx = canvas.getContext('2d')!;
      const { width, height, scale, nodeRadius, gridOffsetX, gridOffsetY, cellWidth, cellHeight } = c.current;
      
      if (gameState === 'playing') {
        const deltaTime = (timestamp - lastFrameTime.current) / 1000;
        lastFrameTime.current = timestamp;
        timeAccumulator.current += deltaTime;

        if (timeAccumulator.current >= 1) {
          setTimeLeft(t => Math.max(0, t - 1));
          timeAccumulator.current -= 1;
        }
        if (timeLeft <= 0) {
          sounds.favorite();
          setGameState('gameOver');
        }
      }

      // Drawing
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#13262f';
      ctx.fillRect(0,0,width,height);

      // Draw path
      if(pathFade.current > 0) {
        pathFade.current -= 0.05;
        ctx.strokeStyle = `rgba(211, 208, 203, ${pathFade.current})`;
        ctx.lineWidth = 5 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for(let i=0; i<winningPath.current.length; i++) {
          const p = winningPath.current[i];
          const px = gridOffsetX + (p.col + 0.5) * cellWidth;
          const py = gridOffsetY + (p.row + 0.5) * cellHeight;
          if(i===0) ctx.moveTo(px,py);
          else ctx.lineTo(px,py);
        }
        ctx.stroke();
      }
      
      // Draw particles
      particles.current = particles.current.filter(p => p.life > 0);
      particles.current.forEach(p => {
          p.life--; p.x += p.vx; p.y += p.vy;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 60;
          ctx.fillRect(p.x,p.y,p.size,p.size);
      });
      ctx.globalAlpha = 1;

      // Draw nodes
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c_ = 0; c_ < GRID_COLS; c_++) {
          const node = grid.current[r][c_];
          if (!node || node.cleared) continue;

          const cx = gridOffsetX + (c_ + 0.5) * cellWidth;
          const cy = gridOffsetY + (r + 0.5) * cellHeight;
          
          const isSelected = selectedNode.current?.id === node.id;
          
          ctx.beginPath();
          ctx.arc(cx, cy, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = isSelected ? 25 * scale : 15 * scale;
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      // UI
      ctx.fillStyle = '#d3d0cb';
      ctx.textAlign = 'center';
      ctx.font = `700 ${32 * scale}px Orbitron`;
      ctx.fillText(`Time: ${Math.ceil(timeLeft)}`, width / 2, 40 * scale);
      ctx.font = `700 ${24 * scale}px Orbitron`;
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20 * scale, 40 * scale);
      
      if(gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.7)';
        ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#d3d0cb';
        if(gameState === 'start') {
            ctx.font = `${48 * scale}px Poppins`; ctx.fillText('Mind Merge', width / 2, height / 2 - 40 * scale);
            ctx.font = `${24 * scale}px Poppins`; ctx.fillText('Tap to Start', width / 2, height / 2);
        } else { // gameOver
            ctx.font = `${48 * scale}px Poppins`; ctx.fillText('Game Over', width / 2, height / 2 - 40 * scale);
            ctx.font = `${24 * scale}px Poppins`; ctx.fillText(`Final Score: ${score}`, width / 2, height / 2);
            ctx.font = `${18 * scale}px Poppins`; ctx.fillText('Tap to Play Again', width / 2, height / 2 + 40 * scale);
        }
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      window.removeEventListener('resize', updateConstants);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, score, timeLeft, updateConstants, resetGame, findPath, sounds]);

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer">
      <canvas 
        ref={canvasRef} 
        className="bg-gable-green rounded-lg shadow-glow w-full h-full" 
        onClick={handleInput}
        onTouchStart={handleInput}
      />
    </div>
  );
};

export default MindMerge;
