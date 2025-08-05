const express = require('express');
const router = express.Router();
const multer = require('multer');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Initialize Firebase Admin if not already initialized
let firebaseInitialized = false;
try {
  admin.app();
  firebaseInitialized = true;
} catch (error) {
  try {
    const serviceAccount = require('../serviceAccount.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'zimako-backend.appspot.com'
    });
    firebaseInitialized = true;
  } catch (initError) {
    console.error('Failed to initialize Firebase Admin:', initError);
  }
}

// Upload PDF file to Firebase Storage
router.post('/statement-distribution', upload.single('file'), async (req, res) => {
  try {
    if (!firebaseInitialized) {
      return res.status(500).json({ 
        success: false, 
        message: 'Firebase not initialized' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Extract metadata from request body
    const { month, year, distributedBy } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const originalName = req.file.originalname;
    const fileName = `statement_distribution_${year}_${month}_${timestamp}_${uniqueId}.pdf`;
    const filePath = `statement_distributions/${fileName}`;

    // Upload file to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileBuffer = req.file.buffer;

    // Create a file object in the bucket
    const file = bucket.file(filePath);

    // Upload the file with metadata
    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          month,
          year,
          uploadedBy: distributedBy || 'Unknown',
          originalName,
          timestamp: timestamp.toString()
        }
      }
    });

    // Get the public URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future expiration
    });

    // Create a document in Firestore
    const db = admin.firestore();
    const docId = `${year}_${month}`;
    
    const distributionData = {
      month,
      year,
      pdfUrl: url,
      storagePath: filePath,
      uploadedAt: admin.firestore.Timestamp.now(),
      uploadedBy: distributedBy || 'Unknown',
      originalFileName: originalName,
      hasPdf: true
    };

    // Store in the main collection
    await db.collection('statementDistributions').doc(docId).set(distributionData);

    // Also store in a separate collection for easier reference
    await db.collection('statementDistributionFiles').add({
      ...distributionData,
      id: docId
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileName,
        downloadUrl: url,
        metadata: {
          month,
          year,
          distributedBy,
          originalName
        }
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading file',
      error: error.toString()
    });
  }
});

module.exports = router;
