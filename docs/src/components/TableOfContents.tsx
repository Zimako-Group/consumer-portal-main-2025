import { ChevronDownIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface TOCItem {
  id: string;
  title: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('h1, h2, h3')).map(element => ({
      id: element.id,
      title: element.textContent || '',
      level: Number(element.tagName.charAt(1)),
    }));
    setHeadings(elements);
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0% -35% 0%' }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 xl:hidden"
      >
        <span>On this page</span>
        <ChevronDownIcon
          className={`h-5 w-5 transform transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      <nav className={`${isOpen ? 'block' : 'hidden xl:block'} mt-4 xl:mt-0`}>
        <h2 className="font-semibold text-gray-900 dark:text-white">On this page</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {headings.map(heading => (
            <li
              key={heading.id}
              style={{
                paddingLeft: `${(heading.level - 1) * 1}rem`,
              }}
            >
              <a
                href={`#${heading.id}`}
                onClick={e => {
                  e.preventDefault();
                  document.getElementById(heading.id)?.scrollIntoView({
                    behavior: 'smooth',
                  });
                  setIsOpen(false);
                }}
                className={`block text-sm ${
                  activeId === heading.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {heading.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
