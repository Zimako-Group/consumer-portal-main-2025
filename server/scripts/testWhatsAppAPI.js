require('dotenv').config();
const fetch = require('node-fetch');
const readline = require('readline');

/**
 * This script provides a comprehensive test suite for the WhatsApp Business API
 * It allows testing various API endpoints and features
 */

// Configuration from environment variables
const apiUrl = process.env.WHATSAPP_API_URL;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Display menu
function displayMenu() {
  console.log('\n=== WhatsApp API Test Suite ===');
  console.log('1. Get Business Profile');
  console.log('2. Update Business Profile');
  console.log('3. Send Text Message');
  console.log('4. Send Template Message');
  console.log('5. Send Image Message');
  console.log('6. Send Document Message');
  console.log('7. Get Message Templates');
  console.log('8. Check Webhook Status');
  console.log('9. Get Phone Numbers');
  console.log('0. Exit');
  console.log('===============================');
  
  rl.question('Select an option: ', (answer) => {
    switch(answer) {
      case '1':
        getBusinessProfile();
        break;
      case '2':
        updateBusinessProfile();
        break;
      case '3':
        sendTextMessage();
        break;
      case '4':
        sendTemplateMessage();
        break;
      case '5':
        sendImageMessage();
        break;
      case '6':
        sendDocumentMessage();
        break;
      case '7':
        getMessageTemplates();
        break;
      case '8':
        checkWebhookStatus();
        break;
      case '9':
        getPhoneNumbers();
        break;
      case '0':
        console.log('Exiting...');
        rl.close();
        break;
      default:
        console.log('Invalid option. Please try again.');
        displayMenu();
    }
  });
}

// 1. Get Business Profile
async function getBusinessProfile() {
  try {
    console.log('\nGetting business profile...');
    
    const url = `${apiUrl}/${phoneNumberId}/whatsapp_business_profile`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Successfully retrieved business profile!');
    } else {
      console.log('\n❌ Failed to retrieve business profile!');
      console.log('Error:', data.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error getting business profile:', error);
  }
  
  rl.question('\nPress Enter to continue...', () => {
    displayMenu();
  });
}

// 2. Update Business Profile
async function updateBusinessProfile() {
  try {
    console.log('\nUpdating business profile...');
    
    rl.question('Enter business description: ', async (description) => {
      const url = `${apiUrl}/${phoneNumberId}/whatsapp_business_profile`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          about: description
        })
      });
      
      const data = await response.json();
      
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log('\n✅ Successfully updated business profile!');
      } else {
        console.log('\n❌ Failed to update business profile!');
        console.log('Error:', data.error?.message || 'Unknown error');
      }
      
      rl.question('\nPress Enter to continue...', () => {
        displayMenu();
      });
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    rl.question('\nPress Enter to continue...', () => {
      displayMenu();
    });
  }
}

// 3. Send Text Message
async function sendTextMessage() {
  try {
    console.log('\nSending text message...');
    
    rl.question('Enter recipient phone number (e.g., 27123456789): ', (phoneNumber) => {
      rl.question('Enter message: ', async (message) => {
        // Format the phone number for WhatsApp API
        const formattedPhoneNumber = phoneNumber.startsWith('whatsapp:') 
          ? phoneNumber 
          : phoneNumber;
        
        const url = `${apiUrl}/${phoneNumberId}/messages`;
        
        const requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhoneNumber,
          type: 'text',
          text: {
            body: message
          }
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
          console.log('\n✅ Message sent successfully!');
          console.log(`Message ID: ${data.messages?.[0]?.id}`);
        } else {
          console.log('\n❌ Failed to send message!');
          console.log('Error:', data.error?.message || 'Unknown error');
        }
        
        rl.question('\nPress Enter to continue...', () => {
          displayMenu();
        });
      });
    });
  } catch (error) {
    console.error('Error sending text message:', error);
    rl.question('\nPress Enter to continue...', () => {
      displayMenu();
    });
  }
}

// 4. Send Template Message
async function sendTemplateMessage() {
  try {
    console.log('\nSending template message...');
    
    rl.question('Enter recipient phone number (e.g., 27123456789): ', (phoneNumber) => {
      rl.question('Enter template name: ', async (templateName) => {
        // Format the phone number for WhatsApp API
        const formattedPhoneNumber = phoneNumber.startsWith('whatsapp:') 
          ? phoneNumber 
          : phoneNumber;
        
        const url = `${apiUrl}/${phoneNumberId}/messages`;
        
        const requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhoneNumber,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en_US'
            },
            components: []
          }
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
          console.log('\n✅ Template message sent successfully!');
          console.log(`Message ID: ${data.messages?.[0]?.id}`);
        } else {
          console.log('\n❌ Failed to send template message!');
          console.log('Error:', data.error?.message || 'Unknown error');
        }
        
        rl.question('\nPress Enter to continue...', () => {
          displayMenu();
        });
      });
    });
  } catch (error) {
    console.error('Error sending template message:', error);
    rl.question('\nPress Enter to continue...', () => {
      displayMenu();
    });
  }
}

