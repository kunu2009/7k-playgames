
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- CONSTANTS ---
const ASPECT_RATIO = 800 / 500;
const ORIGINAL_WIDTH = 800;
const PLAYER_COLORS = ['#36d7b7', '#ff6347'];

// --- TYPES ---
type GameState = 'start' | 'playing' | 'end';

// --- GAME COMPONENT ---
const TugOfTap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>('start');
  const [winner, setWinner] = useState<number | null>(null);
  
  const ropePosition = useRef(0); // -100 to 100
  const ropeVelocity = useRef(0);
  const sounds = useSounds(SOUND_EFFECTS);
  
  const c = useRef({ width: 800, height: 500, scale: 1 });

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
    ropePosition.current = 0;
    ropeVelocity.current = 0;
    setWinner(null);
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

        sounds.hover();
        if (x < c.current.width / 2) { // Player 1
            ropeVelocity.current -= 1.5;
        } else { // Player 2
            ropeVelocity.current += 1.5;
        }
    }
  }, [gameState, sounds]);

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
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0, 0, width, height);

      if (gameState === 'playing') {
        ropeVelocity.current *= 0.95; // friction
        ropePosition.current += ropeVelocity.current;
        ropePosition.current = Math.max(-100, Math.min(100, ropePosition.current));

        if (ropePosition.current <= -100) {
            setWinner(0);
            setGameState('end');
            sounds.favorite();
        } else if (ropePosition.current >= 100) {
            setWinner(1);
            setGameState('end');
            sounds.favorite();
        }
      }

      // Draw victory lines
      ctx.fillStyle = PLAYER_COLORS[0];
      ctx.fillRect(0, 0, width * 0.15, height);
      ctx.fillStyle = PLAYER_COLORS[1];
      ctx.fillRect(width * 0.85, 0, width * 0.15, height);

      // Draw rope
      const ropeY = height / 2;
      const ropeDrawPosition = width / 2 + (ropePosition.current / 100) * (width * 0.35);
      ctx.strokeStyle = '#d3d0cb';
      ctx.lineWidth = 15 * scale;
      ctx.beginPath();
      ctx.moveTo(0, ropeY);
      ctx.lineTo(width, ropeY);
      ctx.stroke();

      // Draw center marker
      ctx.fillStyle = '#f0e68c';
      ctx.beginPath();
      ctx.arc(ropeDrawPosition, ropeY, 20 * scale, 0, Math.PI * 2);
      ctx.fill();

      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        let title = '', subtitle = '';
        if (gameState === 'start') {
            title = 'Tug of Tap'; subtitle = 'Tap your side of the screen! Tap to start.';
        } else {
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
  
  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    if(gameState !== 'playing') {
        sounds.click();
        resetGame();
        setGameState('playing');
    } else {
        handleTap(e);
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer" style={{touchAction: 'none'}}>
      <canvas ref={canvasRef} 
        onTouchStart={handleTap} 
        onMouseDown={handleInteractionStart}
        className="bg-gable-green rounded-lg shadow-glow w-full h-full" 
      />
    </div>
  );
};

export default TugOfTap;
