'use client';
import { useState, useEffect, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { collection, query, where, getDocs, doc, addDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { ThemeContext } from '../../context/ThemeContext';
import { PuffLoader } from 'react-spinners';
import { DollarSign, ArrowDownCircle, ArrowUpCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { FaArrowLeft } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';

const bankCodes = [
  { code: '001', name: 'Commercial Bank of Ethiopia (CBE)' },
  { code: '002', name: 'Dashen Bank' },
  { code: '003', name: 'Awash Bank' },
];

// Utility function to generate a unique transaction reference
const generateReference = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `txn-${timestamp}-${random}`;
};

// Utility function to check saleTicket and withdrawal amount against totalAmount
const checkSaleTicket = async (userEmail, withdrawalAmount, theme) => {
  try {
    // Query paymentHistory where ownerEmail equals userEmail and new is true
    const paymentQuery = query(
      collection(db, 'paymentHistory'),
      where('ownerEmail', '==', userEmail),
      where('new', '==', true)
    );
    const paymentSnapshot = await getDocs(paymentQuery);

    // Calculate sum of ticketPrice
    let sum = 0;
    paymentSnapshot.forEach((doc) => {
      const data = doc.data();
      sum += Number(data.ticketPrice) || 0;
    });

    // Calculate saleTicket (sum + 3% of sum)
    const saleTicket = sum + 0.03 * sum;

    // Query ownerAmount to get totalAmount
    const ownerQuery = query(collection(db, 'ownerAmount'), where('movieEmail', '==', userEmail));
    const ownerSnapshot = await getDocs(ownerQuery);

    if (ownerSnapshot.empty) {
      toast.error('Balance record not found for this user.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      console.error('No ownerAmount document found for user:', userEmail);
      return false;
    }

    if (ownerSnapshot.docs.length > 1) {
      console.error('Multiple ownerAmount documents found for user:', userEmail);
      toast.error('Multiple balance records found. Contact support.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }

    const totalAmount = Number(ownerSnapshot.docs[0].data().totalAmount) || 0;

    // Check if totalAmount >= saleTicket
    if (totalAmount < saleTicket) {
      toast.error(
        `Insufficient balance to cover ticket sales. Required: ${saleTicket.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })} ETB, Available: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB.`,
        {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === 'light' ? 'light' : 'dark',
        }
      );
      return false;
    }

    // Check if withdrawalAmount <= (totalAmount - saleTicket)
    const maxWithdrawal = totalAmount - saleTicket;
    if (withdrawalAmount > maxWithdrawal) {
      toast.error(
        `Withdrawal amount exceeds available balance after ticket sales. Maximum: ${maxWithdrawal.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })} ETB.`,
        {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === 'light' ? 'light' : 'dark',
        }
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error checking saleTicket:', err.message);
    toast.error('Failed to validate ticket sales balance.', {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: theme === 'light' ? 'light' : 'dark',
    });
    return false;
  }
};

// Utility function to update balance in Firestore using a transaction
const updateBalanceInFirestore = async (userEmail, withdrawalAmount, theme) => {
  try {
    const q = query(collection(db, 'ownerAmount'), where('movieEmail', '==', userEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      toast.error('Balance record not found for this user.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      console.error('No ownerAmount document found for user:', userEmail);
      return false;
    }

    if (querySnapshot.docs.length > 1) {
      console.error('Multiple ownerAmount documents found for user:', userEmail);
      toast.error('Multiple balance records found. Contact support.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }

    const docRef = doc(db, 'ownerAmount', querySnapshot.docs[0].id);

    // Use a transaction to ensure atomic updates
    const newBalance = await runTransaction(db, async (transaction) => {
      const docSnapshot = await transaction.get(docRef);
      if (!docSnapshot.exists()) {
        throw new Error('Document does not exist.');
      }

      const currentBalance = docSnapshot.data().totalAmount || 0;
      if (currentBalance < withdrawalAmount) {
        throw new Error('Insufficient balance.');
      }

      const updatedBalance = currentBalance - withdrawalAmount;
      transaction.update(docRef, { totalAmount: updatedBalance });
      return updatedBalance;
    });

    console.log(`Balance updated successfully. New balance: ${newBalance}`);
    return newBalance;
  } catch (err) {
    console.error('Error updating balance:', err.message);
    toast.error(`Failed to update balance: ${err.message}`, {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: theme === 'light' ? 'light' : 'dark',
    });
    return false;
  }
};

export default function FinancePage() {
  const { theme = 'light' } = useContext(ThemeContext) || {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('tab') || 'withdraw';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'ETB',
    account_number: '',
    account_name: '',
    bank_code: '',
    isMobileMoney: false,
  });
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isTestMode = process.env.NEXT_PUBLIC_CHAPA_TEST_MODE === 'true';

  // Fetch user authentication
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/validate', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Unauthorized access. Please log in.';
          toast.error(errorMessage, {
            position: 'bottom-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === 'light' ? 'light' : 'dark',
          });
          throw new Error(errorMessage);
        }
        const data = await response.json();
        if (data.email && data.role === 'owner') {
          setUserEmail(data.email);
          setUserRole(data.role);
          setIsAuthenticated(true);
        } else {
          toast.error('User is not an owner.', {
            position: 'bottom-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === 'light' ? 'light' : 'dark',
          });
          throw new Error('Invalid user');
        }
      } catch (error) {
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router, theme]);

  // Handle tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab') || 'withdraw';
    if (['withdraw', 'deposit', 'transaction'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('withdraw');
      router.replace('/dashboard/finance?tab=withdraw');
    }
  }, [searchParams, router]);

  // Fetch total balance
  const fetchTotalBalance = async () => {
    if (!userEmail) return;
    try {
      const q = query(collection(db, 'ownerAmount'), where('movieEmail', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error('No ownerAmount document found for user:', userEmail);
        toast.error('No balance record found for this user.', {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === 'light' ? 'light' : 'dark',
        });
        setTotalBalance(0);
        return;
      }

      if (querySnapshot.docs.length > 1) {
        console.error('Multiple ownerAmount documents found for user:', userEmail);
        toast.error('Multiple balance records found. Contact support.', {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === 'light' ? 'light' : 'dark',
        });
        setTotalBalance(0);
        return;
      }

      const docData = querySnapshot.docs[0].data();
      const total = Number(docData.totalAmount) || 0;
      setTotalBalance(total);
      console.log(`Fetched balance: ${total} for user: ${userEmail}`);
    } catch (err) {
      console.error('Error fetching balance:', err.message);
      toast.error('Failed to fetch balance.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      setTotalBalance(0);
    }
  };

  // Real-time transaction listener
  useEffect(() => {
    if (!isAuthenticated || !userEmail || activeTab !== 'transaction') return;

    const q = query(collection(db, 'transactions'), where('userEmail', '==', userEmail));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        txns.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(txns);
        setLoading(false);
      },
      (err) => {
        toast.error('Failed to fetch transactions.', {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === 'light' ? 'light' : 'dark',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, userEmail, activeTab, theme]);

  // Fetch balance when authenticated
  useEffect(() => {
    if (isAuthenticated && userEmail) {
      fetchTotalBalance();
    }
  }, [isAuthenticated, userEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMobileMoneyToggle = () => {
    setFormData((prev) => ({
      ...prev,
      isMobileMoney: !prev.isMobileMoney,
      account_number: '',
      bank_code: '',
    }));
  };

  const validateForm = () => {
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount greater than zero.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }
    if (activeTab === 'withdraw' && amount > totalBalance) {
      toast.error(`Amount cannot exceed your balance of ${totalBalance} ETB.`, {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }
    if (!formData.account_number.trim()) {
      toast.error('Please enter a valid account number or phone number.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }
    if (formData.isMobileMoney) {
      const phoneRegex = /^\+251(9|7)\d{8}$/;
      if (!phoneRegex.test(formData.account_number)) {
        toast.error('Please enter a valid Ethiopian phone number (e.g., +2519XXXXXXXX or +2517XXXXXXXX).', {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === 'light' ? 'light' : 'dark',
        });
        return false;
      }
    } else {
      if (!formData.account_number.match(/^\d{10,20}$/)) {
        toast.error('Please enter a valid bank account number (10-20 digits).', {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === 'light' ? 'light' : 'dark',
        });
        return false;
      }
    }
    if (!formData.account_name.trim()) {
      toast.error('Please enter the account holder’s name.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }
    if (!formData.account_name.match(/^[A-Za-z\s]+$/)) {
      toast.error('Account name must contain only letters and spaces.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }
    if (!formData.isMobileMoney && !formData.bank_code) {
      toast.error('Please select a bank.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
      return false;
    }
    toast.success('Form validated successfully. Processing your request...', {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: theme === 'light' ? 'light' : 'dark',
      className: 'bg-blue-100 text-blue-800 font-medium rounded-xl shadow-lg',
    });
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const reference = generateReference();
      const payload = {
        amount: Number(formData.amount),
        currency: formData.currency,
        account_number: formData.account_number,
        account_name: formData.account_name,
        reference,
        payment_method: formData.isMobileMoney ? 'telebirr' : 'bank',
        ...(formData.isMobileMoney ? {} : { bank_code: formData.bank_code }),
      };

      if (activeTab === 'withdraw') {
        // Check saleTicket and withdrawal amount
        const canWithdraw = await checkSaleTicket(userEmail, Number(formData.amount), theme);
        if (!canWithdraw) {
          setLoading(false);
          return;
        }

        // Update balance using the transaction-based function
        const newBalance = await updateBalanceInFirestore(userEmail, Number(formData.amount), theme);
        if (newBalance === false) {
          throw new Error('Balance update failed');
        }
        setTotalBalance(newBalance);

        try {
          await addDoc(collection(db, 'transactions'), {
            type: 'withdrawal',
            amount: Number(formData.amount),
            currency: formData.currency,
            account_number: formData.account_number,
            account_name: formData.account_name,
            bank_code: formData.isMobileMoney ? null : formData.bank_code,
            reference,
            userEmail,
            date: new Date().toISOString(),
            isMobileMoney: formData.isMobileMoney,
            payment_method: formData.isMobileMoney ? 'telebirr' : 'bank',
          });

          // Show success message only via toast
          toast.success(
            <div className="flex items-center gap-2">
              <CheckCircle size={24} className="text-green-600" />
              <span>
                {formData.isMobileMoney
                  ? `Withdrawal of ${formData.amount} ETB to Telebirr (${formData.account_number}) successful! New balance: ${newBalance.toLocaleString(
                      'en-US',
                      { minimumFractionDigits: 2 }
                    )} ETB.`
                  : `Withdrawal of ${formData.amount} ETB to bank account successful! New balance: ${newBalance.toLocaleString(
                      'en-US',
                      { minimumFractionDigits: 2 }
                    )} ETB.`}
              </span>
            </div>,
            {
              position: 'top-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === 'light' ? 'light' : 'dark',
              className: `${
                theme === 'light'
                  ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                  : 'bg-gradient-to-r from-green-700 to-green-800 text-green-100'
              } font-semibold rounded-xl shadow-xl border ${
                theme === 'light' ? 'border-green-300' : 'border-green-600'
              } p-4`,
              style: { minWidth: '300px', animation: 'slideIn 0.3s ease-in-out' },
            }
          );
        } catch (firestoreError) {
          console.error('Error recording transaction:', firestoreError.message);
          toast.warn(
            `Withdrawal of ${formData.amount} ETB successful, but failed to record in history. Contact support.`,
            {
              position: 'bottom-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === 'light' ? 'light' : 'dark',
            }
          );
        }
      } else {
        // Handle deposit
        const endpoint = '/api/deposit';
        const response = await axios.post(endpoint, payload, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            'x-user-id': userEmail || 'test-user',
          },
        });

        if (response.data.success) {
          try {
            await addDoc(collection(db, 'transactions'), {
              type: 'deposit',
              amount: Number(formData.amount),
              currency: formData.currency,
              account_number: formData.account_number,
              account_name: formData.account_name,
              bank_code: formData.isMobileMoney ? null : formData.bank_code,
              reference,
              userEmail,
              date: new Date().toISOString(),
              isMobileMoney: formData.isMobileMoney,
              payment_method: formData.isMobileMoney ? 'telebirr' : 'bank',
            });

            toast.success(
              formData.isMobileMoney
                ? `Deposit of ${formData.amount} ETB via Telebirr initiated successfully!`
                : `Deposit of ${formData.amount} ETB via bank transfer initiated successfully!`,
              {
                position: 'bottom-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: theme === 'light' ? 'light' : 'dark',
              }
            );
            await fetchTotalBalance();
          } catch (firestoreError) {
            toast.warn(
              `Deposit of ${formData.amount} ETB initiated, but failed to record in history. Contact support.`,
              {
                position: 'bottom-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: theme === 'light' ? 'light' : 'dark',
              }
            );
          }
        } else {
          toast.error(response.data.message || 'Deposit failed.', {
            position: 'bottom-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === 'light' ? 'light' : 'dark',
          });
        }
      }

      setFormData({
        amount: '',
        currency: 'ETB',
        account_number: '',
        account_name: '',
        bank_code: '',
        isMobileMoney: false,
      });
    } catch (err) {
      const errorMessage = isTestMode
        ? `Test mode: Simulated ${activeTab} failure.`
        : axios.isAxiosError(err)
        ? err.response?.data?.error || `Failed to process ${activeTab}.`
        : `Failed to process ${activeTab}.`;
      toast.error(errorMessage, {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === 'light' ? 'light' : 'dark',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.push(`/dashboard/finance?tab=${tab}`);
  };

  const toggleBalanceVisibility = () => {
    setShowBalance((prev) => !prev);
  };

  const TabContent = () => {
    if (activeTab === 'transaction') {
      return (
        <div className="mt-6">
          <h3 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}>
            Transaction History
          </h3>
          {loading ? (
            <div className="flex justify-center">
              <PuffLoader color="#36D7B7" size={60} />
            </div>
          ) : transactions.length === 0 ? (
            <p className={`text-center text-lg ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              No transactions found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full text-left border-collapse ${
                  theme === 'light' ? 'bg-white' : 'bg-gray-800'
                } rounded-lg shadow-md`}
              >
                <thead>
                  <tr
                    className={`${
                      theme === 'light' ? 'bg-blue-100 text-gray-800' : 'bg-blue-900 text-gray-100'
                    } sticky top-0`}
                  >
                    <th className="p-3 text-sm font-semibold">Type</th>
                    <th className="p-3 text-sm font-semibold">Amount</th>
                    <th className="p-3 text-sm font-semibold">Date</th>
                    <th className="p-3 text-sm font-semibold">Reference</th>
                    <th className="p-3 text-sm font-semibold">Account Info</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, index) => {
                    const bank = bankCodes.find((b) => b.code === txn.bank_code);
                    return (
                      <tr
                        key={txn.id}
                        className={`${
                          index % 2 === 0
                            ? theme === 'light'
                              ? 'bg-blue-50'
                              : 'bg-gray-700'
                            : theme === 'light'
                              ? 'bg-white'
                              : 'bg-gray-800'
                        } hover:${
                          theme === 'light' ? 'bg-blue-100' : 'bg-gray-600'
                        } transition-colors`}
                      >
                        <td className="p-3 text-sm">
                          {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                        </td>
                        <td className="p-3 text-sm">
                          {txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {txn.currency}
                        </td>
                        <td className="p-3 text-sm">{new Date(txn.date).toLocaleString()}</td>
                        <td className="p-3 text-sm">{txn.reference}</td>
                        <td className="p-3 text-sm">
                          {txn.isMobileMoney
                            ? `Phone: ${txn.account_number} (Telebirr)`
                            : `A/C: ${txn.account_number} (${bank ? bank.name : 'Unknown Bank'})`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${theme === 'light' ? 'bg-white text-gray-800' : 'bg-gray-700 text-gray-100'}`}
            required
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
          />
          {activeTab === 'withdraw' && formData.amount && Number(formData.amount) > totalBalance && (
            <p className="text-red-500 text-sm mt-1">Amount exceeds your balance of {totalBalance} ETB.</p>
          )}
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            Currency
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${theme === 'light' ? 'bg-white text-gray-800' : 'bg-gray-700 text-gray-100'}`}
            required
          >
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isMobileMoney}
              onChange={handleMobileMoneyToggle}
              className="mr-2"
            />
            <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Mobile Money (Telebirr)</span>
          </label>
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            {formData.isMobileMoney ? 'Phone Number' : 'Account Number'}
          </label>
          <input
            type="text"
            name="account_number"
            value={formData.account_number}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${theme === 'light' ? 'bg-white text-gray-800' : 'bg-gray-700 text-gray-100'}`}
            required
            placeholder={formData.isMobileMoney ? 'e.g., +2519XXXXXXXX' : 'e.g., 1234567890'}
          />
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            Account Name
          </label>
          <input
            type="text"
            name="account_name"
            value={formData.account_name}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${theme === 'light' ? 'bg-white text-gray-800' : 'bg-gray-700 text-gray-100'}`}
            required
            placeholder="Enter account holder's name"
          />
        </div>
        {!formData.isMobileMoney && (
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              Bank
            </label>
            <select
              name="bank_code"
              value={formData.bank_code}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${theme === 'light' ? 'bg-white text-gray-800' : 'bg-gray-700 text-gray-100'}`}
              required
            >
              <option value="" disabled>
                Select a bank
              </option>
              {bankCodes.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={loading || (activeTab === 'withdraw' && formData.amount && Number(formData.amount) > totalBalance)}
          className={`w-full p-2 rounded ${
            loading || (activeTab === 'withdraw' && formData.amount && Number(formData.amount) > totalBalance)
              ? 'bg-gray-400 cursor-not-allowed'
              : theme === 'light'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {loading ? 'Processing...' : activeTab === 'withdraw' ? 'Withdraw' : 'Deposit'}
        </button>
      </form>
    );
  };

  if (loading || !isAuthenticated || userRole !== 'owner') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color={theme === 'light' ? '#3b82f6' : '#FFFFFF'} size={100} />
          <motion.p
            className={`mt-4 text-2xl font-bold ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Loading finances...
          </motion.p>
        </motion.div>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={theme === 'light' ? 'light' : 'dark'}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme === 'light' ? 'light' : 'dark'}
      />

      <div
        className={`sticky top-0 z-50 ${
          theme === 'light' ? 'bg-gradient-to-br from-zinc-100 to-zinc-200' : 'bg-gradient-to-br from-gray-800 to-gray-900'
        } border-b ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-700'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                theme === 'light' ? 'text-purple-700 hover:bg-purple-100' : 'text-purple-300 hover:bg-purple-800'
              } transition-colors`}
            >
              <FaArrowLeft className="h-5 w-5" />
              <span className="text-lg font-medium">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                Balance: {showBalance ? `${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB` : '••••••'}
              </p>
              <button
                onClick={toggleBalanceVisibility}
                className={`p-2 rounded-full ${
                  theme === 'light' ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 hover:bg-gray-700'
                } transition-colors duration-200`}
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-4 pt-6">
        <div className="max-w-2xl w-full">
          <div className="flex justify-center space-x-4 mb-6">
            {[
              { id: 'withdraw', label: 'Withdraw', icon: <ArrowDownCircle size={20} /> },
              { id: 'deposit', label: 'Deposit', icon: <ArrowUpCircle size={20} /> },
              { id: 'transaction', label: 'Transactions', icon: <DollarSign size={20} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  activeTab === tab.id
                    ? theme === 'light'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'light'
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div
            className={`p-6 rounded-2xl shadow-xl ${
              theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-purple-50' : 'bg-gradient-to-br from-gray-800 to-gray-900'
            }`}
          >
            {TabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}