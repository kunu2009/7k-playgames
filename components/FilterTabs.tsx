
import React from 'react';
import { GameType } from '../types';

type FilterType = 'ALL' | GameType | 'FAVORITES';

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ activeFilter, onFilterChange }) => {
  const tabs: { label: string; filter: FilterType }[] = [
    { label: 'All Games', filter: 'ALL' },
    { label: 'Solo', filter: GameType.SOLO },
    { label: 'Multiplayer', filter: GameType.MULTIPLAYER },
    { label: 'Favorites', filter: 'FAVORITES' },
  ];

  const baseClasses = "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-calypso focus:ring-opacity-50";
  const activeClasses = "bg-calypso text-white shadow-lg";
  const inactiveClasses = "bg-gable-green/50 text-bali-hai hover:bg-calypso/50 hover:text-timberwolf";

  return (
    <div className="flex justify-center items-center bg-gable-green/30 backdrop-blur-sm p-2 rounded-full max-w-md mx-auto space-x-2">
      {tabs.map(tab => (
        <button
          key={tab.filter}
          onClick={() => onFilterChange(tab.filter)}
          className={`${baseClasses} ${activeFilter === tab.filter ? activeClasses : inactiveClasses}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default FilterTabs;
