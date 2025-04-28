import { NextResponse } from 'next/server';
import axios from 'axios';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebaseconfig';

interface PayoutRequest {
  amount: number;
  currency: string;
  account_number: string;
  account_name: string;
  reference: string;
  bank_code?: string;
  beneficiary_phone?: string;
  userEmail: string;
}

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
        !body.reference ||
        !body.userEmail ||
        userId !== body.userEmail) {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Missing or invalid fields'
      }, { status: 400 });
    }

    // Check user balance and withdrawal status
    const ownerRef = doc(db, 'owner', body.userEmail);
    const ownerDoc = await getDoc(ownerRef);
    if (!ownerDoc.exists()) {
      return NextResponse.json({
        error: 'User not found',
        message: 'Owner account does not exist'
      }, { status: 404 });
    }

    const ownerData = ownerDoc.data();
    const currentBalance = ownerData.totalBalance || 0;
    const hasWithdrawn = ownerData.hasWithdrawn || false;

    if (hasWithdrawn) {
      return NextResponse.json({
        error: 'Withdrawal not allowed',
        message: 'Balance has already been withdrawn'
      }, { status: 400 });
    }

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
      // Update balance and withdrawal status
      const newBalance = currentBalance - body.amount;
      await updateDoc(ownerRef, {
        totalBalance: newBalance,
        hasWithdrawn: true,
      });

      // Log transaction
      await addDoc(collection(db, 'transactions'), {
        userEmail: body.userEmail,
        amount: body.amount,
        reference: body.reference,
        status: 'completed',
        timestamp: new Date().toISOString(),
        type: 'withdraw',
        currency: body.currency,
        account_number: body.account_number,
        account_name: body.account_name,
        bank_code: body.bank_code || null,
      });

      return NextResponse.json({
        success: true,
        data: response.data,
        newBalance
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