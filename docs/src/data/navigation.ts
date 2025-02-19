import { DocSection } from '../types/docs';

export const navigation: DocSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        title: 'Introduction',
        href: '/docs/introduction',
        description: 'Overview of the Consumer Portal and its features.',
      },
      {
        title: 'Installation & Setup',
        href: '/docs/installation',
        description: 'Complete guide to installing and configuring the Consumer Portal.',
      },
    ],
  },
  {
    title: 'Architecture & Design',
    items: [
      {
        title: 'Architecture',
        href: '/docs/architecture',
        description: 'Detailed overview of frontend and backend architecture.',
      },
      {
        title: 'Admin Dashboard',
        href: '/docs/admin-dashboard',
        description: 'Understanding the admin dashboard and its components.',
      },
    ],
  },
  {
    title: 'API Documentation',
    items: [
      {
        title: 'API Reference',
        href: '/docs/api-reference',
        description: 'Complete API documentation for backend services.',
      },
    ],
  },
  {
    title: 'Features',
    items: [
      {
        title: 'User Management',
        href: '/docs/user-management',
        description: 'Managing user profiles and permissions.',
      },
      {
        title: 'Payment System',
        href: '/docs/payment-system',
        description: 'Payment processing and reminder system.',
      },
      {
        title: 'Meter Readings',
        href: '/docs/meter-readings',
        description: 'Managing and tracking meter readings.',
      },
      {
        title: 'Query Management',
        href: '/docs/query-management',
        description: 'Customer query handling system.',
      },
    ],
  },
  {
    title: 'Integrations',
    items: [
      {
        title: 'Email & SMS',
        href: '/docs/communications',
        description: 'EmailJS and Twilio integration for notifications.',
      },
      {
        title: 'File Storage',
        href: '/docs/file-storage',
        description: 'Firebase Storage and Cloudinary integration.',
      },
      {
        title: 'Machine Learning',
        href: '/docs/machine-learning',
        description: 'TensorFlow.js integration and model management.',
      },
    ],
  },
];
