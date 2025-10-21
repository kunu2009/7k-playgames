import React, { useRef, useEffect, useState, useCallback } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const GROUND_HEIGHT = 50;

// Player constants
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const PLAYER_X_POSITION = 100;
const GRAVITY = 0.7;
const JUMP_FORCE = -16;

// Game object constants
const OBSTACLE_MIN_WIDTH = 20;
const OBSTACLE_MAX_WIDTH = 50;
const OBSTACLE_MIN_HEIGHT = 30;
const OBSTACLE_MAX_HEIGHT = 80;
const OBSTACLE_SPAWN_RATE = 120; // Lower is faster
const ORB_RADIUS = 10;
const ORB_SPAWN_RATE = 150;

// Game speed
const INITIAL_GAME_SPEED = 5;
const GAME_SPEED_INCREMENT = 0.001;


const PixelRunner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useLocalStorage('pixel-runner-highscore', 0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');

  // Use refs for mutable game state to avoid re-renders in the game loop
  const player = useRef({ y: 0, vy: 0, onGround: true });
  const obstacles = useRef<{ x: number, y: number, width: number, height: number }[]>([]);
  const orbs = useRef<{ x: number, y: number, collected: boolean }[]>([]);
  const frameCount = useRef(0);
  const gameSpeed = useRef(INITIAL_GAME_SPEED);
  const parallaxOffset = useRef(0);
  
  const resetGame = useCallback(() => {
    player.current = {
      y: CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
      vy: 0,
      onGround: true,
    };
    obstacles.current = [];
    orbs.current = [];
    gameSpeed.current = INITIAL_GAME_SPEED;
    setScore(0);
    frameCount.current = 0;
    setGameState('start');
  }, []);

  const handleInput = useCallback(() => {
    if (gameState === 'start') {
      setGameState('playing');
    } else if (gameState === 'playing' && player.current.onGround) {
      player.current.vy = JUMP_FORCE;
      player.current.onGround = false;
    } else if (gameState === 'gameOver') {
      resetGame();
    }
  }, [gameState, resetGame]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => handleInput();
    const handleCanvasClick = () => handleInput();

    window.addEventListener('keydown', handleKeyDown);
    const canvas = canvasRef.current;
    canvas?.addEventListener('click', handleCanvasClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas?.removeEventListener('click', handleCanvasClick);
    };
  }, [handleInput]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#13262f';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // --- DRAW PARALLAX BACKGROUND ---
      parallaxOffset.current = (parallaxOffset.current - gameSpeed.current * 0.2) % CANVAS_WIDTH;
      ctx.strokeStyle = 'rgba(54, 110, 141, 0.2)';
      ctx.lineWidth = 2;
      for(let i=0; i < CANVAS_WIDTH / 20; i++) {
        const x = (parallaxOffset.current + i * 40) % CANVAS_WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for(let i=0; i < CANVAS_HEIGHT / 20; i++) {
        const y = (i * 40);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }


      // --- DRAW GROUND ---
      ctx.fillStyle = '#d3d0cb';
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 15;
      ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
      ctx.shadowBlur = 0;

      // --- GAME LOGIC ---
      if (gameState === 'playing') {
        frameCount.current++;
        gameSpeed.current += GAME_SPEED_INCREMENT;

        // Player logic
        player.current.vy += GRAVITY;
        player.current.y += player.current.vy;
        player.current.onGround = false;

        if (player.current.y >= CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT) {
          player.current.y = CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
          player.current.vy = 0;
          player.current.onGround = true;
        }

        // Obstacle logic
        if (frameCount.current % OBSTACLE_SPAWN_RATE === 0) {
          const height = Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT) + OBSTACLE_MIN_HEIGHT;
          obstacles.current.push({
            x: CANVAS_WIDTH,
            y: CANVAS_HEIGHT - GROUND_HEIGHT - height,
            width: Math.random() * (OBSTACLE_MAX_WIDTH - OBSTACLE_MIN_WIDTH) + OBSTACLE_MIN_WIDTH,
            height: height,
          });
        }
        
        obstacles.current.forEach(obs => (obs.x -= gameSpeed.current));
        obstacles.current = obstacles.current.filter(obs => obs.x + obs.width > 0);

        // Orb logic
        if (frameCount.current % ORB_SPAWN_RATE === 0) {
            orbs.current.push({
                x: CANVAS_WIDTH + ORB_RADIUS,
                y: CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT - Math.random() * 100,
                collected: false,
            });
        }
        orbs.current.forEach(orb => (orb.x -= gameSpeed.current));
        orbs.current = orbs.current.filter(orb => orb.x + ORB_RADIUS > 0);

        // Update score
        setScore(prev => prev + 1);
      }

      // --- DRAW GAME OBJECTS ---
      
      // Draw orbs
      ctx.fillStyle = '#f0e68c'; // Khaki
      ctx.shadowColor = '#f0e68c';
      orbs.current.forEach(orb => {
        if (!orb.collected) {
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, ORB_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }
      });
      ctx.shadowBlur = 0;

      // Draw obstacles
      ctx.fillStyle = '#ff6347'; // Tomato red
      ctx.shadowColor = '#ff6347';
      obstacles.current.forEach(obs => {
        ctx.shadowBlur = 15;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      });
      ctx.shadowBlur = 0;

      // Draw player
      ctx.fillStyle = '#36d7b7'; // A teal color
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 15;
      ctx.fillRect(PLAYER_X_POSITION, player.current.y, PLAYER_WIDTH, PLAYER_HEIGHT);
      ctx.shadowBlur = 0;
      
      // --- COLLISION DETECTION ---
      if(gameState === 'playing') {
        // Obstacle collision
        for (const obs of obstacles.current) {
          if (
            PLAYER_X_POSITION < obs.x + obs.width &&
            PLAYER_X_POSITION + PLAYER_WIDTH > obs.x &&
            player.current.y < obs.y + obs.height &&
            player.current.y + PLAYER_HEIGHT > obs.y
          ) {
            setGameState('gameOver');
            if (score > highScore) {
              setHighScore(score);
            }
          }
        }
        // Orb collision
        for (const orb of orbs.current) {
            const dist = Math.hypot(orb.x - (PLAYER_X_POSITION + PLAYER_WIDTH / 2), orb.y - (player.current.y + PLAYER_HEIGHT / 2));
            if (dist < ORB_RADIUS + PLAYER_WIDTH / 2) {
                if (!orb.collected) {
                    orb.collected = true;
                    setScore(s => s + 500);
                }
            }
        }
        orbs.current = orbs.current.filter(o => !o.collected);
      }


      // --- DRAW UI TEXT ---
      ctx.fillStyle = '#d3d0cb';
      ctx.font = '700 32px Orbitron';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 40);
      ctx.textAlign = 'right';
      ctx.fillText(`High: ${highScore > score ? highScore : score}`, CANVAS_WIDTH - 20, 40);
      
      if (gameState === 'start') {
        ctx.textAlign = 'center';
        ctx.font = '48px Poppins';
        ctx.fillText('Pixel Runner', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.font = '24px Poppins';
        ctx.fillText('Click or Press Any Key to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      } else if (gameState === 'gameOver') {
        ctx.textAlign = 'center';
        ctx.font = '48px Poppins';
        ctx.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.font = '24px Poppins';
        ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '18px Poppins';
        ctx.fillText('Click or Press Any Key to Play Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    resetGame();
    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run this effect once on mount

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="bg-gable-green rounded-lg shadow-glow cursor-pointer"
    />
  );
};

export default PixelRunner;
