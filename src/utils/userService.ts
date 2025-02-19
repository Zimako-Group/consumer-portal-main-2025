import { collection, addDoc, getDocs, Timestamp, DocumentData, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface UserData {
  name: string;
  email: string;
  role: string;
  createdAt?: Date;
  active?: boolean;
}

export interface UserRecord extends UserData {
  id: string;
}

export const createUser = async (userData: UserData): Promise<string> => {
  try {
    const userWithTimestamp = {
      ...userData,
      createdAt: Timestamp.now(),
      active: true,
    };

    const docRef = await addDoc(collection(db, 'users'), userWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
};

export const fetchUsers = async (): Promise<UserRecord[]> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('active', '==', true)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as UserData),
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};