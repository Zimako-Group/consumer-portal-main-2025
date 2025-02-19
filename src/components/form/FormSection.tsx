// These are for the Admin Dashboard Side Scrollbar for Creating and Editing accounts

import React from 'react';

interface FormSectionProps {
  id: string;
  title: string;
  active: boolean;
  children: React.ReactNode;
}

export default function FormSection({ id, title, active, children }: FormSectionProps) {
  if (!active) return null;
  
  return (
    <div id={id} className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {children}
    </div>
  );
}