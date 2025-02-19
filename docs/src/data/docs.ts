export interface DocPage {
  id: string;
  title: string;
  content: string;
  url: string;
  lastUpdated: string;
}

export const docs: DocPage[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: `Welcome to the Zimako Consumer Portal documentation. This comprehensive guide will help you understand and utilize our consumer portal platform effectively.
    
    The Consumer Portal is a full-stack application built with React, TypeScript, and Firebase, designed to provide a seamless experience for both administrators and end-users.
    
    Key Features:
    - Admin Dashboard with real-time analytics
    - User Profile Management
    - Payment Processing and Reminders
    - Meter Reading Management
    - Query Management System
    - Real-time Notifications
    - Activity Tracking
    - Document Generation (PDF, QR Codes)
    - Machine Learning Integration`,
    url: '/docs/introduction',
    lastUpdated: '2025-02-17',
  },
  {
    id: 'installation',
    title: 'Installation & Setup',
    content: `Follow these steps to set up the Consumer Portal development environment:

    Prerequisites:
    - Node.js (Latest LTS version)
    - npm or yarn
    - Firebase account and project
    
    Installation Steps:
    1. Clone the repository
    2. Install dependencies:
       \`\`\`bash
       npm install
       \`\`\`
    3. Configure environment variables:
       - Create a .env file
       - Add Firebase configuration
       - Configure other service keys (Cloudinary, EmailJS, Twilio)
    
    4. Start the development servers:
       \`\`\`bash
       # Start both frontend and backend
       npm run dev
       
       # Or start them separately
       npm run start:frontend  # Runs on port 5173
       npm run start:server    # Runs on port 3000
       \`\`\``,
    url: '/docs/installation',
    lastUpdated: '2025-02-17',
  },
  {
    id: 'architecture',
    title: 'Architecture',
    content: `The Consumer Portal follows a modern, scalable architecture designed for performance and maintainability.

    Frontend Architecture:
    - React 18 with TypeScript
    - Vite for fast development and building
    - Component-based structure in src/components
    - State Management with React Query
    - UI Libraries: Chakra UI, Tailwind CSS, HeadlessUI
    
    Backend Architecture:
    - Node.js with Express
    - Firebase Services:
      - Firestore for document storage
      - Realtime Database for live updates
      - Firebase Auth for authentication
      - Firebase Storage for file storage
    - RESTful API endpoints
    - CORS security configuration
    
    Key Integration Points:
    - EmailJS for email communications
    - Twilio for SMS notifications
    - Cloudinary for image processing
    - TensorFlow.js for ML capabilities
    
    Security Features:
    - Firebase Authentication
    - Role-based access control
    - Protected API routes
    - Real-time user activity tracking`,
    url: '/docs/architecture',
    lastUpdated: '2025-02-17',
  },
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    content: `The Admin Dashboard is the central control panel for managing the Consumer Portal.

    Features:
    - Real-time analytics and metrics
    - User profile management
    - Payment tracking and reminders
    - Meter reading management
    - Query handling system
    - Activity monitoring
    - System notifications
    
    Components:
    - DashboardOverview: Main analytics view
    - AccountsView: User account management
    - AdminPaymentReminder: Payment system
    - AdminMeterReadings: Meter reading system
    - QueryManagement: Customer query handling
    - NotificationBell: Real-time alerts
    
    User Activity Tracking:
    - Online/Offline status
    - Last activity timestamp
    - Current view/section
    - Idle state detection`,
    url: '/docs/admin-dashboard',
    lastUpdated: '2025-02-17',
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    content: `Complete reference for the Consumer Portal's API endpoints.

    Authentication:
    - POST /api/auth/login
    - POST /api/auth/register
    - POST /api/auth/logout
    
    Admin Users:
    - GET /api/admin/users
    - POST /api/admin/users
    - PUT /api/admin/users/:id
    - DELETE /api/admin/users/:id
    
    Profiles:
    - GET /api/profiles
    - POST /api/profiles
    - PUT /api/profiles/:id
    
    Meter Readings:
    - GET /api/readings
    - POST /api/readings
    - PUT /api/readings/:id
    
    Queries:
    - GET /api/queries
    - POST /api/queries
    - PUT /api/queries/:id
    
    Machine Learning:
    - GET /api/model/structure
    - GET /api/model/weights`,
    url: '/docs/api-reference',
    lastUpdated: '2025-02-17',
  }
];
