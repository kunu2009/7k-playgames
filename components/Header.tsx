
import React from 'react';
import LogoIcon from './icons/LogoIcon';

const Header: React.FC = () => {
  return (
    <header className="py-4 text-center flex justify-center items-center">
      <LogoIcon className="w-24 h-24 md:w-32 md:h-32" />
    </header>
  );
};

export default Header;