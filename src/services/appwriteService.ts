import { Client, Storage, ID, Account, Permission, Role } from 'appwrite';
import { User } from 'firebase/auth';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('674aa23f0034bb3f895a');

const storage = new Storage(client);
const account = new Account(client);

const BUCKET_ID = '674aa330003d9231bf35';

// Initialize session with Firebase auth
const initializeSession = async (currentUser: User) => {
    try {
        // Get Firebase ID token
        const idToken = await currentUser.getIdToken();
        
        // Create JWT session
        const session = await account.createJWT();
        return session;
    } catch (error) {
        console.error('Error creating JWT session:', error);
        throw error;
    }
};

export const uploadMeterReadingImage = async (file: File, meterNumber: string, currentUser: User): Promise<string> => {
    if (!currentUser) {
        throw new Error('User must be logged in to upload meter readings');
    }

    try {
        // Ensure we have a valid session before uploading
        await initializeSession(currentUser);
        
        const fileId = ID.unique();
        const result = await storage.createFile(
            BUCKET_ID,
            fileId,
            file,
            [
                Permission.read(Role.any()),
                Permission.write(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]
        );

        return result.$id;
    } catch (error) {
        console.error('Error uploading image to Appwrite:', error);
        throw error;
    }
};

export const getMeterReadingImageUrl = (fileId: string): string => {
    try {
        const result = storage.getFileView(BUCKET_ID, fileId);
        return result.href;
    } catch (error) {
        console.error('Error getting image URL:', error);
        return '';
    }
};
