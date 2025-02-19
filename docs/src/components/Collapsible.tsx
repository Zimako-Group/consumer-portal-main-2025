import { ChevronDownIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useRef, useState } from 'react';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  level?: 'default' | 'info' | 'warning' | 'success';
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  level = 'default',
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== buttonRef.current) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          setIsOpen(!isOpen);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prev = buttonRef.current
            ?.closest('[role="region"]')
            ?.previousElementSibling?.querySelector('button');
          prev?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          const next = buttonRef.current
            ?.closest('[role="region"]')
            ?.nextElementSibling?.querySelector('button');
          next?.focus();
          break;
        case 'Home':
          e.preventDefault();
          const first = buttonRef.current
            ?.closest('[role="region"]')
            ?.parentElement?.firstElementChild?.querySelector('button');
          first?.focus();
          break;
        case 'End':
          e.preventDefault();
          const last = buttonRef.current
            ?.closest('[role="region"]')
            ?.parentElement?.lastElementChild?.querySelector('button');
          last?.focus();
          break;
      }
    };

    buttonRef.current?.addEventListener('keydown', handleKeyDown);
    return () => buttonRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getBgColor = () => {
    switch (level) {
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const getBorderColor = () => {
    switch (level) {
      case 'info':
        return 'border-blue-200 dark:border-blue-800';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-800';
      case 'success':
        return 'border-green-200 dark:border-green-800';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  const getTextColor = () => {
    switch (level) {
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'success':
        return 'text-green-700 dark:text-green-300';
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  };

  return (
    <div
      className={`my-4 overflow-hidden rounded-lg border ${getBorderColor()}`}
      role="region"
      aria-labelledby={`collapsible-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between px-4 py-3 text-left font-medium ${getTextColor()} ${getBgColor()} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:focus:ring-blue-400`}
        aria-expanded={isOpen}
        id={`collapsible-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={`h-5 w-5 transform transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        ref={contentRef}
        className={`transform overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
