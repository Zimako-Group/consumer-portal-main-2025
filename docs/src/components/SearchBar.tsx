import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { useSearch } from '../hooks/useSearch';

export function SearchBar() {
  const navigate = useNavigate();
  const { searchTerm, setSearchTerm, results, isSearching } = useSearch();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showResults, setShowResults] = React.useState(false);

  useOnClickOutside(searchRef, () => setShowResults(false));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search documentation... (⌘/)"
          className="h-12 w-full rounded-full border border-gray-200 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:w-64 md:w-96"
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && (searchTerm.length > 0 || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800 dark:ring-1 dark:ring-white/10">
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto overscroll-contain px-2 py-3">
            {isSearching ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Searching...</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No results found
              </div>
            ) : (
              <ul>
                {results.map(result => (
                  <li key={result.id}>
                    <button
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                      onClick={() => {
                        navigate(result.url);
                        setSearchTerm('');
                        setShowResults(false);
                      }}
                    >
                      <div className="font-medium">{result.title}</div>
                      {result.description && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                          {result.description}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
