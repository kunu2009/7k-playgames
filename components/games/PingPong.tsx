import React, { useRef, useEffect, useState, useCallback } from 'react';

const ASPECT_RATIO = 800 / 500;

const PingPong: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [message, setMessage] = useState('Click or Tap to Start');
  
  const gameStatus = useRef<'start' | 'playing' | 'gameOver'>('start');
  
  // Game dimensions based on canvas size
  const gameDimensions = useRef({
      width: 800,
      height: 500,
      paddleWidth: 10,
      paddleHeight: 100,
      ballRadius: 8,
      winningScore: 5,
  });

  // Game objects with relative positions
  const ball = useRef({ x: 0, y: 0, dx: 0, dy: 0 });
  const player = useRef({ y: 0 });
  const opponent = useRef({ y: 0 });

  const updateDimensions = useCallback(() => {
    if(!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / 800; // Original width was 800

    gameDimensions.current = {
      width,
      height,
      paddleWidth: 10 * scale,
      paddleHeight: 100 * scale,
      ballRadius: 8 * scale,
      winningScore: 5,
    };
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }, []);
  
  const resetBall = useCallback((direction: 1 | -1) => {
    const { width, height } = gameDimensions.current;
    ball.current = {
      x: width / 2,
      y: height / 2,
      dx: direction * (width / 160), // Scaled speed
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
    resetBall(1);
  }, [resetBall]);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    resetGame();

    const gameLoop = () => {
      const { width, height, paddleWidth, paddleHeight, ballRadius, winningScore } = gameDimensions.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      // Update logic for 'playing' state
      if (gameStatus.current === 'playing') {
        ball.current.x += ball.current.dx;
        ball.current.y += ball.current.dy;

        if (ball.current.y + ballRadius > height || ball.current.y - ballRadius < 0) {
          ball.current.dy *= -1;
        }

        let p = ball.current.x < width / 2 ? player.current : opponent.current;
        if (
          (ball.current.x - ballRadius < paddleWidth && ball.current.dx < 0) ||
          (ball.current.x + ballRadius > width - paddleWidth && ball.current.dx > 0)
        ) {
          if (ball.current.y > p.y && ball.current.y < p.y + paddleHeight) {
            ball.current.dx *= -1.1;
            let collidePoint = (ball.current.y - (p.y + paddleHeight / 2));
            collidePoint = collidePoint / (paddleHeight/2);
            ball.current.dy = collidePoint * (width / 160);
          }
        }
        
        if (ball.current.x - ballRadius < 0) {
            setScore(s => ({ ...s, opponent: s.opponent + 1 }));
            resetBall(1);
        } else if (ball.current.x + ballRadius > width) {
            setScore(s => ({ ...s, player: s.player + 1 }));
            resetBall(-1);
        }
        
        const opponentCenter = opponent.current.y + paddleHeight / 2;
        const aiSpeed = height / 83.33; // Scaled speed
        if (opponentCenter < ball.current.y - (height/14)) {
          opponent.current.y += aiSpeed;
        } else if (opponentCenter > ball.current.y + (height/14)) {
          opponent.current.y -= aiSpeed;
        }
      }

      // Drawing logic (always runs)
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#13262f';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#d3d0cb';
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 10;
      ctx.fillRect(0, player.current.y, paddleWidth, paddleHeight);
      ctx.fillRect(width - paddleWidth, opponent.current.y, paddleWidth, paddleHeight);
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#828f9a';
      ctx.setLineDash([height/50, height/50]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `700 ${width/16.6}px Orbitron`;
      ctx.fillText(score.player.toString(), width / 4, height/8);
      ctx.fillText(score.opponent.toString(), (width / 4) * 3, height/8);
      if (gameStatus.current !== 'playing') {
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
  }, [updateDimensions, resetGame, resetBall, message, score]);

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
      player.current.y = mouseY - gameDimensions.current.paddleHeight / 2;
      
      if (player.current.y < 0) player.current.y = 0;
      if (player.current.y > gameDimensions.current.height - gameDimensions.current.paddleHeight) {
        player.current.y = gameDimensions.current.height - gameDimensions.current.paddleHeight;
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer">
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