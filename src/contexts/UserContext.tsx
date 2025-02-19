import React, { createContext, useContext, useState, useEffect } from 'react';
import { addUser, fetchUsers } from '../firebaseServices';

interface User {
  id: string;
  fullName: string;
  surname: string;
  idNumber: string;
  customerNumber: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

interface UserContextType {
  users: User[];
  addNewUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  fetchAllUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);

  // Fetch all users from Firestore
  const fetchAllUsers = async () => {
    try {
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Error fetching users: ', err);
    }
  };

  // Add a new user to Firestore and refresh the list
  const addNewUser = async (user: Omit<User, 'id' | 'createdAt'>) => {
    try {
      await addUser(user);
      await fetchAllUsers(); // Refresh user list
    } catch (err) {
      console.error('Error adding user: ', err);
    }
  };

  // Fetch users when the provider mounts
  useEffect(() => {
    fetchAllUsers();
  }, []);

  return (
    <UserContext.Provider value={{ users, addNewUser, fetchAllUsers }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use UserContext
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
