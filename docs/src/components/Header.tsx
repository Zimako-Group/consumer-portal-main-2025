import { Bars3Icon } from '@heroicons/react/24/outline';

import React from 'react';

import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 shadow-sm transition-colors sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden -m-2.5 p-2.5 text-gray-700 dark:text-gray-200"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Documentation
          </h1>
        </div>

        {/* Search and Theme Toggle */}
        <div className="flex flex-1 items-center justify-end gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex flex-1 justify-end">
            <SearchBar />
          </div>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
