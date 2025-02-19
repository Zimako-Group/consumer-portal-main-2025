import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ActivityType, UserActivity } from '../types/activity';

export const logUserActivity = async (
  userId: string,
  type: ActivityType,
  description: string,
  metadata?: UserActivity['metadata']
) => {
  try {
    const activityData: Omit<UserActivity, 'id'> = {
      userId,
      type,
      description,
      timestamp: new Date(),
      metadata,
    };

    const docRef = await addDoc(collection(db, 'userActivities'), activityData);
    return docRef.id;
  } catch (error) {
    console.error('Error logging user activity:', error);
    throw error;
  }
};
