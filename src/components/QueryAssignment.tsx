import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  getDoc,
  query as firestoreQuery,
  where 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface QueryAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  query: {
    id: string;
    referenceId: string;
    description: string;
    status: string;
  } | null;
  onAssignmentComplete: () => void;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

const QueryAssignment: React.FC<QueryAssignmentProps> = ({
  isOpen,
  onClose,
  query,
  onAssignmentComplete
}) => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const adminsRef = collection(db, 'users');
        const adminsQuery = firestoreQuery(adminsRef, where('role', '==', 'admin'));
        const snapshot = await getDocs(adminsQuery);
        const adminUsersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<AdminUser, 'id'>
        }));
        console.log('Fetched admin users:', adminUsersData);
        setAdminUsers(adminUsersData);
      } catch (error) {
        console.error('Error fetching admin users:', error);
        toast.error('Failed to load admin users');
      }
    };

    if (isOpen) {
      fetchAdminUsers();
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!query || !selectedAdmin || !currentUser) {
      toast.error('Please select an admin to assign the query to');
      return;
    }

    setIsLoading(true);
    console.log('Starting query assignment process...');

    try {
      const adminUser = adminUsers.find(admin => admin.id === selectedAdmin);
      if (!adminUser) {
        throw new Error('Selected admin user not found');
      }

      // Update query assignment
      const queryRef = doc(db, 'queries', query.id);
      const updateData = {
        assignedTo: selectedAdmin,
        assignedToName: adminUser.name,
        status: 'Active',
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser.uid,
        assignedBy: currentUser.uid,
        assignedAt: new Date().toISOString()
      };

      console.log('Updating query with:', updateData);
      await updateDoc(queryRef, updateData);
      console.log('Query updated successfully');

      // Create notification
      const notificationData = {
        type: 'QUERY_ASSIGNMENT',
        recipientId: selectedAdmin,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        queryId: query.id,
        queryTitle: query.referenceId,
        queryDescription: query.description,
        read: false,
        createdAt: new Date().toISOString()
      };

      console.log('Creating notification:', notificationData);
      const notificationsRef = collection(db, 'notifications');
      const notificationDoc = await addDoc(notificationsRef, notificationData);
      console.log('Notification created with ID:', notificationDoc.id);

      // Verify notification creation
      const createdNotification = await getDoc(notificationDoc);
      if (!createdNotification.exists()) {
        throw new Error('Notification creation verification failed');
      }

      toast.success('Query assigned successfully');
      onAssignmentComplete();
      onClose();
    } catch (error) {
      console.error('Error assigning query:', error);
      toast.error('Failed to assign query');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Assign Query
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Reference ID: {query?.referenceId}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Description: {query?.description}
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="admin-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Select Admin User
          </label>
          <select
            id="admin-select"
            value={selectedAdmin}
            onChange={(e) => setSelectedAdmin(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          >
            <option value="">Select an admin</option>
            {adminUsers.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name} - {admin.department}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
              bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
              rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedAdmin || isLoading}
            className="px-4 py-2 text-sm font-medium text-white
              bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
              rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Assigning...' : 'Assign Query'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryAssignment;
