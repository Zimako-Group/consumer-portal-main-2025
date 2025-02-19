import React from 'react';

import { LastUpdated } from '../components/LastUpdated';
import { docs } from '../data/docs';

export function Configuration() {
  const pageData = docs.find(doc => doc.id === 'configuration');

  return (
    <div className="prose dark:prose-invert prose-indigo max-w-none">
      <h1>Configuration</h1>
      {pageData && <LastUpdated date={pageData.lastUpdated} />}
      <p className="lead">Learn how to configure and customize the platform to meet your needs.</p>

      <h2>Basic Configuration</h2>
      <p>Configuration is handled through a central config file:</p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <code>{`{
  "app": {
    "name": "my-app",
    "version": "1.0.0",
    "environment": "development"
  },
  "api": {
    "port": 3000,
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432
  }
}`}</code>
      </pre>

      <h2>Environment Variables</h2>
      <p>Sensitive configuration should be handled through environment variables:</p>
      <ul>
        <li>
          <code>APP_SECRET</code> - Application secret key
        </li>
        <li>
          <code>DB_PASSWORD</code> - Database password
        </li>
        <li>
          <code>API_KEYS</code> - External service API keys
        </li>
      </ul>

      <h2>Advanced Options</h2>
      <p>
        The platform supports various advanced configuration options for fine-tuning performance and
        behavior:
      </p>
      <ul>
        <li>Cache configuration</li>
        <li>Rate limiting settings</li>
        <li>Logging levels and outputs</li>
        <li>Authentication providers</li>
      </ul>
    </div>
  );
}
