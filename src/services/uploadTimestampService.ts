import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type UploadType = 'meterReadings' | 'csmBalance';

export const updateUploadTimestamp = async (type: UploadType): Promise<void> => {
    try {
        await setDoc(doc(db, 'uploadTimestamps', type), {
            lastUpload: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error updating ${type} timestamp:`, error);
        throw error;
    }
};

export const getLastUploadTimestamp = async (type: UploadType): Promise<string | null> => {
    try {
        const docRef = doc(db, 'uploadTimestamps', type);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data().lastUpload;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching ${type} timestamp:`, error);
        return null;
    }
};
