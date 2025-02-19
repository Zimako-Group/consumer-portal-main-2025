import { CheckIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React, { useState } from 'react';

import { useDocStore } from '../hooks/useDocContent';

interface ContentEditorProps {
  id: string;
  content: string;
  className?: string;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  id,
  content: initialContent,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const updateDoc = useDocStore(state => state.updateDoc);

  const handleSave = () => {
    updateDoc(id, { content });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="group relative">
        <div className={className}>{content}</div>
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Edit content"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="w-full min-h-[200px] p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleCancel}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <XMarkIcon className="h-5 w-5" />
          <span className="sr-only">Cancel</span>
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <CheckIcon className="h-5 w-5" />
          <span className="sr-only">Save</span>
        </button>
      </div>
    </div>
  );
};
