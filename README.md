# Mohokare Consumer Portal

A modern, feature-rich consumer portal built with React, TypeScript, and Vite for Mohokare Local Municipality. This portal enables customers to manage their accounts, view statements, make payments, and interact with municipal services.

## Features

- **Customer Dashboard**: View account details, balances, and transaction history
- **Statement Generation**: Generate and download PDF statements with integrated bank payment links
- **Payment Management**: Make payments and set up payment arrangements
- **Query Management**: Submit and track customer queries
- **Meter Reading Management**: Upload and manage meter readings
- **AI Chatbot Integration**: Get instant assistance with ZimakoAI Chatbot
- **Dark/Light Theme**: Customizable user interface theme
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS, Headless UI
- **PDF Generation**: jsPDF with autotable
- **Database**: Firebase/Firestore
- **Authentication**: Firebase Auth
- **Charts**: ApexCharts, Chart.js
- **Date Handling**: date-fns
- **File Processing**: PapaParse
- **Animation**: Framer Motion
- **Table Management**: TanStack Table
- **API Integration**: React Query

## Getting Started

### Prerequisites

- Node.js (Latest LTS version)
- npm or yarn package manager
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Zimako-Dev/consumer-portal.git
cd consumer-portal
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm run dev
```

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint for code quality

## Project Structure

```
consumer-portal/
├── src/
│   ├── assets/          # Static assets (images, logos)
│   ├── components/      # React components
│   ├── contexts/        # React context providers
│   ├── services/        # API and service integrations
│   ├── utils/          # Utility functions
│   └── main.tsx        # Application entry point
├── public/             # Public assets
└── package.json        # Project dependencies and scripts
```

## Features in Detail

### Creating Super Admin Users

Super Admin users have the highest level of access in the system and can manage all aspects of the portal. Follow these steps to create a Super Admin user:

1. **Prerequisites**:
   - You must have Firebase Admin SDK access
   - You must have access to the Firebase Console
   - The application must be properly configured with Firebase

2. **Using the Admin Dashboard**:
   - Log in to the portal with an existing Super Admin account
   - Navigate to "Users" → "Add Users" in the navigation menu
   - Fill in the following details:
     - Email Address
     - Password (must meet security requirements)
     - Full Name
   - Select "Super Admin" as the role
   - Click "Create User"

3. **Security Requirements**:
   - Password must be at least 8 characters long
   - Must contain at least one uppercase letter
   - Must contain at least one number
   - Must contain at least one special character
   - Example format: `Password123@`

4. **First-time Login**:
   - The new Super Admin should log in using the provided credentials
   - They will be prompted to change their password on first login
   - After password change, they will have full access to all Super Admin features

5. **Super Admin Capabilities**:
   - Create and manage other admin users
   - Access all customer accounts
   - Generate and view all reports
   - Manage system configurations
   - Handle customer queries
   - View and manage meter readings
   - Access payment reminders and statements

6. **Best Practices**:
   - Create Super Admin accounts only for authorized personnel
   - Regularly audit Super Admin account access
   - Enforce strong password policies
   - Monitor Super Admin activities through system logs
   - Remove access immediately when no longer needed

   ## Creating Super Admin
   - Navigate to 'Scripts', 'createNewSuperAdmin.js', add admin details and run 'node scripts/createNewSuperAdmin.js' in the terminal

### Statement Generation
- Generate professional PDF statements
- Integrated bank payment links
- QR code integration
- Automatic calculations
- Detailed transaction history

### Customer Management
- Account information management
- Balance tracking
- Transaction history
- Payment arrangements
- Query submission and tracking

### Administrative Features
- User management
- Report generation
- Data upload capabilities
- System settings management
- Activity monitoring

## Code Analysis

### Counting Lines of Code
To get a detailed breakdown of the codebase size and language distribution, you can use the `cloc` (Count Lines of Code) tool. This will exclude common directories that shouldn't be counted like node_modules, git files, and build outputs.

1. **Install cloc** (if not already installed):
```bash
npm install -g cloc
```

2. **Run the count command**:
```bash
cloc . --exclude-dir=node_modules,.git,dist,build
```

This will generate a report showing:
- Total number of files by language
- Blank lines
- Comment lines
- Lines of actual code
- A summary of the project size

The command excludes:
- `node_modules/`: Third-party dependencies
- `.git/`: Version control files
- `dist/`: Production build files
- `build/`: Compilation output

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software owned by Zimako Group.

## Support

For support, please contact the development team or raise an issue in the repository.


## Model Training (Dev)

http://localhost:5173/train-model

## Model Chat (Dev)
http://localhost:5173/model-chat