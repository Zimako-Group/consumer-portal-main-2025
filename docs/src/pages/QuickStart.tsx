import React from 'react';

import { LastUpdated } from '../components/LastUpdated';
import { docs } from '../data/docs';

export function QuickStart() {
  const pageData = docs.find(doc => doc.id === 'quickstart');

  return (
    <div className="prose dark:prose-invert prose-indigo max-w-none">
      <h1>Quick Start</h1>
      {pageData && <LastUpdated date={pageData.lastUpdated} />}
      <p className="lead">Get started with our platform in under 5 minutes.</p>

      <h2>Basic Usage</h2>
      <p>Here's a simple example to get you started:</p>

      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <code>{`import { createApp } from '@our-platform/core';

const app = createApp({
  name: 'my-app',
  version: '1.0.0'
});

app.start();`}</code>
      </pre>

      <h2>Next Steps</h2>
      <ul>
        <li>Explore the core concepts in our Architecture guide</li>
        <li>Learn about configuration options</li>
        <li>Join our community Discord for support</li>
      </ul>

      <h2>Common Use Cases</h2>
      <p>Here are some common scenarios you might want to implement:</p>
      <ul>
        <li>Setting up authentication</li>
        <li>Connecting to a database</li>
        <li>Implementing API endpoints</li>
        <li>Adding middleware</li>
      </ul>
    </div>
  );
}
