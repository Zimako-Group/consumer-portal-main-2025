# Export Customers to CSV Guide

This guide explains how to export the 'customers' collection from Firebase Firestore to CSV format.

## ⭐ Method 1: Dedicated Export Page (RECOMMENDED - Easiest & Most Reliable)

### Quick Setup
1. Add the export route to your `App.tsx`:

```tsx
import ExportCustomersPage from './pages/ExportCustomersPage';

// In your Routes section:
<Route path="/export-customers" element={<ExportCustomersPage />} />
```

2. Navigate to: `http://localhost:5173/export-customers`

3. Click "Export Customers to CSV" button

4. Done! The CSV downloads automatically.

### Features
- ✅ Beautiful, user-friendly interface
- ✅ Real-time status updates
- ✅ Progress indicators
- ✅ Automatic error handling
- ✅ No command line required
- ✅ Works with your existing Firebase authentication

---

## Method 2: Using the Admin Dashboard Button

### Setup
1. Add the export button to your admin dashboard
2. Open your Super Admin or Admin Dashboard component
3. Import and add the `ExportCustomersButton` component:

```tsx
import ExportCustomersButton from './ExportCustomersButton';

// Inside your dashboard component, add:
<ExportCustomersButton />
```

### Usage
1. Log in to the admin dashboard
2. Click the "Export Customers to CSV" button
3. Wait for the export to complete
4. The CSV file will automatically download to your Downloads folder
5. Filename format: `customers_export_YYYY-MM-DD.csv`

### Features
- ✅ Real-time progress notifications
- ✅ Automatic error handling
- ✅ Shows total count of exported customers
- ✅ No command line required
- ✅ Works from any browser

---

## Method 2: Using Node.js Script (Recommended for Large Exports)

### Prerequisites
- Node.js installed
- Firebase Admin SDK configured
- `serviceAccount.json` in the `server/` directory

### Usage

1. Open your terminal in the project root directory

2. Run the export script:
```bash
node scripts/exportCustomersToCSV.js
```

3. The script will:
   - Connect to Firebase
   - Fetch all customers
   - Convert to CSV format
   - Save to `exports/customers_export_YYYY-MM-DD.csv`

### Output Location
The CSV file will be saved in:
```
consumer-portal-main-2025/exports/customers_export_YYYY-MM-DD.csv
```

### Features
- ✅ Handles large datasets efficiently
- ✅ Server-side processing (no browser limits)
- ✅ Detailed console output
- ✅ Automatic directory creation
- ✅ File size reporting

---

## CSV File Structure

The exported CSV includes the following columns:

| Column | Description |
|--------|-------------|
| Account Number | Customer account number |
| Account Holder Name | Full name of account holder |
| ID Number | South African ID number |
| ERF Number | Property ERF number |
| Email | Email address |
| Phone | Phone/cell number |
| Physical Address | Physical address |
| Postal Address 1-3 | Postal address lines |
| Postal Code | Postal code |
| Valuation | Property valuation |
| Account Status | active/inactive/suspended/pending |
| Outstanding Balance | Total outstanding amount |
| Outstanding Balance Capital | Capital portion |
| Outstanding Balance Interest | Interest portion |
| Last Payment Date | Date of last payment |
| Last Payment Amount | Amount of last payment |
| Mailing Instruction | Mailing preferences |
| Occupant Owner | Occupant/owner status |
| Owner Category | Category of owner |
| Created At | Account creation timestamp |
| Updated At | Last update timestamp |

---

## Troubleshooting

### Method 1 (Admin Dashboard)

**Problem**: Button doesn't appear
- **Solution**: Make sure you've imported and added the component to your dashboard

**Problem**: "No customers found"
- **Solution**: Check that the 'customers' collection exists in Firestore

**Problem**: Export fails with permission error
- **Solution**: Verify your Firestore rules allow reading the customers collection

### Method 2 (Node.js Script)

**Problem**: "Cannot find module 'firebase-admin'"
- **Solution**: Run `npm install` in the project root

**Problem**: "serviceAccount.json not found"
- **Solution**: Ensure the file exists at `server/serviceAccount.json`

**Problem**: Permission denied error
- **Solution**: Check that your service account has Firestore read permissions

---

## Best Practices

1. **Regular Backups**: Export customers regularly for backup purposes
2. **Data Security**: Keep exported CSV files secure (contains sensitive data)
3. **Large Datasets**: For 10,000+ customers, use Method 2 (Node.js script)
4. **Verify Data**: Open the CSV in Excel/Google Sheets to verify completeness

---

## Advanced: Custom Export Script

If you need to customize the export (filter by status, date range, etc.), modify the Node.js script:

```javascript
// Example: Export only active customers
const snapshot = await customersRef.where('accountStatus', '==', 'active').get();

// Example: Export customers with outstanding balance > 1000
const snapshot = await customersRef.where('outstandingBalance', '>', 1000).get();
```

---

## Support

For issues or questions:
1. Check the browser console (F12) for error messages
2. Check the terminal output for script errors
3. Verify Firebase connection and permissions
4. Contact the development team
