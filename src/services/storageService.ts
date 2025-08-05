import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Uploads a PDF file to Firebase Storage and updates the corresponding Firestore record
 * @param file PDF file to upload
 * @param month Month of the statement distribution (01-12)
 * @param year Year of the statement distribution (e.g., 2024)
 * @param distributedBy Name of the user who uploaded the file
 * @returns Promise with the download URL of the uploaded file
 */
// Define a type for the progress callback
type ProgressCallback = (progress: number) => void;

// Server API URL
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api/uploads/statement-distribution'
  : 'http://localhost:3001/api/uploads/statement-distribution';

export const uploadStatementDistributionPDF = async (
  file: File,
  month: string,
  year: string,
  distributedBy: string,
  progressCallback?: ProgressCallback
): Promise<string> => {
  try {
    if (!db) {
      console.error('Firestore database not initialized');
      throw new Error('Database not initialized');
    }

    console.log('Uploading file with metadata:', {
      contentType: 'application/pdf',
      customMetadata: { month, year, uploadedBy: distributedBy, originalName: file.name }
    });

    // Create FormData object for the file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', month);
    formData.append('year', year);
    formData.append('distributedBy', distributedBy);

    // Track upload progress using XMLHttpRequest
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && progressCallback) {
          const progress = (event.loaded / event.total) * 100;
          console.log('Upload progress:', progress);
          progressCallback(progress);
        }
      });
      
      // Handle completion
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Upload completed successfully:', response);
            
            if (response.success && response.data && response.data.downloadUrl) {
              resolve(response.data.downloadUrl);
            } else {
              reject(new Error('Invalid server response'));
            }
          } catch (error) {
            console.error('Error parsing server response:', error);
            reject(error);
          }
        } else {
          console.error('Server error:', xhr.status, xhr.statusText);
          reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
        }
      };
      
      // Handle errors
      xhr.onerror = function() {
        console.error('Request failed');
        reject(new Error('Network error during upload'));
      };
      
      // Open and send the request
      xhr.open('POST', API_URL, true);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Error in uploadStatementDistributionPDF:', error);
    throw error;
  }
};

/**
 * Updates the statement distribution record with actual counts
 * @param id Document ID of the statement distribution record
 * @param totalStatements Total number of statements distributed
 * @param successCount Number of successfully distributed statements
 * @param failureCount Number of failed statement distributions
 */
export const updateStatementDistributionCounts = async (
  id: string,
  totalStatements: number,
  successCount: number,
  failureCount: number
): Promise<void> => {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }

    await updateDoc(doc(db, 'statementDistributions', id), {
      totalStatements,
      successCount,
      failureCount
    });
  } catch (error) {
    console.error('Error updating statement distribution counts:', error);
    throw error;
  }
};
