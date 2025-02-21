import { lazy } from 'react';

// Lazy load components
export const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
export const AdminReports = lazy(() => import('./components/AdminReports'));
export const AdminAccounts = lazy(() => import('./components/AdminAccounts'));
export const AdminPaymentReminders = lazy(() => import('./components/AdminPaymentReminders'));
export const AdminQueries = lazy(() => import('./components/AdminQueries'));
export const AdminMeterReadings = lazy(() => import('./components/AdminMeterReadings'));
export const AdminHelp = lazy(() => import('./components/AdminHelp'));
export const AdminSettings = lazy(() => import('./components/AdminSettings'));
