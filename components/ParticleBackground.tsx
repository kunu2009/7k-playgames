
import React, { useMemo } from 'react';

const ParticleBackground: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const size = Math.random() * 5 + 1;
      const style = {
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 30 + 20}s`,
        animationDelay: `${Math.random() * -20}s`,
      };
      return <div key={i} className="particle" style={style}></div>;
    });
  }, []);

  return <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">{particles}</div>;
};

export default ParticleBackground;
