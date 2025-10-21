
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- TYPES & CONSTANTS ---
const ASPECT_RATIO = 1.25;
const ORIGINAL_WIDTH = 1000;

type ResourceType = 'iron' | 'cobalt' | 'gold';
type UpgradeType = 'laser' | 'drone' | 'cargo' | 'scanner';

interface Asteroid {
  id: number;
  x: number;
  y: number;
  size: number;
  type: ResourceType;
  health: number;
  maxHealth: number;
  rotation: number;
  rotationSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

const RESOURCE_DATA: Record<ResourceType, { color: string; value: number; healthModifier: number }> = {
  iron: { color: '#828f9a', value: 1, healthModifier: 1 },
  cobalt: { color: '#366e8d', value: 5, healthModifier: 2.5 },
  gold: { color: '#f0e68c', value: 25, healthModifier: 5 },
};

const UPGRADE_DATA: Record<UpgradeType, { name: string; baseCost: number; description: (level: number) => string; }> = {
  laser: { name: 'Laser Power', baseCost: 25, description: level => `Mines for ${5 * level} damage per click.` },
  drone: { name: 'Mining Drone', baseCost: 100, description: level => `${(level * 2.5).toFixed(1)} auto-damage/sec` },
  cargo: { name: 'Cargo Hold', baseCost: 50, description: level => `${50 + level * 25} max capacity` },
  scanner: { name: 'Geo Scanner', baseCost: 500, description: level => `+${level}% rare asteroid chance` },
};

// --- GAME COMPONENT ---
const SpaceMinerTycoon: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state
  const [cash, setCash] = useLocalStorage('smt-cash', 0);
  const [resources, setResources] = useLocalStorage<Record<ResourceType, number>>('smt-resources', { iron: 0, cobalt: 0, gold: 0 });
  const [upgrades, setUpgrades] = useLocalStorage<Record<UpgradeType, number>>('smt-upgrades', { laser: 1, drone: 0, cargo: 1, scanner: 1 });
  const [isUpgradeMenuOpen, setUpgradeMenuOpen] = useState(false);
  const sounds = useSounds(SOUND_EFFECTS);

