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

async function verifyWithRetry(txRef: string, maxRetries: number = 3, delay: number = 1000): Promise<ChapaVerificationResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get<ChapaVerificationResponse>(
        `${CHAPA_API_URL}/${txRef}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      console.log(`Verification attempt ${attempt} for txRef ${txRef} succeeded`);
      return response.data;
    } catch (error) {
      console.error(`Verification attempt ${attempt} for txRef ${txRef} failed:`, error);
      if (attempt === maxRetries) throw new Error(`Verification failed after ${maxRetries} attempts`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Verification failed after maximum retries');
}

export async function GET(
  request: Request,
  { params }: { params: { txRef: string } }
) {
  if (!params.txRef || typeof params.txRef !== 'string') {
    console.error('Invalid txRef:', params.txRef);
    return NextResponse.json(
      { error: 'Invalid transaction reference', code: 'INVALID_TX_REF' },
      { status: 400 }
    );
  }

  try {
    const payment = payments[params.txRef];

    if (!payment) {
      console.warn(`Payment not found for txRef: ${params.txRef}`);
      return NextResponse.json(
        { error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (payment.status === 'pending' || payment.status === 'processing') {
      try {
        const verificationResponse = await verifyWithRetry(params.txRef);
        const chapaStatus = verificationResponse.data.status;
        const currentTime = new Date();

        const updatedPayment = {
          ...payment,
          status: chapaStatus === 'success' ? 'success' : 
                  chapaStatus === 'failed' ? 'failed' : payment.status,
          last_verified: currentTime,
          verification_response: verificationResponse,
          chapa_transaction_id: verificationResponse.data.transaction_id,
          amount_confirmed: verificationResponse.data.amount,
          currency_confirmed: verificationResponse.data.currency,
          updated_at: currentTime,
        };

        payments[params.txRef] = updatedPayment;
        console.log(`Payment updated for txRef: ${params.txRef}, status: ${updatedPayment.status}`);

        return NextResponse.json({
          payment: updatedPayment,
          verified: true,
          last_verified: currentTime,
        });
      } catch (verificationError) {
        console.error(`Chapa verification failed for txRef ${params.txRef}:`, verificationError);
        return NextResponse.json({
          payment: payment,
          verified: false,
          verification_error: 'Could not verify payment status with provider',
          code: 'VERIFICATION_FAILED',
        });
      }
    }

    console.log(`Returning cached payment for txRef: ${params.txRef}, status: ${payment.status}`);
    return NextResponse.json({
      payment: payment,
      verified: true,
      last_verified: payment.last_verified,
    });

  } catch (error) {
    console.error(`Error fetching payment for txRef ${params.txRef}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment details',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { txRef: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'processing', 'success', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      console.error('Invalid status provided:', status);
      return NextResponse.json(
        { error: 'Invalid status provided', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const payment = payments[params.txRef];

    if (!payment) {
      console.warn(`Payment not found for txRef: ${params.txRef}`);
      return NextResponse.json(
        { error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const updatedPayment = {
      ...payment,
      status: status,
      updated_at: new Date(),
      updated_by: 'manual-update',
    };

    payments[params.txRef] = updatedPayment;
    console.log(`Payment status updated for txRef: ${params.txRef}, new status: ${status}`);

    return NextResponse.json({
      message: 'Payment status updated successfully',
      payment: updatedPayment,
    });

  } catch (error) {
    console.error(`Error updating payment for txRef ${params.txRef}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to update payment status',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}