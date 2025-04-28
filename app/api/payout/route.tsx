import { NextResponse } from 'next/server';
import axios from 'axios';

interface PayoutRequest {
  amount: number;
  currency: string;
  account_number: string;
  account_name: string;
  reference: string;
  bank_code?: string;
  beneficiary_phone?: string;
}

// Mock database functions
const db = {
  getBalance: async (userId: string) => {
    // In a real app, query your database here
    return 10000; // Example balance
  },
  updateBalance: async (userId: string, amount: number) => {
    // In a real app, update your database here
    return true;
  },
  logTransaction: async (data: any) => {
    // Log transaction to your database
    console.log('Transaction logged:', data);
  }
};

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: PayoutRequest = await req.json();
    const userId = req.headers.get('x-user-id'); // Get user ID from headers

    // Validate request
    if (!body.amount || body.amount <= 0 || 
        !body.currency || 
        !body.account_number || 
        !body.account_name || 
        !body.reference) {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Check user balance
    const currentBalance = await db.getBalance(userId!);
    if (currentBalance < body.amount) {
      return NextResponse.json({
        error: 'Insufficient funds',
        message: `Your balance is ${currentBalance} ${body.currency}`
      }, { status: 400 });
    }

    // Prepare Chapa request
    const isBankTransfer = !body.account_number.startsWith('251');
    const chapaRequest = {
      account_name: body.account_name,
      account_number: body.account_number,
      amount: body.amount.toString(),
      currency: body.currency,
      reference: body.reference,
      ...(isBankTransfer && { bank_code: body.bank_code || '001' }),
      ...(!isBankTransfer && { beneficiary_phone: body.account_number })
    };

    // Call Chapa API
    const response = await axios.post('https://api.chapa.co/v1/transfers', chapaRequest, {
      headers: {
        'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Handle success
    if (response.data?.status === 'success') {
      await db.updateBalance(userId!, -body.amount);
      await db.logTransaction({
        userId,
        amount: body.amount,
        reference: body.reference,
        status: 'completed',
        timestamp: new Date()
      });

      return NextResponse.json({
        success: true,
        data: response.data
      });
    }

    return NextResponse.json({
      error: 'Payout failed',
      message: response.data?.message || 'Unknown error'
    }, { status: 400 });

  } catch (error) {
    console.error('Payout error:', error);
    
    let message = 'Internal server error';
    let status = 500;
    
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.message || error.message;
      status = error.response?.status || 500;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json({ error: message }, { status });
  }
}