  // Refs for animation objects
  const asteroids = useRef<Asteroid[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const stars = useRef<{x: number, y: number, size: number}[]>([]);
  const laserFlash = useRef(0);
  
  // Scalable dimensions
  const c = useRef({ width: 1000, height: 800, scale: 1, shipX: 0, shipY: 0 });

  const totalResources = useMemo(() => Object.values(resources).reduce((a, b) => a + b, 0), [resources]);
  const cargoCapacity = useMemo(() => 50 + upgrades.cargo * 25, [upgrades.cargo]);

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    c.current = {
      width, height,
      scale: width / ORIGINAL_WIDTH,
      shipX: width * 0.15,
      shipY: height / 2,
    };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
    if(stars.current.length === 0) {
        for(let i = 0; i < 100; i++) {
            stars.current.push({ x: Math.random() * width, y: Math.random() * height, size: Math.random() * 2 });
        }
    }
  }, []);

  const spawnAsteroid = useCallback(() => {
    if (asteroids.current.length > 10) return;
    const { width, height, scale } = c.current;
    const size = (Math.random() * 40 + 20) * scale;
    const scannerBonus = 1 + (upgrades.scanner / 100);
    const rand = Math.random() / scannerBonus;
    let type: ResourceType;
    if (rand < 0.1) type = 'gold';
    else if (rand < 0.4) type = 'cobalt';
    else type = 'iron';
    
    const data = RESOURCE_DATA[type];
    const health = Math.floor(size * 5 * data.healthModifier);

    asteroids.current.push({
      id: Date.now() + Math.random(),
      x: width + size,
      y: Math.random() * height,
      size, type, health, maxHealth: health,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.01
    });
  }, [upgrades.scanner]);

  const handleMine = useCallback((asteroid: Asteroid, damage: number) => {
    asteroid.health -= damage;
    laserFlash.current = 1;
    if (damage > 1) sounds.hover(); // Click mining sound
    
    if (asteroid.health <= 0) {
      sounds.favorite(); // Explosion sound
      // Collect resources
      const amount = Math.floor(asteroid.size / c.current.scale / 4);
      if(totalResources + amount <= cargoCapacity) {
        setResources(prev => ({...prev, [asteroid.type]: prev[asteroid.type] + amount }));
        floatingTexts.current.push({ id: Date.now(), x: asteroid.x, y: asteroid.y, text: `+${amount} ${asteroid.type}`, life: 60, color: RESOURCE_DATA[asteroid.type].color });
      } else {
        floatingTexts.current.push({ id: Date.now(), x: asteroid.x, y: asteroid.y, text: 'Cargo Full!', life: 60, color: '#ff6347' });
      }

      // Create explosion particles
      for (let i = 0; i < asteroid.size; i++) {
        particles.current.push({
          x: asteroid.x, y: asteroid.y,
          vx: (Math.random() - 0.5) * (Math.random() * 8), vy: (Math.random() - 0.5) * (Math.random() * 8),
          size: Math.random() * 3 + 1, life: Math.random() * 60 + 40,
          color: RESOURCE_DATA[asteroid.type].color,
        });
      }
      asteroids.current = asteroids.current.filter(a => a.id !== asteroid.id);
    }
  }, [totalResources, cargoCapacity, setResources, sounds]);

  const handleCanvasClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (const asteroid of asteroids.current) {
      const dist = Math.hypot(x - asteroid.x, y - asteroid.y);
      if (dist < asteroid.size) {
        handleMine(asteroid, 5 * upgrades.laser);
        break;
      }
    }
  }, [handleMine, upgrades.laser]);
  
  const sellResources = () => {
    sounds.click();
    const earnings = Object.entries(resources).reduce((acc, [type, amount]) => {
      return acc + amount * RESOURCE_DATA[type as ResourceType].value;
    }, 0);
    setCash(prev => prev + earnings);
    setResources({ iron: 0, cobalt: 0, gold: 0 });
  };
  
  const buyUpgrade = (type: UpgradeType) => {
    const level = upgrades[type];
    const cost = Math.floor(UPGRADE_DATA[type].baseCost * Math.pow(1.5, level));
    if (cash >= cost) {
      sounds.click();
      setCash(prev => prev - cost);
      setUpgrades(prev => ({ ...prev, [type]: prev[type] + 1 }));
    } else {
      sounds.favorite();
    }
  };

  // Main game loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let animFrameId: number;
    let lastTime = 0;
    
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime || 16.7;
      lastTime = timestamp;
      const { width, height, scale, shipX, shipY } = c.current;

      // Update logic
      if (Math.random() < 0.01) spawnAsteroid(); // Spawn new asteroids
      if (upgrades.drone > 0 && asteroids.current.length > 0) {
        const droneDamage = upgrades.drone * 2.5 * (deltaTime / 1000);
        handleMine(asteroids.current[0], droneDamage);
      }

      stars.current.forEach(s => { s.x -= s.size * 0.1; if(s.x < 0) {s.x = width; s.y = Math.random() * height;} });
      asteroids.current.forEach(a => { a.x -= 1 * scale; a.rotation += a.rotationSpeed; });
      particles.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      floatingTexts.current.forEach(t => { t.y -= 1; t.life--; });
      if (laserFlash.current > 0) laserFlash.current -= 0.1;

      asteroids.current = asteroids.current.filter(a => a.x > -a.size);
      particles.current = particles.current.filter(p => p.life > 0);
      floatingTexts.current = floatingTexts.current.filter(t => t.life > 0);

      // Drawing logic
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0,0,width,height);
      stars.current.forEach(s => { ctx.fillStyle = `rgba(211, 208, 203, ${s.size/2})`; ctx.fillRect(s.x, s.y, s.size, s.size); });
      
      // Draw Ship
      ctx.save();
      ctx.translate(shipX, shipY);
      ctx.fillStyle = '#d3d0cb'; ctx.shadowColor = '#36d7b7'; ctx.shadowBlur = 15 * scale;
      ctx.beginPath(); ctx.moveTo(0, -25 * scale); ctx.lineTo(20 * scale, 15 * scale); ctx.lineTo(-20 * scale, 15 * scale); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#828f9a'; ctx.fillRect(-10*scale, 15*scale, 20*scale, 10*scale);
      ctx.shadowBlur = 0; ctx.restore();

      // Draw Laser
      if (laserFlash.current > 0 && asteroids.current.length > 0) {
        ctx.strokeStyle = `rgba(54, 215, 183, ${laserFlash.current})`;
        ctx.lineWidth = 3 * scale; ctx.beginPath(); ctx.moveTo(shipX, shipY);
        ctx.lineTo(asteroids.current[0].x, asteroids.current[0].y); ctx.stroke();
      }

      // Draw Asteroids
      asteroids.current.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);
        ctx.fillStyle = RESOURCE_DATA[a.type].color;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -a.size);
        for(let i=1; i<6; i++) { ctx.lineTo(a.size * Math.sin(i*2*Math.PI/6), -a.size * Math.cos(i*2*Math.PI/6)); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        // Health bar
        ctx.fillStyle = '#ff6347'; ctx.fillRect(a.x - a.size, a.y - a.size - 10 * scale, a.size * 2, 5 * scale);
        ctx.fillStyle = '#36d7b7'; ctx.fillRect(a.x - a.size, a.y - a.size - 10 * scale, a.size * 2 * (a.health / a.maxHealth), 5 * scale);
      });
      
      particles.current.forEach(p => { ctx.globalAlpha = p.life / 60; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1; });
      floatingTexts.current.forEach(t => {
        ctx.font = `bold ${16 * scale}px Poppins`; ctx.fillStyle = `rgba(255,255,255, ${t.life/60})`;
        ctx.fillText(t.text, t.x, t.y);
      });
      
      animFrameId = requestAnimationFrame(gameLoop);
    };
    gameLoop(0);
    return () => cancelAnimationFrame(animFrameId);
  }, [spawnAsteroid, handleMine, upgrades]);
  
  useEffect(() => {
    window.addEventListener('resize', updateConstants);
    updateConstants();
    return () => window.removeEventListener('resize', updateConstants);
  }, [updateConstants]);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-pointer font-poppins">
      <canvas ref={canvasRef} onMouseDown={handleCanvasClick} onTouchStart={handleCanvasClick} className="bg-gable-green rounded-lg shadow-glow w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none text-timberwolf flex flex-col justify-between p-4">
        {/* Top Bar */}
        <div className="w-full flex justify-center">
            <div className="bg-gable-green/50 backdrop-blur-sm px-6 py-2 rounded-lg font-orbitron text-2xl shadow-lg">
                💰 {Math.floor(cash).toLocaleString()}
            </div>
        </div>
        
        {/* Bottom UI */}
        <div className="flex justify-between items-end gap-4">
          {/* Resources */}
          <div className="bg-gable-green/50 backdrop-blur-sm p-3 rounded-lg shadow-lg pointer-events-auto flex flex-col gap-2">
            <h3 className="font-orbitron text-lg border-b border-calypso/50 pb-1">Cargo Hold</h3>
            <div className={`font-semibold ${totalResources > cargoCapacity ? 'text-red-400' : ''}`}>
              {totalResources.toLocaleString()} / {cargoCapacity.toLocaleString()}
            </div>
            <div className="text-sm">Iron: {resources.iron.toLocaleString()}</div>
            <div className="text-sm">Cobalt: {resources.cobalt.toLocaleString()}</div>
            <div className="text-sm">Gold: {resources.gold.toLocaleString()}</div>
            <button onClick={sellResources} className="mt-2 w-full bg-calypso text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-opacity-90 transition-all">Sell All</button>
          </div>
          
          {/* Upgrades Button */}
          <button onClick={() => { sounds.click(); setUpgradeMenuOpen(true); }} className="bg-calypso text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-opacity-90 transform hover:scale-105 transition-all pointer-events-auto">
            Upgrades 🚀
          </button>
        </div>
      </div>

      {/* Upgrade Menu Modal */}
      {isUpgradeMenuOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center" onClick={() => { sounds.filter(); setUpgradeMenuOpen(false); }}>
          <div className="bg-chathams-blue p-4 rounded-lg w-11/12 max-w-md pointer-events-auto flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-orbitron text-center border-b border-calypso/50 pb-2">Ship Upgrades</h2>
            {Object.entries(upgrades).map(([type, level]) => {
              const uType = type as UpgradeType;
              const data = UPGRADE_DATA[uType];
              const cost = Math.floor(data.baseCost * Math.pow(1.5, level));
              return (
                <div key={type} className="bg-gable-green/80 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-bold">{data.name} (Lvl {level})</div>
                    <div className="text-xs text-bali-hai">{data.description(level)}</div>
                  </div>
                  <button onClick={() => buyUpgrade(uType)} disabled={cash < cost}
                    className="bg-calypso text-white font-bold py-2 px-3 rounded-lg shadow-md hover:bg-opacity-90 transition-all disabled:bg-regent-gray/50 disabled:cursor-not-allowed">
                      💰 {cost.toLocaleString()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceMinerTycoon;
