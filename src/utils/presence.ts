import { ref, set, onDisconnect, onValue, serverTimestamp, DatabaseReference } from 'firebase/database';
import { auth, realtimeDb } from '../firebaseConfig';

export const initializePresence = (userId: string) => {
  if (!userId) return () => {};

  // Create a reference to this user's presence node
  const presenceRef = ref(realtimeDb, `status/${userId}`);
  
  // Create a reference to the .info/connected path
  const connectedRef = ref(realtimeDb, '.info/connected');

  // When the client's connection state changes...
  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // Client is connected
      const presence = {
        state: 'online',
        lastChanged: serverTimestamp(),
      };

      // Set the presence data
      set(presenceRef, presence);

      // When the client disconnects, update the presence data
      onDisconnect(presenceRef).set({
        state: 'offline',
        lastChanged: serverTimestamp(),
      });
    }
  });

  // Set initial presence
  set(presenceRef, {
    state: 'online',
    lastChanged: serverTimestamp(),
  });

  // Return cleanup function
  return async () => {
    unsubscribe();
    // Explicitly set status to offline
    await set(presenceRef, {
      state: 'offline',
      lastChanged: serverTimestamp(),
    });
  };
};

// Add a new function to explicitly set offline status
export const setUserOffline = async (userId: string) => {
  if (!userId) return;
  
  const presenceRef = ref(realtimeDb, `status/${userId}`);
  await set(presenceRef, {
    state: 'offline',
    lastChanged: serverTimestamp(),
  });
};
