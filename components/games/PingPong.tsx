import React, { useRef, useEffect, useState, useCallback } from 'react';

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 8;
const WINNING_SCORE = 5;

const PingPong: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [message, setMessage] = useState('Click to Start');
  
  const gameStatus = useRef<'start' | 'playing' | 'gameOver'>('start');
  
  // Use refs for game objects to avoid re-renders inside the game loop
  const ball = useRef({ x: 0, y: 0, dx: 0, dy: 0 });
  const player = useRef({ y: 0 });
  const opponent = useRef({ y: 0 });

  const resetBall = useCallback((direction: 1 | -1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ball.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      dx: direction * 5,
      dy: (Math.random() * 6 - 3) 
    };
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setScore({ player: 0, opponent: 0 });
    player.current.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    opponent.current.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    gameStatus.current = 'start';
    setMessage('Click to Start');
    resetBall(1);
  }, [resetBall]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial positions
    player.current.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    opponent.current.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    resetBall(1);
    
    let animationFrameId: number;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = '#13262f'; // Gable Green
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw paddles
      ctx.fillStyle = '#d3d0cb'; // Timberwolf
      ctx.shadowColor = '#36d7b7';
      ctx.shadowBlur = 10;
      ctx.fillRect(0, player.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(canvas.width - PADDLE_WIDTH, opponent.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw net
      ctx.strokeStyle = '#828f9a'; // Regent Gray
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw scores
      ctx.font = '700 48px Orbitron';
      ctx.fillText(score.player.toString(), canvas.width / 4, 60);
      ctx.fillText(score.opponent.toString(), (canvas.width / 4) * 3, 60);

      // Draw message
      if (gameStatus.current !== 'playing') {
        ctx.font = '40px Poppins';
        ctx.fillStyle = 'rgba(211, 208, 203, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
        if (gameStatus.current === 'gameOver') {
            ctx.font = '20px Poppins';
            ctx.fillText('Click to play again', canvas.width / 2, canvas.height / 2);
        }
        ctx.textAlign = 'left';
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [score, message, resetBall]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    
    const gameLoop = () => {
      if (gameStatus.current === 'playing') {
        // Ball movement
        ball.current.x += ball.current.dx;
        ball.current.y += ball.current.dy;

        // Ball collision with top/bottom walls
        if (ball.current.y + BALL_RADIUS > canvas.height || ball.current.y - BALL_RADIUS < 0) {
          ball.current.dy *= -1;
        }

        // Ball collision with paddles
        let p = ball.current.x < canvas.width / 2 ? player.current : opponent.current;
        if (
          (ball.current.x - BALL_RADIUS < PADDLE_WIDTH && ball.current.dx < 0) ||
          (ball.current.x + BALL_RADIUS > canvas.width - PADDLE_WIDTH && ball.current.dx > 0)
        ) {
          if (ball.current.y > p.y && ball.current.y < p.y + PADDLE_HEIGHT) {
            ball.current.dx *= -1.1; // Increase speed
            // Change angle based on where it hits the paddle
            let collidePoint = (ball.current.y - (p.y + PADDLE_HEIGHT / 2));
            collidePoint = collidePoint / (PADDLE_HEIGHT/2);
            ball.current.dy = collidePoint * 5;
          }
        }
        
        // Scoring
        if (ball.current.x - BALL_RADIUS < 0) {
            setScore(s => ({ ...s, opponent: s.opponent + 1 }));
            resetBall(1);
        } else if (ball.current.x + BALL_RADIUS > canvas.width) {
            setScore(s => ({ ...s, player: s.player + 1 }));
            resetBall(-1);
        }

        // AI opponent movement
        const opponentCenter = opponent.current.y + PADDLE_HEIGHT / 2;
        if (opponentCenter < ball.current.y - 35) {
          opponent.current.y += 6;
        } else if (opponentCenter > ball.current.y + 35) {
          opponent.current.y -= 6;
        }
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
    
    return () => {
        cancelAnimationFrame(animationFrameId);
    }

  }, [resetBall]);


  useEffect(() => {
    if (score.player === WINNING_SCORE) {
        gameStatus.current = 'gameOver';
        setMessage('You Win!');
    } else if (score.opponent === WINNING_SCORE) {
        gameStatus.current = 'gameOver';
        setMessage('AI Wins!');
    }
  }, [score]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      let root = document.documentElement;
      let mouseY = e.clientY - rect.top - root.scrollTop;
      player.current.y = mouseY - PADDLE_HEIGHT / 2;
      
      // Keep paddle in bounds
      if (player.current.y < 0) player.current.y = 0;
      if (player.current.y > canvas.height - PADDLE_HEIGHT) player.current.y = canvas.height - PADDLE_HEIGHT;
    };

    const handleClick = () => {
        if (gameStatus.current === 'start') {
            gameStatus.current = 'playing';
            setMessage('');
        } else if (gameStatus.current === 'gameOver') {
            resetGame();
        }
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [resetGame]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={500}
      className="bg-gable-green rounded-lg shadow-glow"
    />
  );
};

export default PingPong;
