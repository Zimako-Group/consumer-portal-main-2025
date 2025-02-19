import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Activity, ActivityType } from '../types/activity';

export function useActivities(userId: string, role: string, department?: string) {
  const queryClient = useQueryClient();

  const fetchActivities = async (pageSize = 10, activityType?: ActivityType) => {
    let q = collection(db, 'activities');
    
    if (role === 'user') {
      q = query(q, where('userId', '==', userId));
    } else if (role === 'admin' && department) {
      q = query(q, where('department', '==', department));
    }
    
    if (activityType) {
      q = query(q, where('type', '==', activityType));
    }
    
    q = query(q, orderBy('timestamp', 'desc'), limit(pageSize));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
  };

  const addActivity = async (activity: Omit<Activity, 'id'>) => {
    const docRef = await addDoc(collection(db, 'activities'), activity);
    return { id: docRef.id, ...activity };
  };

  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['activities', userId, role, department],
    queryFn: () => fetchActivities()
  });

  const mutation = useMutation({
    mutationFn: addActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  return {
    activities,
    isLoading,
    error,
    addActivity: mutation.mutate
  };
}