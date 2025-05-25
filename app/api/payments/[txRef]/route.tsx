import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';
import { db } from '../../../firebaseconfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

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

interface Params {
  params: {
    txRef: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!params.txRef || typeof params.txRef !== 'string') {
    return NextResponse.json(
      { error: 'Invalid transaction reference' },
      { status: 400 }
    );
  }

  try {
    // Fetch transaction from Firestore
    const transactionDoc = await getDoc(doc(db, 'transactions', params.txRef));
    if (!transactionDoc.exists()) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transaction = transactionDoc.data();

    // If transaction is pending or processing, verify with Chapa
    if (transaction.status === 'pending' || transaction.status === 'processing') {
      try {
        const verificationResponse = await axios.get<ChapaVerificationResponse>(
          `${CHAPA_API_URL}/${params.txRef}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        const chapaStatus = verificationResponse.data.data.status;
        const currentTime = new Date();

        // Update transaction status
        const updatedTransaction = {
          ...transaction,
          status:
            chapaStatus === 'success'
              ? 'success'
              : chapaStatus === 'failed'
              ? 'failed'
              : transaction.status,
          last_verified: currentTime,
          verification_response: verificationResponse.data,
          chapa_transaction_id: verificationResponse.data.data.transaction_id,
          amount_confirmed: verificationResponse.data.data.amount,
          currency_confirmed: verificationResponse.data.data.currency,
          updated_at: currentTime,
        };

        await updateDoc(doc(db, 'transactions', params.txRef), updatedTransaction);

        return NextResponse.json({
          transaction: updatedTransaction,
          verified: true,
          last_verified: currentTime,
        });
      } catch (verificationError) {
        console.error('Chapa verification error:', verificationError);
        return NextResponse.json({
          transaction,
          verified: false,
          verification_error: 'Could not verify transaction status with provider',
        });
      }
    }

    return NextResponse.json({
      transaction,
      verified: true,
      last_verified: transaction.last_verified,
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch transaction details',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}