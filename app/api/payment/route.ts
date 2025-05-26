import { NextResponse } from 'next/server';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_CURRENCIES = ['ETB', 'USD'] as const;
type AllowedCurrency = typeof ALLOWED_CURRENCIES[number];

interface PaymentValidation {
  amount: number;
  currency: AllowedCurrency;
  email: string;
  first_name?: string;
  last_name?: string;
  callback_url: string;
  return_url?: string;
  order_id?: string;
  metadata?: Record<string, any>;
}

// Validation functions
const validatePaymentData = (data: any): data is PaymentValidation => {
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

// In-memory storage for payments (Note: Use a database in production)
const payments: Record<string, any> = {};

async function initializeWithRetry(
  paymentData: any,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        'https://api.chapa.co/v1/transaction/initialize',
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      console.log(`Initialization attempt ${attempt} succeeded`);
      return response;
    } catch (error) {
      console.error(`Initialization attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Initialization failed after maximum retries');
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    const body = await req.json();
    console.log(`[${requestId}] Payment initialization request:`, JSON.stringify(body, null, 2));

    if (!validatePaymentData(body)) {
      console.error(`[${requestId}] Validation failed for request`);
      return NextResponse.json({
        error: 'Validation failed',
        message: 'Invalid payment data provided',
        code: 'INVALID_DATA',
      }, { status: 400 });
    }

    const tx_ref = body.order_id || `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (payments[tx_ref]) {
      console.warn(`[${requestId}] Duplicate transaction detected for tx_ref: ${tx_ref}`);
      return NextResponse.json({
        error: 'Duplicate transaction',
        message: 'This transaction reference already exists',
        code: 'DUPLICATE_TX_REF',
      }, { status: 409 });
    }

    const amount = parseFloat(body.amount);
    const threePercentValue = (amount * 0.03).toFixed(2);

    const paymentData = {
      amount: body.amount.toString(),
      currency: body.currency,
      email: body.email,
      first_name: body.first_name || "Guest",
      last_name: body.last_name || "User",
      tx_ref,
      callback_url: body.callback_url,
      return_url: body.return_url || body.callback_url,
      "customization[title]": body.customization?.title || "Payment",
      "customization[description]": body.customization?.description || "Payment Transaction",
    };

    const paymentRecord = {
      tx_ref,
      amount: amount,
      currency: body.currency,
      email: body.email,
      first_name: body.first_name || "Guest",
      last_name: body.last_name || "User",
      status: 'initiated',
      payment_status: {
        current: 'initiated',
        history: [{
          status: 'initiated',
          timestamp: new Date(),
          detail: 'Payment initialization started',
        }],
      },
      payment_date: null,
      expected_amount: amount,
      metadata: body.metadata || {},
      request_id: requestId,
      created_at: new Date(),
      updated_at: new Date(),
      callback_url: body.callback_url,
      return_url: body.return_url || body.callback_url,
      verification_attempts: 0,
      last_verification: null,
      last_error: null,
      chapa_data: null,
      three_percent_value: threePercentValue,
    };

    const response = await initializeWithRetry(paymentData);

    const updatedPaymentRecord = {
      ...paymentRecord,
      status: 'pending',
      payment_status: {
        current: 'pending',
        history: [
          ...paymentRecord.payment_status.history,
          {
            status: 'pending',
            timestamp: new Date(),
            detail: 'Payment initialized with Chapa',
          },
        ],
      },
      chapa_data: {
        checkout_url: response.data?.data?.checkout_url,
        initialization_response: response.data,
        initialization_date: new Date(),
      },
      updated_at: new Date(),
    };

    payments[tx_ref] = updatedPaymentRecord;
    console.log(`[${requestId}] Payment initialized successfully in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      ...response.data,
      tx_ref,
      request_id: requestId,
      status: 'pending',
      three_percent_value: threePercentValue,
    }, { 
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Rate-Limit-Limit': '100',
        'X-Rate-Limit-Remaining': '99',
      },
    });

  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error(`[${requestId}] Payment initialization failed after ${Date.now() - startTime}ms:`, errorMessage);

    const failedPaymentRecord = {
      request_id: requestId,
      error: errorMessage,
      request_body: body,
      timestamp: new Date(),
      stack_trace: error.stack,
      status: 'failed',
      payment_status: {
        current: 'failed',
        history: [{
          status: 'failed',
          timestamp: new Date(),
          detail: errorMessage,
        }],
      },
    };

    payments[requestId] = failedPaymentRecord;

    return NextResponse.json({
      error: 'Payment initialization failed',
      message: errorMessage,
      request_id: requestId,
      code: 'INITIALIZATION_FAILED',
    }, { 
      status: 500,
      headers: {
        'X-Request-ID': requestId,
      },
    });
  }
}