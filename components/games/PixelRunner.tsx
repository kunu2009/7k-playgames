import React, { useRef, useEffect, useState, useCallback } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';

const ASPECT_RATIO = 800 / 500;
const ORIGINAL_WIDTH = 800;

// Game object types
type GameObjectType = 'ground' | 'flying' | 'platform' | 'orb';
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: GameObjectType;
  vy?: number;
  direction?: 1 | -1;
  range?: number;
  initialY?: number;
  collected?: boolean;
}

const PixelRunner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useLocalStorage('pixel-runner-highscore', 0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');

  // Use refs for mutable game state
  const player = useRef({ y: 0, vy: 0, onGround: true });
  const gameObjects = useRef<GameObject[]>([]);
  const frameCount = useRef(0);
  const gameSpeed = useRef(0);
  const parallaxOffset = useRef(0);
  
  // Scalable game constants
  const c = useRef({
      width: 800, height: 500, scale: 1,
      groundHeight: 50, playerWidth: 30, playerHeight: 50, playerX: 100,
      gravity: 0.7, jumpForce: -16, initialGameSpeed: 5, gameSpeedIncrement: 0.001,
      spawnInterval: 90
  });

  const updateConstants = useCallback(() => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const scale = containerWidth / ORIGINAL_WIDTH;

      c.current = {
        width: containerWidth,
        height: containerWidth / ASPECT_RATIO,
        scale: scale,
        groundHeight: 50 * scale,
        playerWidth: 30 * scale,
        playerHeight: 50 * scale,
        playerX: 100 * scale,
        gravity: 0.7 * scale,
        jumpForce: -16 * scale,
        initialGameSpeed: 5 * scale,
        gameSpeedIncrement: 0.001 * scale,
        spawnInterval: 90
      };
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = c.current.width;
        canvas.height = c.current.height;
      }
      gameSpeed.current = c.current.initialGameSpeed;
  }, []);

  const resetGame = useCallback(() => {
    player.current = {
      y: c.current.height - c.current.groundHeight - c.current.playerHeight,
      vy: 0,
      onGround: true,
    };
    gameObjects.current = [];
    gameSpeed.current = c.current.initialGameSpeed;
    setScore(0);
    frameCount.current = 0;
    setGameState('start');
  }, []);
  
  const handleInput = useCallback(() => {
    if (gameState === 'start') {
      setGameState('playing');
    } else if (gameState === 'playing' && player.current.onGround) {
      player.current.vy = c.current.jumpForce;
      player.current.onGround = false;
    } else if (gameState === 'gameOver') {
      resetGame();
    }
  }, [gameState, resetGame]);
  
  useEffect(() => {
    const handleKeyDown = () => handleInput();
    const handleInteraction = () => handleInput();
    window.addEventListener('keydown', handleKeyDown);
    const canvas = canvasRef.current;
    canvas?.addEventListener('click', handleInteraction);
    canvas?.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas?.removeEventListener('click', handleInteraction);
      canvas?.removeEventListener('touchstart', handleInteraction);
    };
  }, [handleInput]);
  
  useEffect(() => {
    window.addEventListener('resize', updateConstants);
    updateConstants();
    resetGame();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;

    const gameLoop = () => {
      const { width, height, scale, groundHeight, playerWidth, playerHeight, playerX, gravity } = c.current;
      
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#13262f';
      ctx.fillRect(0, 0, width, height);
      
      // Parallax background
      parallaxOffset.current = (parallaxOffset.current - gameSpeed.current * 0.2) % width;
      ctx.strokeStyle = 'rgba(54, 110, 141, 0.2)';
      ctx.lineWidth = 2 * scale;
      for(let i = 0; i < width / (20*scale); i++) {
        const x = (parallaxOffset.current + i * 40 * scale) % width;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for(let i = 0; i < height / (20*scale); i++) {
        const y = (i * 40 * scale);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      ctx.fillStyle = '#d3d0cb';
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 15 * scale;
      ctx.fillRect(0, height - groundHeight, width, groundHeight);
      ctx.shadowBlur = 0;

      if (gameState === 'playing') {
        frameCount.current++;
        gameSpeed.current += c.current.gameSpeedIncrement;

        gameObjects.current.forEach(obj => {
          obj.x -= gameSpeed.current;
          if (obj.type === 'platform') {
            obj.y += obj.vy! * obj.direction!;
            if (Math.abs(obj.y - obj.initialY!) >= obj.range!) {
              obj.direction = (obj.direction === 1 ? -1 : 1) as 1 | -1;
            }
          }
        });

        player.current.onGround = false;
        player.current.vy += gravity;
        player.current.y += player.current.vy;

        if (player.current.y >= height - groundHeight - playerHeight) {
            player.current.y = height - groundHeight - playerHeight;
            player.current.vy = 0;
            player.current.onGround = true;
        }

        for (const plat of gameObjects.current) {
            if (plat.type !== 'platform') continue;
            const playerBottom = player.current.y + playerHeight;
            if (playerX + playerWidth > plat.x && playerX < plat.x + plat.width && playerBottom >= plat.y && playerBottom - player.current.vy <= plat.y && player.current.vy > 0) {
                player.current.y = plat.y - playerHeight;
                player.current.vy = plat.vy! * plat.direction!;
                player.current.onGround = true;
                break;
            }
        }
        
        if (frameCount.current % c.current.spawnInterval === 0) {
            const objectType = Math.random();
            if (objectType < 0.55) { // Ground obstacle
                const h = (Math.random() * 50 + 30) * scale;
                gameObjects.current.push({ type: 'ground', x: width, y: height - groundHeight - h, width: (Math.random() * 30 + 20) * scale, height: h });
            } else if (objectType < 0.8) { // Flying enemy
                gameObjects.current.push({ type: 'flying', x: width, y: height - groundHeight - playerHeight - Math.random() * 100 * scale - 50 * scale, width: 40 * scale, height: 30 * scale });
            } else { // Moving platform
                const initialY = height - groundHeight - (Math.random() * 150 + 80) * scale;
                gameObjects.current.push({ type: 'platform', x: width, y: initialY, width: (Math.random() * 70 + 80) * scale, height: 20 * scale, initialY: initialY, vy: (Math.random() * 1 + 0.5) * scale, direction: 1, range: (Math.random() * 40 + 30) * scale });
            }
        }

        if (frameCount.current % Math.floor(c.current.spawnInterval * 1.5) === 0) {
            gameObjects.current.push({ type: 'orb', x: width + 10 * scale, y: height - groundHeight - playerHeight - Math.random() * 150 * scale, width: 20 * scale, height: 20 * scale, collected: false });
        }
        
        setScore(prev => prev + 1);
      }

      gameObjects.current.forEach(obj => {
          const blur = 15 * scale;
          switch (obj.type) {
              case 'ground': ctx.fillStyle = '#ff6347'; ctx.shadowColor = '#ff6347'; ctx.shadowBlur = blur; ctx.fillRect(obj.x, obj.y, obj.width, obj.height); break;
              case 'flying':
                  ctx.fillStyle = '#9370db'; ctx.shadowColor = '#9370db'; ctx.shadowBlur = blur;
                  ctx.beginPath(); ctx.moveTo(obj.x + obj.width / 2, obj.y); ctx.lineTo(obj.x + obj.width, obj.y + obj.height / 2); ctx.lineTo(obj.x + obj.width / 2, obj.y + obj.height); ctx.lineTo(obj.x, obj.y + obj.height / 2); ctx.closePath(); ctx.fill();
                  break;
              case 'platform': ctx.fillStyle = '#87ceeb'; ctx.shadowColor = '#87ceeb'; ctx.shadowBlur = blur; ctx.fillRect(obj.x, obj.y, obj.width, obj.height); break;
              case 'orb': if (!obj.collected) { ctx.fillStyle = '#f0e68c'; ctx.shadowColor = '#f0e68c'; ctx.shadowBlur = blur * 1.3; ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.width / 2, 0, Math.PI * 2); ctx.fill(); } break;
          }
      });
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#36d7b7';
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 15 * scale;
      ctx.fillRect(playerX, player.current.y, playerWidth, playerHeight);
      ctx.shadowBlur = 0;
      
      if(gameState === 'playing') {
        for (const obj of gameObjects.current) {
            if (obj.type === 'ground' || obj.type === 'flying') {
              if (playerX < obj.x + obj.width && playerX + playerWidth > obj.x && player.current.y < obj.y + obj.height && player.current.y + playerHeight > obj.y) {
                setGameState('gameOver');
                if (score > highScore) setHighScore(score);
                break; 
              }
            } else if (obj.type === 'orb' && !obj.collected) {
                const dist = Math.hypot(obj.x - (playerX + playerWidth / 2), obj.y - (player.current.y + playerHeight / 2));
                if (dist < obj.width / 2 + playerWidth / 2) {
                    obj.collected = true;
                    setScore(s => s + 500);
                }
            }
        }
        gameObjects.current = gameObjects.current.filter(obj => (obj.x + obj.width > 0) && !obj.collected);
      }

      ctx.fillStyle = '#d3d0cb';
      ctx.font = `700 ${32 * scale}px Orbitron`;
      ctx.textAlign = 'left'; ctx.fillText(`Score: ${score}`, 20 * scale, 40 * scale);
      ctx.textAlign = 'right'; ctx.fillText(`High: ${highScore > score ? highScore : score}`, width - 20 * scale, 40 * scale);
      
      ctx.textAlign = 'center';
      if (gameState === 'start') {
        ctx.font = `${48 * scale}px Poppins`; ctx.fillText('Pixel Runner', width / 2, height / 2 - 40 * scale);
        ctx.font = `${24 * scale}px Poppins`; ctx.fillText('Tap or Press Any Key to Start', width / 2, height / 2);
      } else if (gameState === 'gameOver') {
        ctx.font = `${48 * scale}px Poppins`; ctx.fillText('Game Over', width / 2, height / 2 - 40 * scale);
        ctx.font = `${24 * scale}px Poppins`; ctx.fillText(`Final Score: ${score}`, width / 2, height / 2);
        ctx.font = `${18 * scale}px Poppins`; ctx.fillText('Tap or Press Any Key to Play Again', width / 2, height / 2 + 40 * scale);
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => {
      window.removeEventListener('resize', updateConstants);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, score, highScore, setHighScore, handleInput, resetGame, updateConstants]);

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer">
       <canvas
        ref={canvasRef}
        className="bg-gable-green rounded-lg shadow-glow w-full h-full"
      />
    </div>
  );
};

export default PixelRunner;
