'use client';
import { useState, useEffect, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { ThemeContext } from '../../context/ThemeContext';
import { PuffLoader } from 'react-spinners';
import { DollarSign, ArrowDownCircle, ArrowUpCircle, Eye, EyeOff } from 'lucide-react';
import { FaArrowLeft } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
        if (!response.ok) throw new Error('Unauthorized');
        const data = await response.json();
        if (data.email && data.role === 'owner') {
          setUserEmail(data.email);
          setUserRole(data.role);
          setIsAuthenticated(true);
        } else {
          throw new Error('Invalid user');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        toast.error('Authentication failed. Please log in.', {
          position: 'top-right',
        });
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

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
      let total = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.totalAmount) {
          total += Number(data.totalAmount);
        }
      });
      setTotalBalance(total);
    } catch (err) {
      console.error('Error fetching total balance:', err);
      toast.error('Failed to fetch balance.', {
        position: 'top-right',
      });
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
        console.error('Error fetching transactions:', err);
        toast.error('Failed to fetch transactions.', {
          position: 'top-right',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, userEmail, activeTab]);

  // Fetch balance when authenticated
  useEffect(() => {
    if (isAuthenticated && userEmail) {
      fetchTotalBalance();
    }
  }, [isAuthenticated, userEmail]);

  // Update balance in Firestore
  const updateBalanceInFirestore = async (withdrawalAmount) => {
    try {
      const q = query(collection(db, 'ownerAmount'), where('movieEmail', '==', userEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'ownerAmount', querySnapshot.docs[0].id);
        const newBalance = totalBalance - withdrawalAmount;
        await updateDoc(docRef, { totalAmount: newBalance });
        setTotalBalance(newBalance);
        return true;
      } else {
        toast.error('Balance record not found.', {
          position: 'top-right',
        });
        return false;
      }
    } catch (err) {
      console.error('Error updating balance:', err);
      toast.error('Failed to update balance.', {
        position: 'top-right',
      });
      return false;
    }
  };

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
        position: 'top-right',
      });
      return false;
    }
    if (activeTab === 'withdraw' && amount > totalBalance) {
      toast.error(`Amount cannot exceed your balance of ${totalBalance} ETB.`, {
        position: 'top-right',
      });
      return false;
    }
    if (!formData.account_number.trim()) {
      toast.error('Please enter a valid account number or phone number.', {
        position: 'top-right',
      });
      return false;
    }
    if (formData.isMobileMoney) {
      // Enhanced validation for Ethiopian phone numbers
      const phoneRegex = /^\+251(9|7)\d{8}$/;
      if (!phoneRegex.test(formData.account_number)) {
        toast.error('Please enter a valid Ethiopian phone number (e.g., +2519XXXXXXXX or +2517XXXXXXXX).', {
          position: 'top-right',
        });
        return false;
      }
    } else {
      if (!formData.account_number.match(/^\d{10,20}$/)) {
        toast.error('Please enter a valid bank account number (10-20 digits).', {
          position: 'top-right',
        });
        return false;
      }
    }
    if (!formData.account_name.trim()) {
      toast.error('Please enter the account holder’s name.', {
        position: 'top-right',
      });
      return false;
    }
    if (!formData.isMobileMoney && !formData.bank_code) {
      toast.error('Please select a bank.', {
        position: 'top-right',
      });
      return false;
    }
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

      const endpoint = activeTab === 'withdraw' ? '/api/payout' : '/api/deposit';
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          'x-user-id': userEmail || 'test-user',
        },
      });

      if (response.data.success) {
        if (activeTab === 'withdraw') {
          const updateSuccess = await updateBalanceInFirestore(Number(formData.amount));
          if (!updateSuccess) {
            throw new Error('Balance update failed');
          }

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

            const successMessage = formData.isMobileMoney
              ? `Withdrawal of ${formData.amount} ETB to Telebirr (${formData.account_number}) successful! New balance: ${(
                  totalBalance - Number(formData.amount)
                ).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB.`
              : `Withdrawal of ${formData.amount} ETB to bank account successful! New balance: ${(
                  totalBalance - Number(formData.amount)
                ).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB.`;

            toast.success(successMessage, {
              position: 'top-right',
              autoClose: 5000,
            });
          } catch (firestoreError) {
            console.error('Error registering transaction:', firestoreError);
            toast.warn(
              `Withdrawal of ${formData.amount} ETB successful, but failed to record in history. Contact support.`,
              {
                position: 'top-right',
                autoClose: 7000,
              }
            );
          }
        } else {
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

            const successMessage = formData.isMobileMoney
              ? `Deposit of ${formData.amount} ETB via Telebirr initiated successfully!`
              : `Deposit of ${formData.amount} ETB via bank transfer initiated successfully!`;

            toast.success(successMessage, {
              position: 'top-right',
              autoClose: 5000,
            });
            await fetchTotalBalance();
          } catch (firestoreError) {
            console.error('Error registering deposit transaction:', firestoreError);
            toast.warn(
              `Deposit of ${formData.amount} ETB initiated, but failed to record in history. Contact support.`,
              {
                position: 'top-right',
                autoClose: 7000,
              }
            );
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
      } else {
        toast.error(response.data.message || `${activeTab} failed.`, {
          position: 'top-right',
        });
      }
    } catch (err) {
      const errorMessage = isTestMode
        ? `Test mode: Simulated ${activeTab} failure.`
        : axios.isAxiosError(err)
        ? err.response?.data?.error || `Failed to process ${activeTab}.`
        : `Failed to process ${activeTab}.`;
      toast.error(errorMessage, {
        position: 'top-right',
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

  if (loading || !isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
        <div className="flex flex-col items-center">
          <PuffLoader color="#3b82f6" size={100} />
          <p className={`mt-4 text-2xl font-bold ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
      <ToastContainer
        position="top-right"
        autoClose={5000}
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