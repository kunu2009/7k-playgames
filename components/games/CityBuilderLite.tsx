import React, { useRef, useEffect, useState, useCallback } from 'react';

// --- TYPES & CONSTANTS ---
const ASPECT_RATIO = 1.25;
const ORIGINAL_WIDTH = 1000;
const GRID_SIZE = 12;

type BuildingType = 'residential' | 'commercial' | 'power' | 'park';

interface Building {
  type: BuildingType;
  row: number;
  col: number;
}

const BUILDING_DATA: Record<BuildingType, {
  name: string;
  cost: number;
  icon: string;
  color: string;
  effects: { cash: number; population: number; happiness: number; power: number; };
  description: string;
}> = {
  residential: { name: 'Apartment', cost: 100, icon: '🏠', color: '#87ceeb', effects: { cash: 2, population: 5, happiness: 0, power: -1 }, description: '+Pop, +Cash, -Power' },
  commercial: { name: 'Factory', cost: 250, icon: '🏭', color: '#ff6347', effects: { cash: 10, population: 0, happiness: -2, power: -3 }, description: '++Cash, --Happy, --Power' },
  power: { name: 'Solar Farm', cost: 400, icon: '☀️', color: '#f0e68c', effects: { cash: -1, population: 0, happiness: 0, power: 10 }, description: '+++Power, -Upkeep' },
  park: { name: 'Park', cost: 150, icon: '🌳', color: '#36d7b7', effects: { cash: -1, population: 0, happiness: 5, power: 0 }, description: '++Happy, -Upkeep' },
};

const ResourceBar: React.FC<{ resources: any }> = ({ resources }) => (
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-20 p-2 flex justify-center gap-2 md:gap-4 bg-gable-green/30 backdrop-blur-sm rounded-b-2xl">
    <div title="Cash">💰 {Math.floor(resources.cash)}</div>
    <div title="Population">🧑‍🤝‍🧑 {resources.population}</div>
    <div title="Happiness">😊 {resources.happiness}%</div>
    <div title="Power Grid">⚡️ {resources.power}</div>
  </div>
);

