require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const chalk = require('chalk');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * This script monitors WhatsApp events in real-time from Firestore
 * It displays incoming messages, delivery status, and other events
 */

console.log(chalk.blue('=== WhatsApp Event Monitor ==='));
console.log(chalk.blue('Monitoring WhatsApp events in real-time...'));
console.log(chalk.blue('Press Ctrl+C to exit'));
console.log(chalk.blue('===============================\n'));

// Monitor incoming messages
db.collection('whatsappMessages')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const message = change.doc.data();
        
        console.log(chalk.green('📩 New Message:'));
        console.log(chalk.green(`From: ${message.from}`));
        console.log(chalk.green(`Message: ${message.body}`));
        console.log(chalk.green(`Time: ${new Date(message.timestamp).toLocaleString()}`));
        console.log(chalk.green(`Message ID: ${message.id}`));
        console.log('');
      }
    });
  }, (error) => {
    console.error(chalk.red('Error monitoring messages:'), error);
  });

// Monitor message status updates
db.collection('whatsappMessageStatus')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const status = change.doc.data();
        
        let statusColor;
        switch (status.status) {
          case 'sent':
            statusColor = chalk.blue;
            break;
          case 'delivered':
            statusColor = chalk.green;
            break;
          case 'read':
            statusColor = chalk.magenta;
            break;
          case 'failed':
            statusColor = chalk.red;
            break;
          default:
            statusColor = chalk.yellow;
        }
        
        console.log(statusColor(`📤 Message Status Update:`));
        console.log(statusColor(`Message ID: ${status.messageId}`));
        console.log(statusColor(`Status: ${status.status.toUpperCase()}`));
        console.log(statusColor(`Time: ${new Date(status.timestamp).toLocaleString()}`));
        console.log('');
      }
    });
  }, (error) => {
    console.error(chalk.red('Error monitoring message status:'), error);
  });

// Monitor template messages
db.collection('whatsappTemplates')
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const template = change.doc.data();
        
        console.log(chalk.cyan('📝 New Template:'));
        console.log(chalk.cyan(`Name: ${template.name}`));
        console.log(chalk.cyan(`Status: ${template.status}`));
        console.log(chalk.cyan(`Category: ${template.category}`));
        console.log('');
      } else if (change.type === 'modified') {
        const template = change.doc.data();
        
        console.log(chalk.yellow('📝 Template Updated:'));
        console.log(chalk.yellow(`Name: ${template.name}`));
        console.log(chalk.yellow(`Status: ${template.status}`));
        console.log(chalk.yellow(`Category: ${template.category}`));
        console.log('');
      }
    });
  }, (error) => {
    console.error(chalk.red('Error monitoring templates:'), error);
  });

// Keep the script running
process.stdin.resume();

// Handle exit
process.on('SIGINT', () => {
  console.log(chalk.blue('\n=== Monitor Stopped ==='));
  process.exit();
});
