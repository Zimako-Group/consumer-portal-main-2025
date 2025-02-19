import { Profile } from '../types/profile';

// Sample profiles for testing - in production, this would come from your backend
const SAMPLE_PROFILES: Profile[] = [
  {
    id: '1',
    fullName: 'John Doe',
    surname: 'Doe',
    idNumber: '8501015026082',
    customerNumber: '1001',
    email: 'john@example.com',
    phone: '0123456789',
    address: '123 Main St',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    fullName: 'Jane Smith',
    surname: 'Smith',
    idNumber: '9001015026083',
    customerNumber: '1002',
    email: 'jane@example.com',
    phone: '0123456790',
    address: '456 Oak St',
    createdAt: new Date().toISOString()
  }
];

export const validateAccountNumber = (accountNumber: string, profiles: Profile[] = []): boolean => {
  if (!accountNumber) return false;
  
  // First check localStorage
  const savedProfiles = getStoredProfiles();
  const allProfiles = [...savedProfiles, ...SAMPLE_PROFILES];
  
  return allProfiles.some(profile => profile.customerNumber === accountNumber);
};

export const getStoredProfiles = (): Profile[] => {
  try {
    const savedProfiles = localStorage.getItem('clientProfiles');
    return savedProfiles ? JSON.parse(savedProfiles) : [];
  } catch (error) {
    console.error('Error reading profiles from localStorage:', error);
    return [];
  }
};