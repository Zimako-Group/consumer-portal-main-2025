import React from 'react';

import { LastUpdated } from '../components/LastUpdated';
import { docs } from '../data/docs';

export function Introduction() {
  const pageData = docs.find(doc => doc.id === 'introduction');

  return (
    <div className="prose dark:prose-invert prose-indigo max-w-none">
      <h1>Introduction</h1>
      {pageData && <LastUpdated date={pageData.lastUpdated} />}
      <p className="lead">
        Welcome to our comprehensive documentation. This guide will help you understand our platform
        and make the most of its features.
      </p>

      <h2>What is Our Platform?</h2>
      <p>
        Our platform is a modern, scalable solution designed to help developers build better
        applications faster. With a focus on developer experience and best practices, we provide the
        tools you need to succeed.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li>Modern architecture with best-in-class performance</li>
        <li>Developer-friendly APIs and extensive documentation</li>
        <li>Built-in security features and best practices</li>
        <li>Scalable infrastructure that grows with your needs</li>
      </ul>

      <h2>Why Choose Us?</h2>
      <p>
        We combine cutting-edge technology with practical solutions to help you build better
        applications. Our platform is built by developers, for developers, with a focus on
        productivity and maintainability.
      </p>
    </div>
  );
}
