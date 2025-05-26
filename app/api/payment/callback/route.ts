import { NextResponse } from 'next/server';
import axios from 'axios';

const CHAPA_API_URL = 'https://api.chapa.co/v1/transaction/verify';

interface ChapaVerificationResponse {
  status: string;
  data: {
    transaction_id: string;
    tx_ref: string;
    amount: string;
    currency: string;
    status: string;
  };
}

// In-memory storage for payments (Note: Use a database in production)
const payments: Record<string, any> = {};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Payment callback received:', JSON.stringify(body, null, 2));

    // Handle different possible field names from Chapa webhook
    const trx_ref = body.trx_ref || body.tx_ref || body.transaction_ref;
    const status = body.status || 'unknown';

    if (!trx_ref) {
      console.error('Missing transaction reference in callback payload');
      return NextResponse.json(
        { status: 'error', message: 'Transaction reference missing', code: 'MISSING_TX_REF' },
        { status: 400 }
      );
    }

    // Verify payment with Chapa
    try {
      const verificationResponse = await axios.get<ChapaVerificationResponse>(
        `${CHAPA_API_URL}/${trx_ref}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const chapaStatus = verificationResponse.data.data.status;
      const payment = payments[trx_ref] || {};

      // Update payment status
      const updatedPayment = {
        ...payment,
        status: chapaStatus,
        verification_response: verificationResponse.data,
        updated_at: new Date(),
        webhook_payload: body,
      };

      payments[trx_ref] = updatedPayment;
      console.log(`Payment verified for txRef: ${trx_ref}, status: ${chapaStatus}`);

      return NextResponse.json({
        status: 'success',
        message: 'Payment verified',
        payment: updatedPayment,
      });
    } catch (verificationError) {
      console.error(`Chapa verification failed for txRef ${trx_ref}:`, verificationError);
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Payment verification failed', 
          code: 'VERIFICATION_FAILED' 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Callback processing error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message || 'Invalid callback payload', 
        code: 'INVALID_PAYLOAD' 
      },
      { status: 500 }
    );
  }
}