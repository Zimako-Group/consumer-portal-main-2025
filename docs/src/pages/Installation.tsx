import React from 'react';

import { LastUpdated } from '../components/LastUpdated';
import { docs } from '../data/docs';

export function Installation() {
  const pageData = docs.find(doc => doc.id === 'installation');

  return (
    <div className="prose dark:prose-invert prose-indigo max-w-none">
      <h1>Installation</h1>
      {pageData && <LastUpdated date={pageData.lastUpdated} />}
      <p className="lead">Get up and running with our platform in just a few minutes.</p>

      <h2>Prerequisites</h2>
      <ul>
        <li>Node.js 16 or higher</li>
        <li>npm or yarn package manager</li>
        <li>Basic knowledge of JavaScript/TypeScript</li>
      </ul>

      <h2>Installation Steps</h2>
      <div className="my-6">
        <p>1. Create a new project using our CLI:</p>
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <code>npx create-app my-project</code>
        </pre>
      </div>

      <div className="my-6">
        <p>2. Navigate to the project directory:</p>
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <code>cd my-project</code>
        </pre>
      </div>

      <div className="my-6">
        <p>3. Install dependencies:</p>
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <code>npm install</code>
        </pre>
      </div>

      <h2>Verification</h2>
      <p>To verify your installation, run the following command:</p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <code>npm run dev</code>
      </pre>
    </div>
  );
}
