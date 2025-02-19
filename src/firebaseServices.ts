import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const USERS_COLLECTION = "users";
const ACTIVITIES_COLLECTION = "activities";

// Add a new user to Firestore
export const addUser = async (user: Omit<any, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...user,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Error adding user: ", err);
    throw err;
  }
};

// Fetch all users from Firestore
export const fetchUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: any[] = [];
    snapshot.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));
    return users;
  } catch (err) {
    console.error("Error fetching users: ", err);
    throw err;
  }
};

// Log an activity to Firestore
export const logActivity = async (
  userId: string,
  userType: "endUser" | "admin" | "superAdmin",
  activityType: string,
  details: Record<string, any>,
  targetAccountId?: string
) => {
  try {
    const docRef = await addDoc(collection(db, ACTIVITIES_COLLECTION), {
      userId,
      userType,
      activityType,
      details,
      targetAccountId: targetAccountId || null,
      timestamp: Timestamp.now(), // Firestore timestamp
    });
    console.log("Activity logged with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding activity: ", error);
    throw error;
  }
};

// Listen to activities in real time
export const listenToActivities = (
  callback: (activities: Array<any>) => void
) => {
  const q = query(collection(db, ACTIVITIES_COLLECTION), orderBy("timestamp", "desc"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const activities: Array<any> = [];
    querySnapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() });
    });
    callback(activities);
  });

  return unsubscribe; // Return the unsubscribe function to stop listening
};