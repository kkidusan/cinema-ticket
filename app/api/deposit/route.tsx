import { NextResponse } from 'next/server';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../firebaseconfig';
import { doc, updateDoc, getDocs, query, collection, where, addDoc } from 'firebase/firestore';

const ALLOWED_CURRENCIES = ['ETB', 'USD'] as const;
type AllowedCurrency = typeof ALLOWED_CURRENCIES[number];

interface DepositValidation {
  amount: number;
  currency: AllowedCurrency;
  email: string;
  first_name?: string;
  last_name?: string;
  callback_url: string;
  return_url?: string;
  reference: string;
  payment_method: 'bank' | 'telebirr';
  account_number: string;
  account_name: string;
  bank_code?: string;
}

// Validation functions
const validateDepositData = (data: any): data is DepositValidation => {
  const errors: string[] = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Invalid or missing email address');
  }

  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    errors.push('Invalid or missing amount');
  }

  if (!data.currency || !ALLOWED_CURRENCIES.includes(data.currency)) {
    errors.push(`Invalid currency. Allowed currencies: ${ALLOWED_CURRENCIES.join(', ')}`);
  }

  if (!data.callback_url || !isValidUrl(data.callback_url)) {
    errors.push('Invalid or missing callback URL');
  }

  if (data.return_url && !isValidUrl(data.return_url)) {
    errors.push('Invalid return URL');
  }

  if (!data.reference) {
    errors.push('Missing transaction reference');
  }

  if (!data.payment_method || !['bank', 'telebirr'].includes(data.payment_method)) {
    errors.push('Invalid payment method');
  }

  if (!data.account_number) {
    errors.push('Missing account number or phone number');
  }

  if (!data.account_name) {
    errors.push('Missing account name');
  }

  if (data.payment_method === 'bank' && !data.bank_code) {
    errors.push('Missing bank code for bank payment');
  }

  return errors.length === 0;
};

function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    const body = await req.json();
    console.log(`[${requestId}] Deposit initialization request:`, body);

    // Fetch user email from headers
    const userEmail = req.headers.get('x-user-id') || body.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing user email' },
        { status: 400 }
      );
    }

    // Fetch user details from Firestore
    const userQuery = query(collection(db, 'appuser'), where('email', '==', userEmail));
    const userSnapshot = await getDocs(userQuery);
    if (userSnapshot.empty) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    const userData = userSnapshot.docs[0].data();

    const depositData = {
      ...body,
      email: userEmail,
      first_name: userData.firstName || 'Guest',
      last_name: userData.lastName || 'User',
      callback_url: body.callback_url || `${process.env.NEXT_PUBLIC_BASE_URL}/api/deposit/callback`,
      return_url: body.return_url || `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/finance?tab=transaction`,
    };

    if (!validateDepositData(depositData)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Invalid deposit data provided' },
        { status: 400 }
      );
    }

    // Check for duplicate transaction
    const txQuery = query(collection(db, 'transactions'), where('reference', '==', depositData.reference));
    const txSnapshot = await getDocs(txQuery);
    if (!txSnapshot.empty) {
      return NextResponse.json(
        { error: 'Duplicate transaction', message: 'This transaction reference already exists' },
        { status: 409 }
      );
    }

    // Calculate 3% fee
    const amount = parseFloat(depositData.amount);
    const threePercentValue = (amount * 0.03).toFixed(2);

    // Prepare Chapa payment data
    const paymentData = {
      amount: depositData.amount.toString(),
      currency: depositData.currency,
      email: depositData.email,
      first_name: depositData.first_name,
      last_name: depositData.last_name,
      tx_ref: depositData.reference,
      callback_url: depositData.callback_url,
      return_url: depositData.return_url,
      'customization[title]': 'Deposit Transaction',
      'customization[description]': `Deposit of ${depositData.amount} ${depositData.currency}`,
      ...(depositData.payment_method === 'telebirr' ? { payment_method: 'telebirr' } : {}),
    };

    // Create initial transaction record
    const transactionRecord = {
      type: 'deposit',
      amount,
      currency: depositData.currency,
      account_number: depositData.account_number,
      account_name: depositData.account_name,
      bank_code: depositData.payment_method === 'bank' ? depositData.bank_code : null,
      reference: depositData.reference,
      userEmail: depositData.email,
      date: new Date().toISOString(),
      isMobileMoney: depositData.payment_method === 'telebirr',
      payment_method: depositData.payment_method,
      status: 'initiated',
      payment_status: {
        current: 'initiated',
        history: [{
          status: 'initiated',
          timestamp: new Date(),
          detail: 'Deposit initialization started',
        }],
      },
      three_percent_value: threePercentValue,
      chapa_data: null,
    };

    // Store transaction in Firestore
    await addDoc(collection(db, 'transactions'), transactionRecord);

    // Initialize payment with Chapa
    const response = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    // Update transaction with Chapa response
    await updateDoc(doc(db, 'transactions', transactionRecord.reference), {
      status: 'pending',
      payment_status: {
        current: 'pending',
        history: [
          ...transactionRecord.payment_status.history,
          {
            status: 'pending',
            timestamp: new Date(),
            detail: 'Deposit initialized with Chapa',
          },
        ],
      },
      chapa_data: {
        checkout_url: response.data?.data?.checkout_url,
        initialization_response: response.data,
        initialization_date: new Date(),
      },
      updated_at: new Date(),
    });

    console.log(`[${requestId}] Deposit initialized successfully in ${Date.now() - startTime}ms`);

    return NextResponse.json(
      {
        ...response.data,
        tx_ref: depositData.reference,
        request_id: requestId,
        status: 'pending',
        three_percent_value: threePercentValue,
      },
      {
        status: 200,
        headers: { 'X-Request-ID': requestId },
      }
    );
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error(`[${requestId}] Deposit initialization failed after ${Date.now() - startTime}ms:`, errorMessage);

    // Store failed transaction attempt
    await addDoc(collection(db, 'transactions'), {
      type: 'deposit',
      status: 'failed',
      userEmail: body.email || 'unknown',
      reference: body.reference || requestId,
      error: errorMessage,
      date: new Date().toISOString(),
      payment_status: {
        current: 'failed',
        history: [{
          status: 'failed',
          timestamp: new Date(),
          detail: errorMessage,
        }],
      },
    });

    return NextResponse.json(
      {
        error: 'Deposit initialization failed',
        message: errorMessage,
        request_id: requestId,
        status: 'failed',
      },
      {
        status: error.response?.status || 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}