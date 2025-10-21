import React from 'react';

const LogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="neon-grad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#36D7B7" />
        <stop offset="100%" stopColor="#8DA3B0" />
      </linearGradient>
      <filter id="neon-glow-comp" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#neon-glow-comp)">
      {/* 7 */}
      <path d="M12 12 L32 12 L12 52" stroke="url(#neon-grad-comp)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      {/* K */}
      <path d="M32 12 L32 52 M48 12 L32 32 L48 52" stroke="url(#neon-grad-comp)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);

export default LogoIcon;
