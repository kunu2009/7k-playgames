
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

const ASPECT_RATIO = 800 / 500;

// --- TYPES ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

type PowerUpType = 'speed' | 'grow' | 'reverse';

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
  size: number;
  life: number;
  color: string;
  icon: string;
}

interface ActivePowerUp {
    type: PowerUpType;
    duration: number; // in frames
    target: 'player' | 'opponent';
}


const PingPong: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState({ player: 0, opponent: 0 });
  const [message, setMessage] = useState('Click or Tap to Start');
  const [gameOverMessage, setGameOverMessage] = useState('');
  
  // Refs to hold the latest state for the animation loop to avoid stale closures
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const messageRef = useRef(message);
  messageRef.current = message;
  const gameOverMessageRef = useRef(gameOverMessage);
  gameOverMessageRef.current = gameOverMessage;

  const gameStatus = useRef<'start' | 'playing' | 'gameOver'>('start');
  const particles = useRef<Particle[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const activePowerUps = useRef<ActivePowerUp[]>([]);
  const restartButtonBounds = useRef<{x: number, y: number, width: number, height: number} | null>(null);
  const ballTrail = useRef<{x: number, y: number}[]>([]);
  
  const sounds = useSounds(SOUND_EFFECTS);
  
  const gameDimensions = useRef({
      width: 800,
      height: 500,
      paddleWidth: 10,
      paddleHeight: 100,
      ballRadius: 8,
      winningScore: 11,
      scale: 1,
  });

  const ball = useRef({ x: 0, y: 0, dx: 0, dy: 0, spinY: 0, lastHitBy: 'player' as ('player' | 'opponent') });
  const player = useRef({ y: 0, vy: 0, lastY: 0, height: 100 });
  const opponent = useRef({ y: 0, height: 100, controlsReversed: false });
  const frameCount = useRef(0);

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
      scale,
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
  
  const spawnPowerUp = useCallback(() => {
    if (powerUps.current.length > 0) return;
    const { width, height, scale } = gameDimensions.current;
    
    const rand = Math.random();
    let type: PowerUpType, color: string, icon: string;

    if (rand < 0.4) {
      type = 'grow'; color = '#87ceeb'; icon = '↔️';
    } else if (rand < 0.8) {
      type = 'speed'; color = '#f0e68c'; icon = '⚡️';
    } else {
      type = 'reverse'; color = '#9370db'; icon = '❓';
    }

    powerUps.current.push({
        id: Date.now(),
        type, color, icon,
        x: width / 2,
        y: height / 2 + (Math.random() - 0.5) * (height / 2),
        size: 15 * scale,
        life: 500 // frames
    });
  }, []);

  const resetBall = useCallback((direction: 1 | -1) => {
    const { width, height } = gameDimensions.current;
    ballTrail.current = [];
    ball.current = {
      x: width / 2,
      y: height / 2,
      dx: direction * (width / 200),
      dy: (Math.random() * (height/80) - (height/160)),
      spinY: 0,
      lastHitBy: 'player'
    };
  }, []);

  const resetGame = useCallback(() => {
    const { height, paddleHeight } = gameDimensions.current;
    setScore({ player: 0, opponent: 0 });
    player.current.y = height / 2 - paddleHeight / 2;
    player.current.vy = 0;
    player.current.lastY = height / 2 - paddleHeight / 2;
    player.current.height = paddleHeight;
    opponent.current.y = height / 2 - paddleHeight / 2;
    opponent.current.height = paddleHeight;
    gameStatus.current = 'start';
    setMessage('Click or Tap to Start');
    setGameOverMessage('');
    particles.current = [];
    powerUps.current = [];
    activePowerUps.current = [];
    ballTrail.current = [];
    resetBall(1);
  }, [resetBall]);

  useEffect(() => {
    // This effect only runs once to set up the game loop.
    // All continuously changing variables are accessed via refs inside the loop.
    
    updateDimensions();
    resetGame();
    window.addEventListener('resize', updateDimensions);

    let animationFrameId: number;
    
    const gameLoop = () => {
      const { width, height, paddleWidth, ballRadius, scale } = gameDimensions.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      };
      
      // Calculate player paddle velocity for spin effect
      const playerVel = player.current.y - player.current.lastY;
      player.current.vy = player.current.vy * 0.7 + playerVel * 0.3; // Smoothed velocity
      player.current.lastY = player.current.y;

      if (gameStatus.current === 'playing') {
        frameCount.current++;
        if (frameCount.current % 300 === 0) spawnPowerUp();

        // --- POWER-UP LOGIC ---
        let ballSpeedMultiplier = 1;
        player.current.height = gameDimensions.current.paddleHeight;
        opponent.current.height = gameDimensions.current.paddleHeight;
        opponent.current.controlsReversed = false;

        activePowerUps.current = activePowerUps.current.filter(p => p.duration-- > 0);
        activePowerUps.current.forEach(p => {
          if (p.type === 'speed') ballSpeedMultiplier = 1.5;
          if (p.type === 'grow') {
            if (p.target === 'player') player.current.height *= 1.5;
            else opponent.current.height *= 1.5;
          }
          if (p.type === 'reverse' && p.target === 'opponent') {
            opponent.current.controlsReversed = true;
          }
        });

        // Update on-screen power-ups
        powerUps.current.forEach(p => p.life--);
        powerUps.current = powerUps.current.filter(p => p.life > 0);

        // --- BALL MOVEMENT ---
        ball.current.dy += ball.current.spinY;
        ball.current.x += ball.current.dx * ballSpeedMultiplier;
        ball.current.y += ball.current.dy * ballSpeedMultiplier;

        ballTrail.current.unshift({ x: ball.current.x, y: ball.current.y });
        if (ballTrail.current.length > 8) { // Slightly longer trail
            ballTrail.current.pop();
        }

        if (ball.current.y + ballRadius > height || ball.current.y - ballRadius < 0) {
          ball.current.dy *= -1;
          ball.current.spinY *= -0.8;
          sounds.hover();
        }
        
        // --- PADDLE COLLISION ---
        const maxSpeedX = width / 60;
        let p = ball.current.x < width / 2 ? player.current : opponent.current;
        if (
          (ball.current.x - ballRadius < paddleWidth && ball.current.dx < 0 && ball.current.y > p.y && ball.current.y < p.y + p.height) ||
          (ball.current.x + ballRadius > width - paddleWidth && ball.current.dx > 0 && ball.current.y > p.y && ball.current.y < p.y + p.height)
        ) {
            sounds.click();
            createParticles(ball.current.x, ball.current.y);
            ball.current.lastHitBy = (p === player.current) ? 'player' : 'opponent';

            // --- REFINED PHYSICS LOGIC ---
            let collidePoint = (ball.current.y - (p.y + p.height / 2)) / (p.height / 2); // -1 (top) to 1 (bottom)

            // 1. More realistic speed variation
            const baseSpeedIncrease = 1.03;
            const centerHitBonus = 1 - Math.abs(collidePoint) * 0.04; // Faster returns from center hits
            ball.current.dx *= -(baseSpeedIncrease * centerHitBonus);

            // 2. Cap the speed
            if (Math.abs(ball.current.dx) > maxSpeedX) {
              ball.current.dx = maxSpeedX * Math.sign(ball.current.dx);
            }

            // 3. More realistic bounce angle
            const bounceAngleFactor = 5 * scale; // Controls how much angle is imparted
            ball.current.dy = collidePoint * bounceAngleFactor;

            // 4. Apply spin from paddle movement
            const paddleVy = (p === player.current) ? player.current.vy : 0;
            const spinFromSpeed = paddleVy * 0.02;
            const spinFromCollision = collidePoint * 0.03;
            const newSpin = (ball.current.spinY * 0.4) + spinFromSpeed + spinFromCollision;
            const maxSpin = 0.5 * scale;
            ball.current.spinY = Math.max(-maxSpin, Math.min(maxSpin, newSpin));

            // 5. Add slight random deviation for unpredictability
            ball.current.dy += (Math.random() - 0.5) * (0.3 * scale);
        }
        
        // --- POWER-UP COLLECTION ---
        for(let i = powerUps.current.length - 1; i >= 0; i--) {
            const p = powerUps.current[i];
            const dist = Math.hypot(ball.current.x - p.x, ball.current.y - p.y);
            if (dist < ballRadius + p.size) {
                sounds.favorite();
                const target = p.type === 'reverse' ? (ball.current.lastHitBy === 'player' ? 'opponent' : 'player') : ball.current.lastHitBy;
                activePowerUps.current.push({ type: p.type, duration: 400, target });
                powerUps.current.splice(i, 1);
            }
        }
        
        // --- SCORING ---
        if (ball.current.x - ballRadius < 0) {
            setScore(s => ({ ...s, opponent: s.opponent + 1 }));
            sounds.favorite(); resetBall(1);
        } else if (ball.current.x + ballRadius > width) {
            setScore(s => ({ ...s, player: s.player + 1 }));
            sounds.favorite(); resetBall(-1);
        }
        
        // --- AI LOGIC ---
        const aiReactionSpeed = 0.1;
        let targetY = ball.current.y - opponent.current.height / 2;
        let newOpponentY = opponent.current.y + (targetY - opponent.current.y) * aiReactionSpeed * (opponent.current.controlsReversed ? -1 : 1);
        opponent.current.y = Math.max(0, Math.min(height - opponent.current.height, newOpponentY));
      }

      // --- DRAWING ---
      particles.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      particles.current = particles.current.filter(p => p.life > 0);

      ctx.fillStyle = 'rgba(19, 38, 47, 0.25)'; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#828f9a'; ctx.shadowColor = '#36d7b7'; ctx.shadowBlur = 20;
      ctx.setLineDash([height/50, height/50]);
      ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.stroke();
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#d3d0cb'; ctx.shadowColor = '#36d7b7'; ctx.shadowBlur = 15;
      ctx.fillRect(0, player.current.y, paddleWidth, player.current.height);
      ctx.fillRect(width - paddleWidth, opponent.current.y, paddleWidth, opponent.current.height);

      // Draw ball trail with glow effect based on spin
      ballTrail.current.forEach((pos, index) => {
        const progress = index / ballTrail.current.length;
        const opacity = (1 - progress) * 0.7; // slightly more visible
        const radius = ballRadius * (1 - progress);
        if (radius < 1) return;

        const spinIntensity = Math.min(1, Math.abs(ball.current.spinY) / (0.4 * scale));
        
        // Default (no spin) trail color - a faint white glow
        let trailColor = `rgba(211, 208, 203, ${opacity * 0.3})`;
        let glowColor = 'rgba(211, 208, 203, 1)';

        if (ball.current.spinY > 0.05) { // Downward spin (backspin) -> Red-Orange
            trailColor = `rgba(255, 100, 70, ${opacity * spinIntensity * 0.9})`;
            glowColor = 'rgba(255, 100, 70, 1)';
        } else if (ball.current.spinY < -0.05) { // Upward spin (topspin) -> Sky Blue
            trailColor = `rgba(135, 206, 250, ${opacity * spinIntensity * 0.9})`;
            glowColor = 'rgba(135, 206, 250, 1)';
        }
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = radius * 2.5; // More pronounced glow
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = trailColor;
        ctx.fill();
      });
      // Reset shadow for subsequent drawings
      ctx.shadowBlur = 0;

      const ballGlow = 10 + Math.abs(ball.current.dx);
      ctx.shadowBlur = ballGlow;
      ctx.shadowColor = '#36d7b7';
      ctx.fillStyle = '#d3d0cb';
      ctx.beginPath(); ctx.arc(ball.current.x, ball.current.y, ballRadius, 0, Math.PI * 2);
      ctx.fill(); ctx.shadowBlur = 0;

      powerUps.current.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.globalAlpha = p.life < 100 ? p.life / 100 : 1;
          ctx.fill(); ctx.globalAlpha = 1;
          ctx.font = `${p.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#13262f'; ctx.fillText(p.icon, p.x, p.y + 2*scale);
      });

      particles.current.forEach(p => {
        ctx.fillStyle = `rgba(54, 215, 183, ${p.life / 30})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      
      ctx.fillStyle = '#d3d0cb'; ctx.font = `700 ${width/16.6}px Orbitron`; ctx.textAlign = 'center';
      ctx.fillText(scoreRef.current.player.toString(), width / 4, height/8);
      ctx.fillText(scoreRef.current.opponent.toString(), (width / 4) * 3, height/8);
      
      ctx.font = `400 ${width/50}px Poppins`;
      activePowerUps.current.forEach(p => {
          if(p.target === 'player') ctx.fillText(p.type, width / 4, height/8 + height/16);
          if(p.target === 'opponent') ctx.fillText(p.type, (width / 4)*3, height/8 + height/16);
      });

      if (gameStatus.current === 'gameOver') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = `bold ${width / 15}px Orbitron`;
        ctx.fillStyle = '#d3d0cb';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', width / 2, height / 2 - height / 6);

        ctx.font = `${width / 25}px Poppins`;
        ctx.fillText(
            `Final Score: ${scoreRef.current.player} - ${scoreRef.current.opponent}`,
            width / 2,
            height / 2 - height / 12
        );
        
        ctx.font = `bold ${width / 20}px Poppins`;
        ctx.fillStyle = gameOverMessageRef.current === 'You Win!' ? '#36d7b7' : '#ff6347';
        ctx.fillText(gameOverMessageRef.current, width / 2, height / 2 + height / 20);

        const buttonWidth = width / 3.5;
        const buttonHeight = height / 9;
        const buttonX = width / 2 - buttonWidth / 2;
        const buttonY = height / 2 + height / 7;
        
        restartButtonBounds.current = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

        ctx.fillStyle = '#366e8d';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        ctx.strokeStyle = '#8da3b0';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.font = `bold ${width / 30}px Poppins`;
        ctx.fillStyle = '#d3d0cb';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Restart', width / 2, buttonY + buttonHeight / 2);
        ctx.textBaseline = 'alphabetic';
      } else if (gameStatus.current === 'start') {
          ctx.fillStyle = 'rgba(19, 38, 47, 0.7)'; ctx.fillRect(0,0,width,height);
          ctx.font = `${width/20}px Poppins`; ctx.fillStyle = 'rgba(211, 208, 203, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(messageRef.current, width / 2, height / 2 - (height/10));
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateDimensions, resetGame, sounds, createParticles, spawnPowerUp]); // The dependency array is now safe.

  useEffect(() => {
    if (gameStatus.current !== 'playing') return;
    
    if (score.player === gameDimensions.current.winningScore) {
        gameStatus.current = 'gameOver';
        setMessage('Game Over');
        setGameOverMessage('You Win!');
    } else if (score.opponent === gameDimensions.current.winningScore) {
        gameStatus.current = 'gameOver';
        setMessage('Game Over');
        setGameOverMessage('AI Wins!');
    }
  }, [score]);

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (gameStatus.current === 'start') {
        gameStatus.current = 'playing';
        setMessage('');
    } else if (gameStatus.current === 'gameOver') {
        const canvas = canvasRef.current;
        if (!canvas || !restartButtonBounds.current) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const { x: btnX, y: btnY, width: btnW, height: btnH } = restartButtonBounds.current;

        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            resetGame();
        }
    }
  }, [resetGame]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    let clientY: number | undefined;

    if ('touches' in e && e.touches.length > 0) {
      clientY = e.touches[0].clientY;
    } else if ('clientY' in e) {
      clientY = (e as React.MouseEvent).clientY;
    }

    if (clientY === undefined) return;

    const rect = canvas.getBoundingClientRect();
    const mouseY = clientY - rect.top;
    
    let newY = mouseY - player.current.height / 2;
    
    if (newY < 0) newY = 0;
    if (newY > gameDimensions.current.height - player.current.height) {
      newY = gameDimensions.current.height - player.current.height;
    }
    player.current.y = newY;
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full cursor-none">
       <canvas
        ref={canvasRef}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        className="bg-gable-green rounded-lg shadow-glow w-full h-full"
      />
    </div>
  );
};

export default PingPong;
