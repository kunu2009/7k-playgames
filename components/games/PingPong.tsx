import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

const ASPECT_RATIO = 800 / 500;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

const PingPong: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [message, setMessage] = useState('Click or Tap to Start');
  
  const gameStatus = useRef<'start' | 'playing' | 'gameOver'>('start');
  const particles = useRef<Particle[]>([]);
  const sounds = useSounds(SOUND_EFFECTS);
  
  const gameDimensions = useRef({
      width: 800,
      height: 500,
      paddleWidth: 10,
      paddleHeight: 100,
      ballRadius: 8,
      winningScore: 11,
  });

  const ball = useRef({ x: 0, y: 0, dx: 0, dy: 0 });
  const player = useRef({ y: 0 });
  const opponent = useRef({ y: 0 });

  const updateDimensions = useCallback(() => {
    if(!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / 800;

    gameDimensions.current = {
      width,
      height,
      paddleWidth: 10 * scale,
      paddleHeight: 100 * scale,
      ballRadius: 8 * scale,
      winningScore: 11,
    };
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }, []);
  
  const createParticles = useCallback((x: number, y: number) => {
    const particleCount = 5 + Math.random() * 5;
    for (let i = 0; i < particleCount; i++) {
        particles.current.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 2 + 1,
            life: Math.random() * 30 + 20,
            color: '#36d7b7',
        });
    }
  }, []);

  const resetBall = useCallback((direction: 1 | -1) => {
    const { width, height } = gameDimensions.current;
    ball.current = {
      x: width / 2,
      y: height / 2,
      dx: direction * (width / 200),
      dy: (Math.random() * (height/80) - (height/160)) 
    };
  }, []);

  const resetGame = useCallback(() => {
    const { height, paddleHeight } = gameDimensions.current;
    setScore({ player: 0, opponent: 0 });
    player.current.y = height / 2 - paddleHeight / 2;
    opponent.current.y = height / 2 - paddleHeight / 2;
    gameStatus.current = 'start';
    setMessage('Click or Tap to Start');
    particles.current = [];
    resetBall(1);
  }, [resetBall]);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    resetGame();

    const gameLoop = () => {
      const { width, height, paddleWidth, paddleHeight, ballRadius } = gameDimensions.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      if (gameStatus.current === 'playing') {
        ball.current.x += ball.current.dx;
        ball.current.y += ball.current.dy;

        if (ball.current.y + ballRadius > height || ball.current.y - ballRadius < 0) {
          ball.current.dy *= -1;
          sounds.hover();
        }
        
        const maxSpeedX = width / 60;

        let p = ball.current.x < width / 2 ? player.current : opponent.current;
        if (
          (ball.current.x - ballRadius < paddleWidth && ball.current.dx < 0 && ball.current.y > p.y && ball.current.y < p.y + paddleHeight) ||
          (ball.current.x + ballRadius > width - paddleWidth && ball.current.dx > 0 && ball.current.y > p.y && ball.current.y < p.y + paddleHeight)
        ) {
            sounds.click();
            createParticles(ball.current.x, ball.current.y);
            
            if(Math.abs(ball.current.dx) < maxSpeedX) {
                ball.current.dx *= -1.05;
            } else {
                ball.current.dx *= -1;
            }

            let collidePoint = (ball.current.y - (p.y + paddleHeight / 2));
            collidePoint = collidePoint / (paddleHeight/2);
            ball.current.dy = collidePoint * (width / 160);
        }
        
        if (ball.current.x - ballRadius < 0) {
            setScore(s => ({ ...s, opponent: s.opponent + 1 }));
            sounds.favorite();
            resetBall(1);
        } else if (ball.current.x + ballRadius > width) {
            setScore(s => ({ ...s, player: s.player + 1 }));
            sounds.favorite();
            resetBall(-1);
        }
        
        const targetY = ball.current.y - paddleHeight / 2;
        const newOpponentY = opponent.current.y + (targetY - opponent.current.y) * 0.1;
        opponent.current.y = Math.max(0, Math.min(height - paddleHeight, newOpponentY));
      }

      particles.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
      });
      particles.current = particles.current.filter(p => p.life > 0);

      ctx.fillStyle = 'rgba(19, 38, 47, 0.25)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.strokeStyle = '#828f9a';
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 20;
      ctx.setLineDash([height/50, height/50]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#d3d0cb';
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 15;
      ctx.fillRect(0, player.current.y, paddleWidth, paddleHeight);
      ctx.fillRect(width - paddleWidth, opponent.current.y, paddleWidth, paddleHeight);

      const ballGlow = 10 + Math.abs(ball.current.dx);
      ctx.shadowBlur = ballGlow;
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      particles.current.forEach(p => {
        ctx.fillStyle = `rgba(54, 215, 183, ${p.life / 30})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      
      ctx.fillStyle = '#d3d0cb';
      ctx.font = `700 ${width/16.6}px Orbitron`;
      ctx.fillText(score.player.toString(), width / 4, height/8);
      ctx.fillText(score.opponent.toString(), (width / 4) * 3, height/8);
      
      if (gameStatus.current !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.7)';
        ctx.fillRect(0,0,width,height);
        ctx.font = `${width/20}px Poppins`;
        ctx.fillStyle = 'rgba(211, 208, 203, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(message, width / 2, height / 2 - (height/10));
        if (gameStatus.current === 'gameOver') {
            ctx.font = `${width/40}px Poppins`;
            ctx.fillText('Click or Tap to play again', width / 2, height / 2);
        }
        ctx.textAlign = 'left';
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    let animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      cancelAnimationFrame(animationFrameId);
    };
  }, [updateDimensions, resetGame, resetBall, message, score, sounds, createParticles]);

  useEffect(() => {
    if (score.player === gameDimensions.current.winningScore) {
        gameStatus.current = 'gameOver';
        setMessage('You Win!');
    } else if (score.opponent === gameDimensions.current.winningScore) {
        gameStatus.current = 'gameOver';
        setMessage('AI Wins!');
    }
  }, [score]);

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (gameStatus.current === 'start') {
        gameStatus.current = 'playing';
        setMessage('');
    } else if (gameStatus.current === 'gameOver') {
        resetGame();
    }
  }, [resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getClientY = (e: MouseEvent | TouchEvent) => {
        if (e instanceof MouseEvent) return e.clientY;
        if (e.touches && e.touches.length > 0) return e.touches[0].clientY;
        return null;
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientY = getClientY(e);
      if (clientY === null) return;

      const rect = canvas.getBoundingClientRect();
      let mouseY = clientY - rect.top;
      
      let newY = mouseY - gameDimensions.current.paddleHeight / 2;
      
      if (newY < 0) newY = 0;
      if (newY > gameDimensions.current.height - gameDimensions.current.paddleHeight) {
        newY = gameDimensions.current.height - gameDimensions.current.paddleHeight;
      }
      player.current.y = newY;
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full cursor-none">
       <canvas
        ref={canvasRef}
        onClick={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        className="bg-gable-green rounded-lg shadow-glow w-full h-full"
      />
    </div>
  );
};

export default PingPong;