// 5. Send Image Message
async function sendImageMessage() {
  try {
    console.log('\nSending image message...');
    
    rl.question('Enter recipient phone number (e.g., 27123456789): ', (phoneNumber) => {
      rl.question('Enter image URL: ', async (imageUrl) => {
        // Format the phone number for WhatsApp API
        const formattedPhoneNumber = phoneNumber.startsWith('whatsapp:') 
          ? phoneNumber 
          : phoneNumber;
        
        const url = `${apiUrl}/${phoneNumberId}/messages`;
        
        const requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhoneNumber,
          type: 'image',
          image: {
            link: imageUrl
          }
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
          console.log('\n✅ Image message sent successfully!');
          console.log(`Message ID: ${data.messages?.[0]?.id}`);
        } else {
          console.log('\n❌ Failed to send image message!');
          console.log('Error:', data.error?.message || 'Unknown error');
        }
        
        rl.question('\nPress Enter to continue...', () => {
          displayMenu();
        });
      });
    });
  } catch (error) {
    console.error('Error sending image message:', error);
    rl.question('\nPress Enter to continue...', () => {
      displayMenu();
    });
  }
}

// 6. Send Document Message
async function sendDocumentMessage() {
  try {
    console.log('\nSending document message...');
    
    rl.question('Enter recipient phone number (e.g., 27123456789): ', (phoneNumber) => {
      rl.question('Enter document URL: ', (documentUrl) => {
        rl.question('Enter document filename: ', async (filename) => {
          // Format the phone number for WhatsApp API
          const formattedPhoneNumber = phoneNumber.startsWith('whatsapp:') 
            ? phoneNumber 
            : phoneNumber;
          
          const url = `${apiUrl}/${phoneNumberId}/messages`;
          
          const requestBody = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhoneNumber,
            type: 'document',
            document: {
              link: documentUrl,
              filename: filename
            }
          };
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          const data = await response.json();
          
          console.log('Response:', JSON.stringify(data, null, 2));
          
          if (response.ok) {
            console.log('\n✅ Document message sent successfully!');
            console.log(`Message ID: ${data.messages?.[0]?.id}`);
          } else {
            console.log('\n❌ Failed to send document message!');
            console.log('Error:', data.error?.message || 'Unknown error');
          }
          
          rl.question('\nPress Enter to continue...', () => {
            displayMenu();
          });
        });
      });
    });
  } catch (error) {
    console.error('Error sending document message:', error);
    rl.question('\nPress Enter to continue...', () => {
      displayMenu();
    });
  }
}

// 7. Get Message Templates
async function getMessageTemplates() {
  try {
    console.log('\nGetting message templates...');
    
    const url = `${apiUrl}/${businessAccountId}/message_templates`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Successfully retrieved message templates!');
      console.log(`Total templates: ${data.data?.length || 0}`);
    } else {
      console.log('\n❌ Failed to retrieve message templates!');
      console.log('Error:', data.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error getting message templates:', error);
  }
  
  rl.question('\nPress Enter to continue...', () => {
    displayMenu();
  });
}

// 8. Check Webhook Status
async function checkWebhookStatus() {
  try {
    console.log('\nChecking webhook status...');
    
    const url = `${apiUrl}/${businessAccountId}/subscribed_apps`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Successfully retrieved webhook status!');
      if (data.data && data.data.length > 0) {
        console.log('Webhook is configured:');
        console.log(`URL: ${data.data[0].callback_url}`);
        console.log(`Fields: ${data.data[0].fields.join(', ')}`);
      } else {
        console.log('No webhook is currently configured.');
      }
    } else {
      console.log('\n❌ Failed to retrieve webhook status!');
      console.log('Error:', data.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error checking webhook status:', error);
  }
  
  rl.question('\nPress Enter to continue...', () => {
    displayMenu();
  });
}

// 9. Get Phone Numbers
async function getPhoneNumbers() {
  try {
    console.log('\nGetting phone numbers...');
    
    const url = `${apiUrl}/${businessAccountId}/phone_numbers`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Successfully retrieved phone numbers!');
      console.log(`Total phone numbers: ${data.data?.length || 0}`);
    } else {
      console.log('\n❌ Failed to retrieve phone numbers!');
      console.log('Error:', data.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error getting phone numbers:', error);
  }
  
  rl.question('\nPress Enter to continue...', () => {
    displayMenu();
  });
}

// Start the test suite
console.log('=== WhatsApp API Test Suite ===');
console.log('API URL:', apiUrl);
console.log('Phone Number ID:', phoneNumberId);
console.log('Business Account ID:', businessAccountId);
console.log('===============================');

displayMenu();
