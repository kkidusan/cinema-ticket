'use client';
import { useState, useEffect, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { ThemeContext } from '../../context/ThemeContext';
import { PuffLoader } from 'react-spinners';
import { DollarSign, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { FaArrowLeft } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const bankCodes = [
  { code: '001', name: 'Commercial Bank of Ethiopia (CBE)' },
  { code: '002', name: 'Dashen Bank' },
  { code: '003', name: 'Awash Bank' },
];

export default function FinancePage() {
  const { theme = 'light' } = useContext(ThemeContext) || {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('tab') || 'withdraw';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true); // Start as true for auth check
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'ETB',
    account_number: '',
    account_name: '',
    bank_code: '001',
    reference: `txn-${Date.now()}`,
    isMobileMoney: false,
  });
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isTestMode = process.env.NEXT_PUBLIC_CHAPA_TEST_MODE === 'true';

  // Fetch user email, role, and validate authentication
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
        toast.error('Authentication failed. Please log in.');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Update activeTab when query parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'withdraw';
    if (['withdraw', 'deposit', 'transaction'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('withdraw');
      router.replace('/dashboard/finance?tab=withdraw');
    }
  }, [searchParams, router]);

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!isAuthenticated || !userEmail) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'transactions'), where('userEmail', '==', userEmail));
      const querySnapshot = await getDocs(q);
      const txns = querySnapshot.docs.map((doc) => doc.data());
      setTransactions(txns);
    } catch (err) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Load transactions when tab is transaction
  useEffect(() => {
    if (activeTab === 'transaction' && isAuthenticated && userEmail) {
      fetchTransactions();
    }
  }, [activeTab, isAuthenticated, userEmail]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle mobile money
  const handleMobileMoneyToggle = () => {
    setFormData((prev) => ({
      ...prev,
      isMobileMoney: !prev.isMobileMoney,
      account_number: '',
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please log in to proceed.');
      return;
    }
    setLoading(true);

    try {
      const payload = {
        amount: Number(formData.amount),
        currency: formData.currency,
        account_number: formData.account_number,
        account_name: formData.account_name,
        reference: formData.reference,
        userEmail, // Include user email in payload for tracking
        ...(formData.isMobileMoney ? {} : { bank_code: formData.bank_code }),
      };

      const endpoint = activeTab === 'withdraw' ? '/api/payout' : '/api/deposit';
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          'x-user-id': userEmail, // Use email instead of hardcoded ID
        },
      });

      if (response.data.success) {
        toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} initiated successfully!`);
        setFormData({
          amount: '',
          currency: 'ETB',
          account_number: '',
          account_name: '',
          bank_code: '001',
          reference: `txn-${Date.now()}`,
          isMobileMoney: false,
        });
      } else {
        toast.error(response.data.message || `${activeTab} failed`);
      }
    } catch (err) {
      toast.error(
        isTestMode
          ? `Test mode: Simulated ${activeTab}`
          : axios.isAxiosError(err)
          ? err.response?.data?.error || err.message
          : 'Request failed'
      );
    } finally {
      setLoading(false);
    }
  };

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.push(`/dashboard/finance?tab=${tab}`);
  };

  // Tab content
  const TabContent = () => {
    if (activeTab === 'transaction') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          <h3 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-zinc-800' : 'text-zinc-100'}`}>
            Transaction History
          </h3>
          {loading ? (
            <div className="flex justify-center">
              <PuffLoader color="#3b82f6" size={60} />
            </div>
          ) : transactions.length === 0 ? (
            <p className={`text-center ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}>
              No transactions found.
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((txn, index) => (
                <motion.div
                  key={index}
                  className={`p-4 rounded-lg shadow-sm ${
                    theme === 'light' ? 'bg-gradient-to-br from-blue-100 to-purple-100' : 'bg-gradient-to-br from-gray-700 to-gray-800'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <p className={`${theme === 'light' ? 'text-zinc-700' : 'text-zinc-200'}`}>
                    <span className="font-semibold">Type:</span> {txn.type}
                  </p>
                  <p className={`${theme === 'light' ? 'text-zinc-700' : 'text-zinc-200'}`}>
                    <span className="font-semibold">Amount:</span> {txn.amount} {txn.currency}
                  </p>
                  <p className={`${theme === 'light' ? 'text-zinc-700' : 'text-zinc-200'}`}>
                    <span className="font-semibold">Date:</span> {new Date(txn.date).toLocaleString()}
                  </p>
                  <p className={`${theme === 'light' ? 'text-zinc-700' : 'text-zinc-200'}`}>
                    <span className="font-semibold">Reference:</span> {txn.reference}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      );
    }

    return (
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mt-6 space-y-4"
      >
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
            Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-gray-800 border-zinc-700 text-zinc-100'
            }`}
            required
            min="10"
            aria-label="Amount"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
            Currency
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-gray-800 border-zinc-700 text-zinc-100'
            }`}
            aria-label="Currency"
          >
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isMobileMoney}
              onChange={handleMobileMoneyToggle}
              className="mr-2"
              aria-label="Use Mobile Money (Telebirr)"
            />
            <span className={`text-sm ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
              Mobile Money (Telebirr) {userEmail}
            </span>
          </label>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
            {formData.isMobileMoney ? 'Phone Number' : 'Account Number'}
          </label>
          <input
            type="text"
            name="account_number"
            value={formData.account_number}
            onChange={handleChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-gray-800 border-zinc-700 text-zinc-100'
            }`}
            required
            placeholder={formData.isMobileMoney ? '2519XXXXXXXX' : 'Account number'}
            aria-label={formData.isMobileMoney ? 'Phone number' : 'Account number'}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
            Account Name
          </label>
          <input
            type="text"
            name="account_name"
            value={formData.account_name}
            onChange={handleChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-gray-800 border-zinc-700 text-zinc-100'
            }`}
            required
            aria-label="Account name"
          />
        </div>
        {!formData.isMobileMoney && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
              Bank
            </label>
            <select
              name="bank_code"
              value={formData.bank_code}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-gray-800 border-zinc-700 text-zinc-100'
              }`}
              aria-label="Bank"
            >
              {bankCodes.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
            Reference
          </label>
          <input
            type="text"
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-gray-800 border-zinc-700 text-zinc-100'
            }`}
            required
            aria-label="Reference"
          />
        </div>
        <motion.button
          type="submit"
          disabled={loading || !isAuthenticated}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-full p-3 rounded-lg font-medium ${
            loading || !isAuthenticated
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
          }`}
        >
          {loading ? 'Processing...' : activeTab === 'withdraw' ? 'Withdraw' : 'Deposit'}
        </motion.button>
      </motion.form>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#3b82f6" size={100} />
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Router will redirect to /login
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

      {/* Navigation Header */}
      <div
        className={`sticky top-0 z-50 ${
          theme === 'light' ? 'bg-gradient-to-br from-zinc-100 to-zinc-200' : 'bg-gradient-to-br from-gray-800 to-gray-900'
        } border-b ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-700'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <motion.button
              onClick={() => router.back()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                theme === 'light' ? 'text-purple-700 hover:bg-purple-100' : 'text-purple-300 hover:bg-purple-800'
              } transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Go back"
            >
              <FaArrowLeft className="h-5 w-5" />
              <span className="text-lg font-medium">Back</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 pt-24">
        <motion.div
          className={`w-full max-w-2xl rounded-2xl shadow-lg overflow-hidden ${
            theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-purple-50' : 'bg-gradient-to-br from-gray-800 to-gray-900'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-6">
            <h2 className={`text-3xl font-bold mb-6 text-center ${theme === 'light' ? 'text-zinc-800' : 'text-zinc-100'}`}>
              Financial Management
            </h2>
            {isTestMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mb-4 p-3 rounded-lg ${
                  theme === 'light' ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-900 text-yellow-200'
                }`}
              >
                <strong>Test Mode Active</strong>
              </motion.div>
            )}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {[
                { id: 'withdraw', label: 'Withdraw', icon: <ArrowDownCircle size={18} /> },
                { id: 'deposit', label: 'Deposit', icon: <ArrowUpCircle size={18} /> },
                { id: 'transaction', label: 'Transactions', icon: <DollarSign size={18} /> },
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent'
                      : theme === 'light'
                      ? 'border-blue-500 text-blue-500 hover:bg-blue-50'
                      : 'border-blue-400 text-blue-400 hover:bg-blue-900'
                  }`}
                  aria-label={`Switch to ${tab.label} tab`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <TabContent key={activeTab} />
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}