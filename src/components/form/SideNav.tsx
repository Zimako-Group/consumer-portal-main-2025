// These are for the Admin Dashboard Side Scrollbar for Creating and Editing accounts

import React from 'react';

interface Section {
  id: string;
  title: string;
}

interface SideNavProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export default function SideNav({ sections, activeSection, onSectionChange }: SideNavProps) {
  return (
    <nav className="w-64 border-r bg-gray-50">
      <ul className="py-4">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => onSectionChange(section.id)}
              className={`w-full text-left px-4 py-2 text-sm font-medium ${
                activeSection === section.id
                  ? 'text-theme bg-white border-l-2 border-theme'
                  : 'text-gray-600 hover:text-theme hover:bg-white'
              }`}
            >
              {section.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}