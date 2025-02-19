import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

export interface CustomerData {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  idNumber: string;
  erfNumber: string;
  email: string;
  phone: string;
  address: string;
  postalAddress1?: string;  // First line of postal address
  postalAddress2?: string;  // Second line of postal address
  postalAddress3?: string;  // Third line of postal address
  postalCode?: string;
  valuation?: number;  // Added valuation field
  accountStatus: 'active' | 'inactive' | 'suspended' | 'pending';
  outstandingBalance: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOutstandingBalanceData {
  accountNumber?: string;
  outstandingTotalBalance?: number;
  outstandingBalanceCapital?: number;
  outstandingBalanceInterest?: number;
  lastUpdated?: string;
  mailingInstruction?: string;
  occupantOwner?: string;
  ownerCategory?: string;
  valuation?: number;  // Added valuation field
}

export const verifyCustomerAccount = async (accountNumber: string): Promise<{ 
  isValid: boolean; 
  customerName?: string;
  error?: string;
}> => {
  try {
    const customerDoc = await getDoc(doc(db, 'customers', accountNumber));
    
    if (customerDoc.exists()) {
      const customerData = customerDoc.data() as CustomerData;
      return {
        isValid: true,
        customerName: customerData.accountHolderName
      };
    }
    
    return {
      isValid: false,
      error: 'Account number not found'
    };
  } catch (error) {
    console.error('Error verifying customer account:', error);
    return {
      isValid: false,
      error: 'Error verifying account'
    };
  }
};

export const getCustomerData = async (accountNumber: string): Promise<CustomerData | null> => {
  try {
    const customerDoc = await getDoc(doc(db, 'customers', accountNumber));
    
    if (customerDoc.exists()) {
      return customerDoc.data() as CustomerData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return null;
  }
};

export const getCustomerOutstandingBalanceData = async (accountNumber: string): Promise<CustomerOutstandingBalanceData | null> => {
  try {
    const customerDoc = await getDoc(doc(db, 'customers', accountNumber));
    
    if (customerDoc.exists()) {
      const data = customerDoc.data();
      return {
        accountNumber: accountNumber,
        outstandingTotalBalance: data.outstandingBalance || 0,
        outstandingBalanceCapital: data.outstandingBalanceCapital || 0,
        outstandingBalanceInterest: data.outstandingBalanceInterest || 0,
        lastUpdated: data.updatedAt,
        mailingInstruction: data.mailingInstruction,
        occupantOwner: data.occupantOwner,
        ownerCategory: data.ownerCategory,
        valuation: data.valuation || 0  // Added valuation field
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching customer outstanding balance data:', error);
    return null;
  }
};

export const updateCustomerData = async (
  accountNumber: string,
  updates: Partial<CustomerData>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const customerRef = doc(db, 'customers', accountNumber);
    await updateDoc(customerRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating customer data:', error);
    return {
      success: false,
      error: 'Failed to update customer information'
    };
  }
};