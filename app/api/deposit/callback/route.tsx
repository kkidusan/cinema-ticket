import { NextResponse } from 'next/server';
import axios from 'axios';
import { db } from '../../../firebaseconfig';
import { doc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tx_ref, status } = body;
    console.log('Deposit callback received:', body);

    if (!tx_ref) {
      return NextResponse.json(
        { status: 'error', message: 'Missing transaction reference' },
        { status: 400 }
      );
    }

    // Verify transaction with Chapa
    const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const chapaStatus = response.data.data.status;
    const amount = parseFloat(response.data.data.amount);

    // Fetch transaction from Firestore
    const txQuery = query(collection(db, 'transactions'), where('reference', '==', tx_ref));
    const txSnapshot = await getDocs(txQuery);
    if (txSnapshot.empty) {
      return NextResponse.json(
        { status: 'error', message: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transactionDoc = txSnapshot.docs[0];
    const transactionData = transactionDoc.data();

    // Update transaction status
    const updatedStatus = chapaStatus === 'success' ? 'success' : chapaStatus === 'failed' ? 'failed' : 'pending';
    await updateDoc(doc(db, 'transactions', transactionDoc.id), {
      status: updatedStatus,
      payment_status: {
        current: updatedStatus,
        history: [
          ...transactionData.payment_status.history,
          {
            status: updatedStatus,
            timestamp: new Date(),
            detail: `Chapa verification: ${chapaStatus}`,
          },
        ],
      },
      updated_at: new Date(),
      verification_response: response.data,
    });

    // If successful, update balance
    if (chapaStatus === 'success') {
      const userEmail = transactionData.userEmail;
      const balanceQuery = query(collection(db, 'ownerAmount'), where('movieEmail', '==', userEmail));
      const balanceSnapshot = await getDocs(balanceQuery);
      if (!balanceSnapshot.empty) {
        const balanceDoc = balanceSnapshot.docs[0];
        const currentBalance = balanceDoc.data().totalAmount || 0;
        await updateDoc(doc(db, 'ownerAmount', balanceDoc.id), {
          totalAmount: currentBalance + amount,
          updated_at: new Date(),
        });
      } else {
        // Create new balance record if none exists
        await addDoc(collection(db, 'ownerAmount'), {
          movieEmail: userEmail,
          totalAmount: amount,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return NextResponse.json({ status: 'success', message: 'Callback processed' });
  } catch (error: any) {
    console.error('Callback error:', error.message);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}