// --- GAME COMPONENT ---
const CityBuilderLite: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState< (Building | null)[][]>(() => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
  const [resources, setResources] = useState({ cash: 500, population: 0, happiness: 50, power: 10 });
  const [placing, setPlacing] = useState<BuildingType | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const [isBuildMenuOpen, setBuildMenuOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const c = useRef({ width: 1000, height: 800, scale: 1, cellSize: 0, gridX: 0, gridY: 0 });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const height = width / ASPECT_RATIO;
    const scale = width / ORIGINAL_WIDTH;
    const cellSize = Math.min(width, height) * 0.9 / GRID_SIZE;
    c.current = {
      width, height, scale, cellSize,
      gridX: (width - cellSize * GRID_SIZE) / 2,
      gridY: (height - cellSize * GRID_SIZE) / 2,
    };
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, []);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  const handlePlaceBuilding = (row: number, col: number) => {
    if (!placing) return;
    const data = BUILDING_DATA[placing];
    if (resources.cash < data.cost) {
      showMessage("Not enough cash!");
      return;
    }
    if (grid[row][col]) {
      showMessage("This tile is occupied!");
      return;
    }
    setResources(res => ({ ...res, cash: res.cash - data.cost }));
    setGrid(g => {
      const newGrid = g.map(r => [...r]);
      newGrid[row][col] = { type: placing, row, col };
      return newGrid;
    });
    setPlacing(null);
  };
  
  // Resource update loop
  useEffect(() => {
    const timer = setInterval(() => {
      let effects = { cash: 0, population: 0, happiness: 0, power: 0 };
      grid.flat().forEach(building => {
        if (!building) return;
        const data = BUILDING_DATA[building.type];
        effects.cash += data.effects.cash;
        effects.population += data.effects.population;
        effects.happiness += data.effects.happiness;
        effects.power += data.effects.power;
      });
      
      setResources(res => {
        const powerDeficit = Math.max(0, - (res.power + effects.power));
        const efficiency = powerDeficit > 0 ? Math.max(0.1, 1 - (powerDeficit / Math.max(10, res.power))) : 1;
        
        let happinessChange = effects.happiness;
        if(powerDeficit > 0) happinessChange -= 2; // Unhappy about power cuts
        if(res.cash < 0) happinessChange -= 1; // Unhappy about debt
        
        const newHappiness = Math.max(0, Math.min(100, res.happiness + happinessChange));

        return {
          cash: res.cash + effects.cash * efficiency,
          population: res.population + effects.population,
          happiness: newHappiness,
          power: res.power + effects.power,
        };
      });

    }, 1000);
    return () => clearInterval(timer);
  }, [grid]);

  // Drawing loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let animFrameId: number;
    const draw = () => {
      const { width, height, scale, cellSize, gridX, gridY } = c.current;
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#17557b'; ctx.fillRect(0,0,width,height);

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c_ = 0; c_ < GRID_SIZE; c_++) {
          ctx.strokeStyle = '#366e8d';
          ctx.strokeRect(gridX + c_ * cellSize, gridY + r * cellSize, cellSize, cellSize);
          const building = grid[r][c_];
          if(building) {
            const data = BUILDING_DATA[building.type];
            ctx.fillStyle = data.color;
            ctx.fillRect(gridX + c_ * cellSize, gridY + r * cellSize, cellSize, cellSize);
            ctx.font = `${cellSize * 0.6}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(data.icon, gridX + (c_ + 0.5) * cellSize, gridY + (r + 0.5) * cellSize);
          }
        }
      }
      
      if (placing && mousePos) {
        const col = Math.floor((mousePos.x - gridX) / cellSize);
        const row = Math.floor((mousePos.y - gridY) / cellSize);
        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
          ctx.fillStyle = grid[row][col] ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 255, 0, 0.4)';
          ctx.fillRect(gridX + col * cellSize, gridY + row * cellSize, cellSize, cellSize);
          const data = BUILDING_DATA[placing];
          ctx.font = `${cellSize * 0.6}px sans-serif`;
          ctx.globalAlpha = 0.7;
          ctx.fillText(data.icon, gridX + (col + 0.5) * cellSize, gridY + (row + 0.5) * cellSize);
          ctx.globalAlpha = 1.0;
        }
      }
      animFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrameId);
  }, [grid, placing, mousePos]);

  useEffect(() => {
    window.addEventListener('resize', updateConstants);
    updateConstants();
    return () => window.removeEventListener('resize', updateConstants);
  }, [updateConstants]);

  const handleCanvasInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (e.type === 'touchmove' || e.type === 'mousemove') {
      setMousePos({ x, y });
    } else if (e.type === 'touchstart' || e.type === 'mousedown') {
      const col = Math.floor((x - c.current.gridX) / c.current.cellSize);
      const row = Math.floor((y - c.current.gridY) / c.current.cellSize);
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        handlePlaceBuilding(row, col);
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-pointer font-poppins">
      <canvas ref={canvasRef}
        onMouseDown={handleCanvasInteraction}
        onMouseMove={handleCanvasInteraction}
        onTouchStart={handleCanvasInteraction}
        onTouchMove={handleCanvasInteraction}
        className="bg-gable-green rounded-lg shadow-glow w-full h-full"
      />
      <ResourceBar resources={resources} />

      {message && <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg animate-fade-in z-30">{message}</div>}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <button onClick={() => setBuildMenuOpen(true)} className="px-6 py-3 bg-calypso text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transform hover:scale-105 transition-all">
          Build 🏗️
        </button>
        {placing && <button onClick={() => setPlacing(null)} className="ml-4 px-6 py-3 bg-regent-gray text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transform hover:scale-105 transition-all">Cancel</button>}
      </div>

      {isBuildMenuOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center" onClick={() => setBuildMenuOpen(false)}>
          <div className="bg-chathams-blue p-4 rounded-lg w-11/12 max-w-lg grid grid-cols-2 gap-4" onClick={e => e.stopPropagation()}>
            {Object.entries(BUILDING_DATA).map(([type, data]) => (
              <div key={type} onClick={() => { setPlacing(type as BuildingType); setBuildMenuOpen(false); }}
                   className={`p-3 bg-gable-green rounded-lg text-center ${resources.cash < data.cost ? 'opacity-50' : 'cursor-pointer hover:bg-calypso'}`}>
                <div className="text-4xl">{data.icon}</div>
                <div className="font-bold">{data.name}</div>
                <div className="text-sm text-bali-hai">💰{data.cost}</div>
                <div className="text-xs text-regent-gray">{data.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityBuilderLite;