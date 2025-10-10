require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  const serviceAccount = require('../server/serviceAccount.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'zimako-backend'
  });
  
  console.log('✅ Firebase Admin initialized');
} else {
  console.log('ℹ️  Using existing Firebase Admin instance');
}

const db = admin.firestore();

// Escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function exportCustomersToCSV() {
  try {
    console.log('🔄 Fetching customers from Firebase...');
    
    const customersRef = db.collection('customers');
    const snapshot = await customersRef.get();
    
    if (snapshot.empty) {
      console.log('❌ No customers found in the database');
      process.exit(1);
    }

    console.log(`✅ Found ${snapshot.size} customers`);
    console.log('📝 Converting to CSV...');

    // Define CSV headers
    const headers = [
      'Account Number',
      'Account Holder Name',
      'ID Number',
      'ERF Number',
      'Email',
      'Phone',
      'Physical Address',
      'Postal Address 1',
      'Postal Address 2',
      'Postal Address 3',
      'Postal Code',
      'Valuation',
      'Account Status',
      'Outstanding Balance',
      'Outstanding Balance Capital',
      'Outstanding Balance Interest',
      'Last Payment Date',
      'Last Payment Amount',
      'Mailing Instruction',
      'Occupant Owner',
      'Owner Category',
      'Created At',
      'Updated At'
    ];

    // Create CSV rows
    const rows = [];
    snapshot.forEach(doc => {
      const customer = doc.data();
      rows.push([
        customer.accountNumber || '',
        customer.accountHolderName || '',
        customer.idNumber || '',
        customer.erfNumber || '',
        customer.email || customer.emailAddress || '',
        customer.phone || customer.cellNumber || customer.phoneNumber || '',
        customer.address || customer.physicalAddress || '',
        customer.postalAddress1 || '',
        customer.postalAddress2 || '',
        customer.postalAddress3 || '',
        customer.postalCode || '',
        customer.valuation || '',
        customer.accountStatus || '',
        customer.outstandingBalance || customer.outstandingTotalBalance || '',
        customer.outstandingBalanceCapital || '',
        customer.outstandingBalanceInterest || '',
        customer.lastPaymentDate || '',
        customer.lastPaymentAmount || '',
        customer.mailingInstruction || '',
        customer.occupantOwner || '',
        customer.ownerCategory || '',
        customer.createdAt || '',
        customer.updatedAt || ''
      ]);
    });

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `customers_export_${timestamp}.csv`;
    const filepath = path.join(outputDir, filename);

    // Write to file
    fs.writeFileSync(filepath, csvContent, 'utf8');

    console.log(`✅ Successfully exported ${snapshot.size} customers`);
    console.log(`📁 File saved to: ${filepath}`);
    console.log(`📊 File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error exporting customers:', error);
    process.exit(1);
  }
}

// Run the export
exportCustomersToCSV();
