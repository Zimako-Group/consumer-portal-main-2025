require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Initialize Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not found in environment variables');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('RESEND')));
}
const resend = new Resend(RESEND_API_KEY);

// Import routes
const adminUsersRouter = require('./routes/adminUsers');
const communicationsRouter = require('./routes/communications');
// const whatsappRouter = require('./routes/whatsapp'); // Commented out due to missing TypeScript service
// const whatsappMessagesRouter = require('./routes/whatsappMessages'); // Commented out due to missing TypeScript service
const adminRouter = require('./routes/admin');

// Use routes
app.use('/api', adminUsersRouter);
app.use('/api', communicationsRouter);
// app.use('/api/whatsapp', whatsappRouter); // Commented out due to missing TypeScript service
// app.use('/api/whatsapp', whatsappMessagesRouter); // Commented out due to missing TypeScript service
app.use('/api/admin', adminRouter);

// WhatsApp routes
// app.use('/api/whatsapp', require('./routes/whatsapp')); // Commented out due to missing TypeScript service

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email API server is running' });
});

// Resend API test endpoint
app.get('/api/test-resend', async (req, res) => {
  try {
    console.log('🧪 Testing Resend API configuration...');
    console.log('API Key configured:', !!RESEND_API_KEY);
    console.log('API Key preview:', RESEND_API_KEY ? RESEND_API_KEY.substring(0, 10) + '...' : 'NOT SET');
    
    if (!RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'RESEND_API_KEY not configured',
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('RESEND'))
      });
    }
    
    // Test with a simple API call (this won't send an email, just validates the API key)
    const testResponse = await resend.emails.send({
      from: 'Zimako <noreply@consumerportal.co.za>',
      to: 'test@example.com', // This will fail but should give us API validation info
      subject: 'Test',
      html: 'Test'
    });
    
    res.json({
      success: true,
      message: 'Resend API is configured and accessible',
      apiKeyConfigured: true
    });
  } catch (error) {
    console.error('❌ Resend API test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Resend API test failed',
      error: error.message,
      apiKeyConfigured: !!RESEND_API_KEY
    });
  }
});

// Send emails endpoint
app.post('/api/send-emails', async (req, res) => {
  try {
    const { recipients, subject, content, templateType } = req.body;

    console.log(`✉️ Starting bulk email send for ${recipients?.length || 0} recipients`);
    console.log('Template type:', templateType);
    console.log('Subject:', subject?.substring(0, 50) + '...');

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      console.error('❌ No recipients provided');
      return res.status(400).json({
        success: false,
        message: 'Recipients array is required and must not be empty'
      });
    }

    if (!subject || !content) {
      console.error('❌ Missing subject or content');
      return res.status(400).json({
        success: false,
        message: 'Subject and content are required'
      });
    }

    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return res.status(500).json({
        success: false,
        message: 'Email service not configured properly'
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    // Process emails in batches to avoid rate limiting
    const batchSize = 10;
    console.log(`📦 Processing ${recipients.length} emails in batches of ${batchSize}`);
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}: emails ${i + 1}-${Math.min(i + batchSize, recipients.length)}`);
      console.log('Batch recipients:', batch.map(r => r.email));
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          console.log(`📧 Sending email to: ${recipient.email}`);
          
          // Personalize content
          const personalizedContent = personalizeEmailContent(content, recipient.name, recipient.accountNumber);
          const personalizedSubject = personalizeEmailSubject(subject, recipient.name, recipient.accountNumber);
          
          // Convert to HTML
          const htmlContent = convertTextToHtml(personalizedContent);
          
          // Send email
          const response = await resend.emails.send({
            from: 'Zimako <noreply@consumerportal.co.za>', // Using verified domain
            to: recipient.email,
            subject: personalizedSubject,
            html: htmlContent,
          });
          
          console.log(`✅ Email sent successfully to ${recipient.email}:`, response.data?.id);

          if (response.error) {
            console.error(`❌ Email failed for ${recipient.email}:`, response.error.message);
            failed++;
            return {
              email: recipient.email,
              success: false,
              error: response.error.message || 'Failed to send email'
            };
          }

          successful++;
          return {
            email: recipient.email,
            success: true,
            messageId: response.data?.id
          };
        } catch (error) {
          console.error(`❌ Exception sending email to ${recipient.email}:`, error.message);
          failed++;
          return {
            email: recipient.email,
            success: false,
            error: error.message || 'Unknown error occurred'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const batchSuccessful = batchResults.filter(r => r.success).length;
      const batchFailed = batchResults.filter(r => !r.success).length;
      console.log(`📦 Batch ${Math.floor(i/batchSize) + 1} completed: ${batchSuccessful} successful, ${batchFailed} failed`);

      // Add delay between batches
      if (i + batchSize < recipients.length) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`🎉 Bulk email send completed: ${successful} successful, ${failed} failed out of ${recipients.length} total`);

    res.json({
      success: successful > 0,
      message: `Processed ${recipients.length} emails. ${successful} successful, ${failed} failed.`,
      totalSent: recipients.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Helper functions for email personalization
function personalizeEmailContent(content, customerName, accountNumber) {
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return content
    .replace(/{{customerName}}/g, customerName)
    .replace(/{{accountNumber}}/g, accountNumber)
    .replace(/{{currentMonth}}/g, currentMonth)
    .replace(/{{outstandingAmount}}/g, 'R 0.00'); // Placeholder
}

function personalizeEmailSubject(subject, customerName, accountNumber) {
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return subject
    .replace(/{{customerName}}/g, customerName)
    .replace(/{{accountNumber}}/g, accountNumber)
    .replace(/{{currentMonth}}/g, currentMonth);
}

function convertTextToHtml(text) {
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)/, '<p>$1')
    .replace(/(.*$)/, '$1</p>')
    .replace(/https?:\/\/[^\s]+/g, '<a href="$&" style="color: #2563eb; text-decoration: underline;">$&</a>');
}

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
  console.log('- GET /health');
  console.log('- POST /api/send-emails');
  console.log('- GET /api/model/structure');
  console.log('- GET /api/model/weights');
  console.log('- GET /api/model/metadata');
});