import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

interface ChatResponse {
  response: string;
  data?: any;
}

export const chatbotService = {
  async getTotalCustomers() {
    try {
      const customersRef = collection(db, 'customers');
      const querySnapshot = await getDocs(customersRef);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting total customers:', error);
      throw error;
    }
  },

  async getActiveUsers() {
    try {
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('accountStatus', '==', 'ACTIVE'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting active users:', error);
      throw error;
    }
  },

  async getTotalPayments() {
    // You can implement payment query here when needed
    return 0;
  },

  async processQuery(query: string): Promise<ChatResponse> {
    const lowerQuery = query.toLowerCase();
    
    try {
      if (lowerQuery.includes('customer') || lowerQuery.includes('customers')) {
        const totalCustomers = await this.getTotalCustomers();
        return {
          response: `We currently have ${totalCustomers} customers in our database.`,
          data: { totalCustomers }
        };
      }
      
      if (lowerQuery.includes('active')) {
        const activeUsers = await this.getActiveUsers();
        return {
          response: `There are ${activeUsers} active customers in our system.`,
          data: { activeUsers }
        };
      }
      
      if (lowerQuery.includes('payment') || lowerQuery.includes('payments')) {
        const totalPayments = await this.getTotalPayments();
        return {
          response: `The total payments received is R${totalPayments}.`,
          data: { totalPayments }
        };
      }
      
      return {
        response: "I'm not sure how to answer that question. You can ask me about our total customers, active users, or total payments."
      };
    } catch (error) {
      console.error('Error processing query:', error);
      return {
        response: "I apologize, but I encountered an error while processing your request. Please try again."
      };
    }
  }
};
