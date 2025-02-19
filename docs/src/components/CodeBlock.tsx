import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/themes/prism-tomorrow.css';

import React, { useEffect, useState } from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language, filename, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Prism.highlightAll();
    }
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clean up the code by removing extra newlines at start/end
  const cleanCode = code.trim();

  return (
    <div className="group relative my-6 rounded-lg bg-gray-900 dark:bg-gray-800">
      {filename && (
        <div className="flex items-center justify-between rounded-t-lg border-b border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 dark:bg-gray-700">
          <span className="font-mono">{filename}</span>
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute right-4 top-4 z-10 rounded-md p-2 text-gray-400 opacity-0 transition-opacity hover:text-gray-300 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          title="Copy code"
        >
          {copied ? (
            <CheckIcon className="h-5 w-5 text-green-500" />
          ) : (
            <ClipboardDocumentIcon className="h-5 w-5" />
          )}
        </button>
        <div className="overflow-hidden">
          <pre className={`${showLineNumbers ? 'line-numbers' : ''}`}>
            <code className={`language-${language}`}>{cleanCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
