const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Resend
const resend = new Resend(process.env.VITE_RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email API server is running' });
});

// Send emails endpoint
app.post('/api/send-emails', async (req, res) => {
  try {
    const { recipients, subject, content, templateType } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipients array is required and must not be empty'
      });
    }

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Subject and content are required'
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    // Process emails in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          // Personalize content
          const personalizedContent = personalizeEmailContent(content, recipient.name, recipient.accountNumber);
          const personalizedSubject = personalizeEmailSubject(subject, recipient.name, recipient.accountNumber);
          
          // Convert to HTML
          const htmlContent = convertTextToHtml(personalizedContent);
          
          // Send email
          const response = await resend.emails.send({
            from: 'Zimako <onboarding@resend.dev>', // Using Resend's sandbox domain
            to: recipient.email,
            subject: personalizedSubject,
            html: htmlContent,
          });

          if (response.error) {
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

      // Add delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

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

// Helper functions
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

app.listen(port, () => {
  console.log(`Email API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
