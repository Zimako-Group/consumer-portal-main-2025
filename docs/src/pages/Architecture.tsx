import React from 'react';

import { CodeBlock } from '../components/CodeBlock';
import { Collapsible } from '../components/Collapsible';
import { ContentEditor } from '../components/ContentEditor';
import { LastUpdated } from '../components/LastUpdated';
import { MermaidDiagram } from '../components/MermaidDiagram';
import { useDocStore } from '../hooks/useDocContent';

export function Architecture() {
  const docs = useDocStore(state => state.docs);
  const pageData = docs.find(doc => doc.id === 'architecture');

  if (!pageData) return null;

  const systemArchitectureDiagram = `
graph TD
    Client[Client Application]
    API[API Gateway]
    Auth[Authentication Service]
    Cache[Cache Layer]
    DB[(Database)]
    
    Client -->|HTTP/HTTPS| API
    API -->|Validate| Auth
    API -->|Query| Cache
    Cache -->|Miss| DB
    DB -->|Update| Cache
  `;

  const authFlowDiagram = `
sequenceDiagram
    participant C as Client
    participant A as API
    participant Auth as Auth Service
    participant DB as Database
    
    C->>A: Login Request
    A->>Auth: Validate Credentials
    Auth->>DB: Check User
    DB-->>Auth: User Data
    Auth-->>A: Generate Token
    A-->>C: Return JWT
  `;

  const componentDiagram = `
classDiagram
    class APIGateway {
        +handleRequest()
        +validateToken()
        +routeRequest()
    }
    class AuthService {
        +login()
        +register()
        +validateToken()
    }
    class CacheService {
        +get()
        +set()
        +invalidate()
    }
    class Database {
        +query()
        +transaction()
    }
    
    APIGateway --> AuthService
    APIGateway --> CacheService
    CacheService --> Database
  `;

  const exampleCode = `// Example API Route
import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/api/data', authenticate, async (req, res) => {
  try {
    const data = await fetchData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;`;

  const configExample = `{
  "api": {
    "baseUrl": "https://api.example.com",
    "version": "v1",
    "timeout": 5000
  },
  "auth": {
    "tokenExpiry": "24h",
    "refreshTokenExpiry": "7d"
  }
}`;

  return (
    <div className="prose dark:prose-invert prose-indigo max-w-none">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-4">Architecture</h1>
        <LastUpdated date={pageData.lastUpdated} />

        <ContentEditor id={pageData.id} content={pageData.content} className="lead" />

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">System Overview</h2>
            <p className="mb-4">
              Our system architecture follows a microservices pattern with the following key
              components:
            </p>
            <MermaidDiagram definition={systemArchitectureDiagram} className="my-8" />
            <Collapsible title="Core Components" level="info" defaultOpen>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <strong className="min-w-[120px] inline-block">API Layer</strong>
                  <span>RESTful and GraphQL interfaces</span>
                </li>
                <li className="flex items-start">
                  <strong className="min-w-[120px] inline-block">Authentication</strong>
                  <span>JWT-based auth system</span>
                </li>
                <li className="flex items-start">
                  <strong className="min-w-[120px] inline-block">Data Layer</strong>
                  <span>Database and caching</span>
                </li>
                <li className="flex items-start">
                  <strong className="min-w-[120px] inline-block">Business Logic</strong>
                  <span>Core application logic</span>
                </li>
              </ul>
            </Collapsible>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Authentication Flow</h2>
            <p className="mb-4">
              The authentication process follows a secure token-based approach:
            </p>
            <MermaidDiagram definition={authFlowDiagram} className="my-8" />
            <Collapsible title="Authentication Details" level="success">
              <div className="space-y-2">
                <p>Our authentication system uses a multi-layer approach:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>JWT tokens for stateless authentication</li>
                  <li>Refresh tokens for extended sessions</li>
                  <li>Role-based access control (RBAC)</li>
                  <li>OAuth2 integration for third-party authentication</li>
                </ol>
              </div>
            </Collapsible>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Component Structure</h2>
            <p className="mb-4">
              Our system is composed of several key services that work together:
            </p>
            <MermaidDiagram definition={componentDiagram} className="my-8" />
            <Collapsible title="Component Details" level="info">
              <div className="space-y-2">
                <p>Each component has specific responsibilities:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>API Gateway: Routes and validates requests</li>
                  <li>Auth Service: Handles authentication and authorization</li>
                  <li>Cache Service: Manages data caching</li>
                  <li>Database: Persistent storage</li>
                </ul>
              </div>
            </Collapsible>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">API Structure</h2>
            <p className="mb-4">Our API follows RESTful principles with the following structure:</p>
            <CodeBlock
              code={exampleCode}
              language="typescript"
              filename="routes/data.ts"
              showLineNumbers
            />
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Configuration</h2>
            <Collapsible title="Configuration Options" level="warning">
              <p className="mb-4">The system can be configured using a JSON configuration file:</p>
              <CodeBlock code={configExample} language="json" filename="config.json" />
            </Collapsible>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Advanced Topics</h2>
            <div className="space-y-4">
              <Collapsible title="Authentication Flow" level="success">
                <div className="space-y-2">
                  <p>Our authentication system uses a multi-layer approach:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>JWT tokens for stateless authentication</li>
                    <li>Refresh tokens for extended sessions</li>
                    <li>Role-based access control (RBAC)</li>
                    <li>OAuth2 integration for third-party authentication</li>
                  </ol>
                </div>
              </Collapsible>

              <Collapsible title="Caching Strategy">
                <div className="space-y-2">
                  <p>We implement a multi-level caching strategy:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>In-memory cache for frequently accessed data</li>
                    <li>Redis for distributed caching</li>
                    <li>CDN for static assets</li>
                  </ul>
                </div>
              </Collapsible>

              <Collapsible title="Error Handling" level="warning">
                <div className="space-y-2">
                  <p>The system implements comprehensive error handling:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Standardized error responses</li>
                    <li>Error logging and monitoring</li>
                    <li>Automatic retry mechanisms</li>
                    <li>Circuit breakers for external services</li>
                  </ul>
                </div>
              </Collapsible>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
