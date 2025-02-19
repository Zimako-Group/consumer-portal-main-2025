import mermaid from 'mermaid';

import React, { useEffect, useRef } from 'react';

import { useTheme } from '../hooks/useTheme';

interface MermaidDiagramProps {
  definition: string;
  className?: string;
}

// Initialize mermaid with default config
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  themeVariables: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  },
});

export function MermaidDiagram({ definition, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (containerRef.current) {
      // Update theme based on dark mode
      mermaid.initialize({
        theme: isDarkMode ? 'dark' : 'default',
        themeVariables: isDarkMode
          ? {
              primaryColor: '#3b82f6',
              primaryTextColor: '#e5e7eb',
              primaryBorderColor: '#4b5563',
              lineColor: '#6b7280',
              secondaryColor: '#1f2937',
              tertiaryColor: '#374151',
            }
          : undefined,
      });

      // Clear previous diagram
      containerRef.current.innerHTML = definition;

      // Render new diagram
      mermaid.contentLoaded();
    }
  }, [definition, isDarkMode]);

  return (
    <div
      ref={containerRef}
      className={`mermaid overflow-x-auto rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50 ${className}`}
    >
      {definition}
    </div>
  );
}
