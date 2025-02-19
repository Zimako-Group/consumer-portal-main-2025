import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { AnimatePresence } from 'framer-motion';

import React, { useState } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';

import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { PageTransition } from './components/PageTransition';
import { TableOfContents } from './components/TableOfContents';
import { SearchProvider } from './hooks/useSearch';
import { Architecture } from './pages/Architecture';
import { Configuration } from './pages/Configuration';
import { Installation } from './pages/Installation';
import { Introduction } from './pages/Introduction';
import { QuickStart } from './pages/QuickStart';
import './styles/prism-custom.css';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/docs/introduction"
          element={
            <PageTransition>
              <Introduction />
            </PageTransition>
          }
        />
        <Route
          path="/docs/installation"
          element={
            <PageTransition>
              <Installation />
            </PageTransition>
          }
        />
        <Route
          path="/docs/quickstart"
          element={
            <PageTransition>
              <QuickStart />
            </PageTransition>
          }
        />
        <Route
          path="/docs/architecture"
          element={
            <PageTransition>
              <Architecture />
            </PageTransition>
          }
        />
        <Route
          path="/docs/configuration"
          element={
            <PageTransition>
              <Configuration />
            </PageTransition>
          }
        />
        <Route
          path="/"
          element={
            <PageTransition>
              <Introduction />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <SearchProvider>
        <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80"
          />

          {/* Mobile sidebar */}
          <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Navigation</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <Navigation mobile onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-col lg:flex-row lg:space-x-8 py-8">
                {/* Desktop sidebar */}
                <div className="hidden lg:block lg:w-64 shrink-0">
                  <div className="sticky top-20">
                    <Navigation />
                  </div>
                </div>

                {/* Main content */}
                <main className="flex-1" role="main">
                  <div className="px-1 sm:px-4">
                    <AnimatedRoutes />
                  </div>
                </main>

                {/* Table of Contents - Desktop */}
                <div className="hidden xl:block xl:w-64 shrink-0">
                  <div className="sticky top-20">
                    <TableOfContents />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SearchProvider>
    </Router>
  );
}

export default App;
