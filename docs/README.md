# 📚 Zimako Documentation Template

A modern, feature-rich documentation template built with React, TypeScript, and Tailwind CSS. Create beautiful, interactive documentation with ease.

![Documentation Template](https://via.placeholder.com/1200x600/1a1b26/ffffff?text=Zimako+Documentation+Template)

## ✨ Features

- 🎨 **Beautiful Design**
  - Modern, clean interface
  - Dark/Light mode support
  - Responsive layout
  - Custom code syntax highlighting

- 📱 **Interactive Components**
  - Collapsible sections
  - Copy-to-clipboard code blocks
  - Interactive diagrams with Mermaid.js
  - Smooth page transitions

- 🔍 **Search Functionality**
  - Full-text search
  - Real-time results
  - Keyboard navigation

- 📊 **Diagram Support**
  - Flow charts
  - Sequence diagrams
  - Class diagrams
  - State diagrams

- 🛠️ **Developer Experience**
  - TypeScript support
  - Hot module replacement
  - Prettier code formatting
  - ESLint integration

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/your-username/zimako-documentation-template.git
cd zimako-documentation-template
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

Visit \`http://localhost:5173\` to see your documentation site.

## 📦 Dependencies

### Core Dependencies
\`\`\`json
{
  "@headlessui/react": "^1.7.17",      // UI components
  "@heroicons/react": "^2.0.18",       // Icons
  "framer-motion": "^10.16.4",         // Animations
  "mermaid": "^10.6.1",               // Diagrams
  "prismjs": "^1.29.0",               // Syntax highlighting
  "react": "^18.2.0",                 // UI framework
  "react-dom": "^18.2.0",             // React DOM
  "react-router-dom": "^6.18.0"       // Routing
}
\`\`\`

### Development Dependencies
\`\`\`json
{
  "@types/react": "^18.2.15",         // React types
  "@types/react-dom": "^18.2.7",      // React DOM types
  "@typescript-eslint/parser": "^6.0.0", // TypeScript parser
  "@vitejs/plugin-react": "^4.0.3",   // Vite React plugin
  "autoprefixer": "^10.4.16",         // CSS processing
  "eslint": "^8.45.0",               // Linting
  "postcss": "^8.4.31",              // CSS processing
  "prettier": "^3.0.3",              // Code formatting
  "tailwindcss": "^3.3.5",           // CSS framework
  "typescript": "^5.0.2",            // TypeScript
  "vite": "^4.4.5"                   // Build tool
}
\`\`\`

## 🎨 Customization

### Themes

The template comes with built-in light and dark themes. You can customize colors in \`tailwind.config.js\`:

\`\`\`javascript
theme: {
  extend: {
    colors: {
      primary: {...},
      secondary: {...}
    }
  }
}
\`\`\`

### Components

All components are modular and can be customized:

- \`CodeBlock\`: Syntax highlighted code blocks
- \`Collapsible\`: Expandable content sections
- \`MermaidDiagram\`: Interactive diagrams
- \`Navigation\`: Site navigation
- \`SearchBar\`: Full-text search
- \`TableOfContents\`: Auto-generated TOC

## 📝 Documentation Structure

\`\`\`
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── pages/              # Documentation pages
├── styles/             # Global styles and themes
└── types/              # TypeScript definitions
\`\`\`

## 🔧 Available Scripts

- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm run preview\`: Preview production build
- \`npm run lint\`: Run ESLint
- \`npm run format\`: Format code with Prettier
- \`npm run format:check\`: Check code formatting

## 🌟 Features in Detail

### Code Blocks
- Syntax highlighting with PrismJS
- Copy-to-clipboard functionality
- Line numbers
- Language-specific highlighting

### Diagrams
- Flow charts
- Sequence diagrams
- Class diagrams
- State diagrams
- Dark mode support

### Search
- Real-time search results
- Keyboard navigation
- Search highlighting
- Search suggestions

### Navigation
- Responsive sidebar
- Collapsible sections
- Active page highlighting
- Smooth transitions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: \`git checkout -b feature/amazing-feature\`
3. Commit your changes: \`git commit -m 'Add amazing feature'\`
4. Push to the branch: \`git push origin feature/amazing-feature\`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com)
- [Headless UI](https://headlessui.dev)
- [Hero Icons](https://heroicons.com)
- [Mermaid.js](https://mermaid-js.github.io)
- [PrismJS](https://prismjs.com)

---

Made with ❤️ by Zimako Development Team
