import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    const lowerQuery = query.toLowerCase();

    // Handle different types of queries
    if (lowerQuery.includes('how many customers') || lowerQuery.includes('total customers')) {
      const customerCount = await prisma.user.count({
        where: {
          role: 'CUSTOMER'
        }
      });
      return res.status(200).json({
        response: `We currently have ${customerCount} customers in our database.`,
        data: { customerCount }
      });
    }

    // Add more query handlers here
    if (lowerQuery.includes('active users') || lowerQuery.includes('online users')) {
      const activeUsers = await prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      return res.status(200).json({
        response: `There are ${activeUsers} users who have been active in the last 24 hours.`,
        data: { activeUsers }
      });
    }

    if (lowerQuery.includes('payment') && lowerQuery.includes('total')) {
      const totalPayments = await prisma.payment.aggregate({
        _sum: {
          amount: true
        }
      });
      const formattedAmount = new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR'
      }).format(totalPayments._sum.amount || 0);
      
      return res.status(200).json({
        response: `The total payments received are ${formattedAmount}.`,
        data: { totalPayments: totalPayments._sum.amount }
      });
    }

    // Default response for unhandled queries
    return res.status(200).json({
      response: "I apologize, but I don't have enough information to answer that query. Could you please rephrase or ask something about customers, users, or payments?",
      data: null
    });

  } catch (error) {
    console.error('ChatBot API Error:', error);
    return res.status(500).json({
      response: "I apologize, but I encountered an error while processing your request. Please try again later.",
      error: error.message
    });
  }
}
