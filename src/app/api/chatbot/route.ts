import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;
    const lowerQuery = query.toLowerCase();

    // Handle different types of queries
    if (lowerQuery.includes('how many customers') || lowerQuery.includes('total customers')) {
      const customerCount = await prisma.user.count({
        where: {
          role: 'CUSTOMER'
        }
      });
      return NextResponse.json({
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
      return NextResponse.json({
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
      
      return NextResponse.json({
        response: `The total payments received are ${formattedAmount}.`,
        data: { totalPayments: totalPayments._sum.amount }
      });
    }

    // Default response for unhandled queries
    return NextResponse.json({
      response: "I apologize, but I don't have enough information to answer that query. Could you please rephrase or ask something about customers, users, or payments?",
      data: null
    });

  } catch (error) {
    console.error('ChatBot API Error:', error);
    return NextResponse.json(
      {
        response: "I apologize, but I encountered an error while processing your request. Please try again later.",
        error: error.message
      },
      { status: 500 }
    );
  }
}
