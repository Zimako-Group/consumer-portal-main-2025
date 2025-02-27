require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'zimako-backend.firebasestorage.app'
});

const bucket = admin.storage().bucket();

// Import routes
const adminUsersRouter = require('./routes/adminUsers');
const communicationsRouter = require('./routes/communications');
const whatsappRouter = require('./routes/whatsapp');
const whatsappMessagesRouter = require('./routes/whatsappMessages');
const adminRouter = require('./routes/admin');

// Use routes
app.use('/api', adminUsersRouter);
app.use('/api', communicationsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/whatsapp', whatsappMessagesRouter);
app.use('/api/admin', adminRouter);

// WhatsApp routes
app.use('/api/whatsapp', require('./routes/whatsapp'));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Model structure endpoint
app.get('/api/model/structure', async (req, res) => {
  try {
    console.log('Fetching model structure...');
    const modelRef = bucket.file('chatbot/model.json');
    const [exists] = await modelRef.exists();

    if (!exists) {
      console.error('Model file not found');
      return res.status(404).json({ error: 'Model file not found' });
    }

    const [modelContent] = await modelRef.download();
    const modelJSON = JSON.parse(modelContent.toString('utf-8'));

    console.log('Model structure fetched successfully');
    res.json({
      modelTopology: modelJSON.modelTopology,
      weightsManifest: [{
        weights: modelJSON.weightsManifest[0].weights
      }]
    });
  } catch (error) {
    console.error('Error fetching model structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// Model weights endpoint
app.get('/api/model/weights', async (req, res) => {
  try {
    console.log('Fetching model weights...');
    
    // Calculate expected file size
    const weightsMetadataRef = bucket.file('chatbot/model/model.json');
    const [metadataExists] = await weightsMetadataRef.exists();
    
    if (!metadataExists) {
      console.error('Model metadata file not found');
      return res.status(404).json({ error: 'Model metadata file not found' });
    }

    // Read model metadata to get expected weights size
    const [metadataContent] = await weightsMetadataRef.download();
    const metadata = JSON.parse(metadataContent.toString());
    
    const expectedWeights = metadata.weightsManifest[0].weights.reduce((sum, spec) => {
      return sum + spec.shape.reduce((a, b) => a * b, 1);
    }, 0);

    console.log('Expected weights:', {
      totalWeights: expectedWeights,
      expectedBytes: expectedWeights * 4,
      shapes: metadata.weightsManifest[0].weights.map(w => w.shape)
    });

    // Try different possible weight file locations
    const possiblePaths = [
      'chatbot/model/weights.bin',
      'chatbot/model/group1-shard1of1.bin',
      'chatbot/weights.bin'
    ];

    let weightsRef;
    let exists = false;

    for (const path of possiblePaths) {
      weightsRef = bucket.file(path);
      [exists] = await weightsRef.exists();
      if (exists) {
        console.log(`Found weights file at: ${path}`);
        break;
      }
    }

    if (!exists) {
      console.error('Weights file not found in any location');
      return res.status(404).json({ error: 'Weights file not found' });
    }

    // Get file metadata
    const [fileMetadata] = await weightsRef.getMetadata();
    const fileSize = fileMetadata.size;
    
    console.log('Weights file metadata:', {
      path: weightsRef.name,
      size: fileSize,
      sizeInMB: (fileSize / (1024 * 1024)).toFixed(2) + ' MB',
      contentType: fileMetadata.contentType,
      updated: fileMetadata.updated,
      expectedSize: expectedWeights * 4,
      matches: fileSize === expectedWeights * 4
    });

    if (fileSize !== expectedWeights * 4) {
      console.error('Weight file size mismatch:', {
        actual: fileSize,
        expected: expectedWeights * 4,
        difference: expectedWeights * 4 - fileSize
      });
      return res.status(500).json({ 
        error: 'Weight file size mismatch',
        details: {
          actual: fileSize,
          expected: expectedWeights * 4
        }
      });
    }

    // Create read stream with raw buffer
    const readStream = weightsRef.createReadStream({
      validation: false,
      decompress: false
    });

    // Set headers for binary response
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize,
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked'
    });

    // Pipe the file directly to response
    readStream.pipe(res);

    readStream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming weights file' });
      }
    });

    readStream.on('end', () => {
      console.log('Successfully streamed weights file');
    });

  } catch (error) {
    console.error('Error in weights endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Metadata endpoint
app.get('/api/model/metadata', async (req, res) => {
  try {
    console.log('Fetching metadata...');
    const metadataRef = bucket.file('chatbot/metadata.json');
    const [exists] = await metadataRef.exists();

    if (!exists) {
      console.error('Metadata file not found');
      return res.status(404).json({ error: 'Metadata file not found' });
    }

    const [metadataContent] = await metadataRef.download();
    const metadata = JSON.parse(metadataContent.toString('utf-8'));
    console.log('Metadata fetched successfully');
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /api/test');
  console.log('- GET /api/model/structure');
  console.log('- GET /api/model/weights');
  console.log('- GET /api/model/metadata');
});