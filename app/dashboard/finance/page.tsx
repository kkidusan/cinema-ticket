"use client";

import { useState, useEffect, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../lib/firebase-client";
import { ThemeContext } from "../../context/ThemeContext";
import { PuffLoader } from "react-spinners";
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  EyeOff,
  CheckCircle,
  Mail,
  User,
  Loader2,
  CreditCard,
  X,
} from "lucide-react";
import { FaArrowLeft } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";

// Encryption utilities
const encoder = new TextEncoder();

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(data);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedData
  );
  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);
  return btoa(String.fromCharCode(...combined));
}

// Define interfaces
interface Bank {
  code: string;
  name: string;
}

interface Transaction {
  id: string;
  type: "withdrawal" | "deposit";
  amount: number;
  currency: string;
  account_number: string;
  account_name: string;
  bank_code: string | null;
  reference: string;
  userEmail: string;
  date: string;
  isMobileMoney: boolean;
  payment_method: string;
}

interface FormData {
  // For withdrawal
  amount?: string;
  currency?: string;
  account_number?: string;
  account_name?: string;
  bank_code?: string;
  isMobileMoney?: boolean;
  // For deposit (PaymentForm)
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface Errors {
  email?: string;
  firstName?: string;
  lastName?: string;
  amount?: string;
}

interface FinancePageProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const bankCodes: Bank[] = [
  { code: "001", name: "Commercial Bank of Ethiopia (CBE)" },
  { code: "002", name: "Dashen Bank" },
  { code: "003", name: "Awash Bank" },
];

// Utility function to generate a unique transaction reference
const generateReference = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `txn-${timestamp}-${random}`;
};

// Utility function to check saleTicket and withdrawal amount
const checkSaleTicket = async (
  userEmail: string,
  withdrawalAmount: number,
  theme: string
): Promise<boolean> => {
  try {
    const paymentQuery = query(
      collection(db, "paymentHistory"),
      where("ownerEmail", "==", userEmail),
      where("new", "==", true)
    );
    const paymentSnapshot = await getDocs(paymentQuery);

    let sum = 0;
    paymentSnapshot.forEach((doc) => {
      const data = doc.data();
      sum += Number(data.ticketPrice) || 0;
    });

    const saleTicket = sum + 0.03 * sum;

    const ownerQuery = query(
      collection(db, "ownerAmount"),
      where("movieEmail", "==", userEmail)
    );
    const ownerSnapshot = await getDocs(ownerQuery);

    if (ownerSnapshot.empty) {
      toast.error("Balance record not found for this user.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      console.error("No ownerAmount document found for user:", userEmail);
      return false;
    }

    if (ownerSnapshot.docs.length > 1) {
      console.error("Multiple ownerAmount documents found for user:", userEmail);
      toast.error("Multiple balance records found. Contact support.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return false;
    }

    const totalAmount = Number(ownerSnapshot.docs[0].data().totalAmount) || 0;

    if (totalAmount < saleTicket) {
      toast.error(
        `Insufficient balance to cover ticket sales. Required: ${saleTicket.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2 }
        )} ETB, Available: ${totalAmount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })} ETB.`,
        {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        }
      );
      return false;
    }

    const maxWithdrawal = totalAmount - saleTicket;
    if (withdrawalAmount > maxWithdrawal) {
      toast.error(
        `Withdrawal amount exceeds available balance after ticket sales. Maximum: ${maxWithdrawal.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2 }
        )} ETB.`,
        {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        }
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error checking saleTicket:", (err as Error).message);
    toast.error("Failed to validate ticket sales balance.", {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: theme === "light" ? "light" : "dark",
    });
    return false;
  }
};

// Utility function to update balance in Firestore
const updateBalanceInFirestore = async (
  userEmail: string,
  withdrawalAmount: number,
  theme: string
): Promise<number | false> => {
  try {
    const q = query(
      collection(db, "ownerAmount"),
      where("movieEmail", "==", userEmail)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      toast.error("Balance record not found for this user.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      console.error("No ownerAmount document found for user:", userEmail);
      return false;
    }

    if (querySnapshot.docs.length > 1) {
      console.error("Multiple ownerAmount documents found for user:", userEmail);
      toast.error("Multiple balance records found. Contact support.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return false;
    }

    const docRef = doc(db, "ownerAmount", querySnapshot.docs[0].id);

    const newBalance = await runTransaction(db, async (transaction) => {
      const docSnapshot = await transaction.get(docRef);
      if (!docSnapshot.exists()) {
        throw new Error("Document does not exist.");
      }

      const currentBalance = docSnapshot.data().totalAmount || 0;
      if (currentBalance < withdrawalAmount) {
        throw new Error("Insufficient balance.");
      }

      const updatedBalance = currentBalance - withdrawalAmount;
      transaction.update(docRef, { totalAmount: updatedBalance });
      return updatedBalance;
    });

    console.log(`Balance updated successfully. New balance: ${newBalance}`);
    return newBalance;
  } catch (err) {
    console.error("Error updating balance:", (err as Error).message);
    toast.error(`Failed to update balance: ${(err as Error).message}`, {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: theme === "light" ? "light" : "dark",
    });
    return false;
  }
};

export default function FinancePage({
  isSidebarOpen,
  toggleSidebar,
  isCollapsed,
  toggleCollapse,
}: FinancePageProps) {
  const { theme = "light" } = useContext(ThemeContext) || {};
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("withdraw");
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    amount: "",
    currency: "ETB",
    account_number: "",
    account_name: "",
    bank_code: "",
    isMobileMoney: false,
    email: "",
    firstName: "",
    lastName: "",
  });
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string>("");
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const isTestMode = process.env.NEXT_PUBLIC_CHAPA_TEST_MODE === "true";

  // Compute content margin based on sidebar state
  const contentMargin = isSidebarOpen ? (isCollapsed ? "lg:ml-24" : "lg:ml-64") : "ml-0";

  // Initialize encryption key
  useEffect(() => {
    generateKey().then((key) => setEncryptionKey(key));
  }, []);

  // Fetch user authentication
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error || "Unauthorized access. Please log in.";
          toast.error(errorMessage, {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error(errorMessage);
        }
        const data = await response.json();
        if (data.email && data.role === "owner") {
          setUserEmail(data.email);
          setUserRole(data.role);
          setIsAuthenticated(true);
          setFormData((prev) => ({ ...prev, email: data.email }));
        } else {
          toast.error("User is not an owner.", {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error("Invalid user");
        }
      } catch (error) {
        setTimeout(() => {
          router.replace("/login");
        }, 3000);
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, theme]);

  // Real-time listener for pending status
  useEffect(() => {
    if (!isAuthenticated || !userEmail) return;

    const ownerQuery = query(
      collection(db, "ownerAmount"),
      where("movieEmail", "==", userEmail),
      where("padding", "==", true)
    );

    const unsubscribe = onSnapshot(
      ownerQuery,
      (snapshot) => {
        setIsPending(!snapshot.empty);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to pending status:", err.message);
        toast.error("Failed to fetch pending status.", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        setIsPending(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, userEmail, theme]);

  // Fetch total balance
  const fetchTotalBalance = useCallback(async () => {
    if (!userEmail) return;
    try {
      const q = query(
        collection(db, "ownerAmount"),
        where("movieEmail", "==", userEmail)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error("No ownerAmount document found for user:", userEmail);
        toast.error("No balance record found for this user.", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        setTotalBalance(0);
        return;
      }

      if (querySnapshot.docs.length > 1) {
        console.error("Multiple ownerAmount documents found for user:", userEmail);
        toast.error("Multiple balance records found. Contact support.", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        setTotalBalance(0);
        return;
      }

      const docData = querySnapshot.docs[0].data();
      const total = Number(docData.totalAmount) || 0;
      setTotalBalance(total);
      console.log(`Fetched balance: ${total} for user: ${userEmail}`);
    } catch (err) {
      console.error("Error fetching balance:", (err as Error).message);
      toast.error("Failed to fetch balance.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      setTotalBalance(0);
    }
  }, [userEmail, theme]);

  // Real-time transaction listener
  useEffect(() => {
    if (!isAuthenticated || !userEmail || activeTab !== "transaction") return;

    const q = query(
      collection(db, "transactions"),
      where("userEmail", "==", userEmail)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txns = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
        );
        txns.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTransactions(txns);
        setLoading(false);
      },
      (err) => {
        toast.error("Failed to fetch transactions.", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
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
  }, [isAuthenticated, userEmail, fetchTotalBalance]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleMobileMoneyToggle = () => {
    setFormData((prev) => ({
      ...prev,
      isMobileMoney: !prev.isMobileMoney,
      account_number: "",
      bank_code: "",
    }));
  };

  const validateWithdrawalForm = (): boolean => {
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount greater than zero.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return false;
    }
    if (amount > totalBalance) {
      toast.error(
        `Amount cannot exceed your balance of ${totalBalance} ETB.`,
        {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        }
      );
      return false;
    }
    if (!formData.account_number?.trim()) {
      toast.error("Please enter a valid account number or phone number.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return false;
    }
    if (formData.isMobileMoney) {
      const phoneRegex = /^\+251(9|7)\d{8}$/;
      if (!phoneRegex.test(formData.account_number)) {
        toast.error(
          "Please enter a valid Ethiopian phone number (e.g., +2519XXXXXXXX or +2517XXXXXXXX).",
          {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          }
        );
        return false;
      }
    } else {
      if (!formData.account_number.match(/^\d{10,20}$/)) {
        toast.error("Please enter a valid bank account number (10-20 digits).", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        return false;
      }
    }
    if (!formData.account_name?.trim()) {
      toast.error("Please enter the account holder’s name.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return false;
    }
    if (!formData.account_name.match(/^[A-Za-z\s]+$/)) {
      toast.error("Account name must contain only letters and spaces.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return false;
    }
    if (!formData.isMobileMoney && !formData.bank_code) {
      toast.error("Please select a bank.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return false;
    }
    return true;
  };

  const validateDepositForm = (): boolean => {
    const newErrors: Errors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.firstName?.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (
      !formData.amount ||
      isNaN(Number(formData.amount)) ||
      Number(formData.amount) <= 0
    ) {
      newErrors.amount = "Please enter a valid amount";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateWithdrawalForm()) return;

    setLoading(true);
    try {
      const reference = generateReference();
      const canWithdraw = await checkSaleTicket(
        userEmail,
        Number(formData.amount),
        theme
      );
      if (!canWithdraw) {
        setLoading(false);
        return;
      }

      const newBalance = await updateBalanceInFirestore(
        userEmail,
        Number(formData.amount),
        theme
      );
      if (newBalance === false) {
        throw new Error("Balance update failed");
      }
      setTotalBalance(newBalance);

      try {
        await addDoc(collection(db, "transactions"), {
          type: "withdrawal",
          amount: Number(formData.amount),
          currency: formData.currency,
          account_number: formData.account_number,
          account_name: formData.account_name,
          bank_code: formData.isMobileMoney ? null : formData.bank_code,
          reference,
          userEmail,
          date: new Date().toISOString(),
          isMobileMoney: formData.isMobileMoney,
          payment_method: formData.isMobileMoney ? "telebirr" : "bank",
        });

        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle size={24} className="text-green-600" />
            <span>
              {formData.isMobileMoney
                ? `Withdrawal of ${formData.amount} ETB to Telebirr (${
                    formData.account_number
                  }) successful! New balance: ${newBalance.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 }
                  )} ETB.`
                : `Withdrawal of ${formData.amount} ETB to bank account successful! New balance: ${newBalance.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 }
                  )} ETB.`}
            </span>
          </div>,
          {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
            className: `${
              theme === "light"
                ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800"
                : "bg-gradient-to-r from-green-700 to-green-800 text-green-100"
            } font-semibold rounded-xl shadow-xl border ${
              theme === "light" ? "border-green-300" : "border-green-600"
            } p-4`,
            style: { minWidth: "300px", animation: "slideIn 0.3s ease-in-out" },
          }
        );
      } catch (firestoreError) {
        console.error(
          "Error recording transaction:",
          (firestoreError as Error).message
        );
        toast.warn(
          `Withdrawal of ${formData.amount} ETB successful, but failed to record in history. Contact support.`,
          {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          }
        );
      }

      setFormData({
        ...formData,
        amount: "",
        currency: "ETB",
        account_number: "",
        account_name: "",
        bank_code: "",
        isMobileMoney: false,
      });
    } catch (err) {
      const errorMessage = isTestMode
        ? `Test mode: Simulated withdrawal failure.`
        : `Failed to process withdrawal.`;
      toast.error(errorMessage, {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateDepositForm()) {
      setError("Please fill in all required fields correctly.");
      toast.error("Please fill in all required fields.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return;
    }

    if (!encryptionKey) {
      setError("Encryption key not available. Please try again.");
      toast.error("Encryption key not available.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return;
    }

    setLoading(true);
    setError("");

    const totalAmount = Number(formData.amount);
    const orderId = `TX-${Date.now()}`;
    const threePercentAmount = (totalAmount * 0.03).toFixed(2);

    const paymentData = {
      email: formData.email,
      amount: totalAmount.toString(),
      currency: "ETB",
      callback_url: `${window.location.origin}/api/payment/callback`,
      return_url: `${window.location.origin}/dashboard/deposit`,
      order_id: orderId,
      first_name: formData.firstName,
      last_name: formData.lastName,
    };

    try {
      const paymentDetails = {
        order_id: orderId,
        email: formData.email,
        amount: totalAmount.toString(),
        threePercentAmount: threePercentAmount,
        firstName: formData.firstName,
        lastName: formData.lastName,
        date: new Date().toISOString(),
      };

      const encryptedDetails = await encryptData(
        JSON.stringify(paymentDetails),
        encryptionKey
      );
      localStorage.setItem("order_id", orderId);
      localStorage.setItem("payment_details", encryptedDetails);
      const exportedKey = await crypto.subtle.exportKey("raw", encryptionKey);
      localStorage.setItem(
        "encryption_key",
        btoa(String.fromCharCode(...new Uint8Array(exportedKey)))
      );

      const res = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const data = await res.json();

      if (res.ok && data.data?.checkout_url) {
        try {
          await addDoc(collection(db, "transactions"), {
            type: "deposit",
            amount: totalAmount,
            currency: "ETB",
            account_number: formData.email,
            account_name: `${formData.firstName} ${formData.lastName}`,
            bank_code: null,
            reference: orderId,
            userEmail,
            date: new Date().toISOString(),
            isMobileMoney: false,
            payment_method: "chapa",
          });

          toast.success(
            `Deposit of ${formData.amount} ETB via Chapa initiated successfully!`,
            {
              position: "bottom-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === "light" ? "light" : "dark",
            }
          );
          window.location.href = data.data.checkout_url;
        } catch (firestoreError) {
          toast.warn(
            `Deposit of ${formData.amount} ETB initiated, but failed to record in history. Contact support.`,
            {
              position: "bottom-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === "light" ? "light" : "dark",
            }
          );
          window.location.href = data.data.checkout_url;
        }
      } else {
        setError(data.error || "Payment initialization failed");
        toast.error("Payment initialization failed.", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        localStorage.removeItem("order_id");
        localStorage.removeItem("payment_details");
        localStorage.removeItem("encryption_key");
      }
    } catch (error) {
      setError("An error occurred during payment initialization");
      toast.error("Payment initialization failed.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      localStorage.removeItem("order_id");
      localStorage.removeItem("payment_details");
      localStorage.removeItem("encryption_key");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/dashboard/finance?tab=${tab}`);
    setFormData({
      amount: "",
      currency: "ETB",
      account_number: "",
      account_name: "",
      bank_code: "",
      isMobileMoney: false,
      email: userEmail,
      firstName: "",
      lastName: "",
    });
    setErrors({});
    setError("");
  };

  const toggleBalanceVisibility = () => {
    setShowBalance((prev) => !prev);
  };

  const TabContent = () => {
    if (activeTab === "transaction") {
      return (
        <div className="mt-6">
          <h3
            className={`text-2xl font-bold mb-4 ${
              theme === "light" ? "text-gray-800" : "text-gray-100"
            }`}
          >
            Transaction History
          </h3>
          {loading ? (
            <div className="flex justify-center">
              <PuffLoader color="#36D7B7" size={60} />
            </div>
          ) : transactions.length === 0 ? (
            <p
              className={`text-center text-lg ${
                theme === "light" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              No transactions found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full text-left border-collapse ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                } rounded-lg shadow-md`}
              >
                <thead>
                  <tr
                    className={`${
                      theme === "light"
                        ? "bg-blue-100 text-gray-800"
                        : "bg-blue-900 text-gray-100"
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
                            ? theme === "light"
                              ? "bg-blue-50"
                              : "bg-gray-700"
                            : theme === "light"
                            ? "bg-white"
                            : "bg-gray-800"
                        } hover:${
                          theme === "light" ? "bg-blue-100" : "bg-gray-600"
                        } transition-colors`}
                      >
                        <td className="p-3 text-sm">
                          {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                        </td>
                        <td className="p-3 text-sm">
                          {txn.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          {txn.currency}
                        </td>
                        <td className="p-3 text-sm">
                          {new Date(txn.date).toLocaleString()}
                        </td>
                        <td className="p-3 text-sm">{txn.reference}</td>
                        <td className="p-3 text-sm">
                          {txn.isMobileMoney
                            ? `Phone: ${txn.account_number} (Telebirr)`
                            : txn.payment_method === "chapa"
                            ? `Email: ${txn.account_number} (Chapa)`
                            : `A/C: ${txn.account_number} (${
                                bank ? bank.name : "Unknown Bank"
                              })`}
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

    if (activeTab === "deposit") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-6 sm:p-8 rounded-2xl shadow-lg border max-w-md mx-auto ${
            theme === "light"
              ? "bg-gradient-to-br from-gray-100 to-indigo-200 border-indigo-300/20"
              : "bg-gradient-to-br from-gray-800 to-indigo-900 border-indigo-500/20"
          }`}
        >
          <h3
            className={`text-2xl font-bold mb-6 text-center ${
              theme === "light" ? "text-gray-800" : "text-gray-200"
            }`}
          >
            Deposit Funds
          </h3>
          <form id="deposit-form" onSubmit={handleDepositSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium mb-1 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    theme === "light" ? "bg-white" : "bg-gray-700 text-gray-200"
                  }`}
                  placeholder="Enter email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className={`block text-sm font-medium mb-1 ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  First Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  />
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName || ""}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.firstName ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      theme === "light" ? "bg-white" : "bg-gray-700 text-gray-200"
                    }`}
                    placeholder="First name"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className={`block text-sm font-medium mb-1 ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  Last Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  />
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName || ""}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.lastName ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      theme === "light" ? "bg-white" : "bg-gray-700 text-gray-200"
                    }`}
                    placeholder="Last name"
                  />
                </div>
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="amount"
                className={`block text-sm font-medium mb-1 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Amount (ETB)
              </label>
              <div className="relative">
                <CreditCard
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                />
                <input
                  id="amount"
                  type="number"
                  name="amount"
                  value={formData.amount || ""}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border ${
                    errors.amount ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    theme === "light" ? "bg-white" : "bg-gray-700 text-gray-200"
                  }`}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
            </div>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-6 p-4 rounded-lg flex items-center gap-2 ${
                  theme === "light" ? "bg-red-100 text-red-700" : "bg-red-900 text-red-200"
                }`}
              >
                <X className="w-5 h-5" />
                {error}
                <button
                  onClick={() => setError("")}
                  className={`ml-auto p-1 rounded-full ${
                    theme === "light" ? "hover:bg-red-200" : "hover:bg-red-800"
                  }`}
                  aria-label="Close error message"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <motion.button
              type="submit"
              form="deposit-form"
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 rounded-lg transition-all w-full max-w-md mx-auto ${
                loading
                  ? "border-gray-400 text-gray-400 cursor-not-allowed"
                  : `border-[#4e3dea] hover:bg-[#4e3dea] ${
                      theme === "light" ? "text-[#4e3dea] hover:text-white" : "text-white hover:text-white"
                    }`
              }`}
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
              aria-label={loading ? "Processing payment" : "Pay now"}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay Now
                  <CreditCard className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </motion.div>

          <div className="mt-4 text-center max-w-md mx-auto">
            <p
              className={`text-sm font-medium ${
                theme === "light" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              Secured by Chapa Payment Gateway
            </p>
            <p
              className={`text-xs mt-1 ${
                theme === "light" ? "text-gray-500" : "text-gray-500"
              }`}
            >
              You will be redirected to complete your payment
            </p>
          </div>
        </motion.div>
      );
    }

    return (
      <form onSubmit={handleWithdrawalSubmit} className="mt-6">
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-1 ${
              theme === "light" ? "text-gray-700" : "text-gray-300"
            }`}
          >
            Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount || ""}
            onChange={handleChange}
            className={`w-full p-2 border rounded-lg ${
              theme === "light" ? "bg-white text-gray-800" : "bg-gray-700 text-gray-100"
            }`}
            required
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
          />
          {formData.amount && Number(formData.amount) > totalBalance && (
            <p className="text-red-600 text-sm mt-1">
              Amount exceeds your balance of {totalBalance} ETB.
            </p>
          )}
        </div>
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-1 ${
              theme === "light" ? "text-gray-700" : "text-gray-300"
            }`}
          >
            Currency
          </label>
          <select
            name="currency"
            value={formData.currency || "ETB"}
            onChange={handleChange}
            className={`w-full p-2 border rounded-lg ${
              theme === "light" ? "bg-white text-gray-800" : "bg-gray-700 text-gray-100"
            }`}
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
              checked={formData.isMobileMoney || false}
              onChange={handleMobileMoneyToggle}
              className="mr-2"
            />
            <span
              className={`${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Mobile Money (Telebirr)
            </span>
          </label>
        </div>
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-1 ${
              theme === "light" ? "text-gray-700" : "text-gray-300"
            }`}
          >
            {formData.isMobileMoney ? "Phone Number" : "Account Number"}
          </label>
          <input
            type="text"
            name="account_number"
            value={formData.account_number || ""}
            onChange={handleChange}
            className={`w-full p-2 border rounded-lg ${
              theme === "light" ? "bg-white text-gray-800" : "bg-gray-700 text-gray-100"
            }`}
            required
            placeholder={
              formData.isMobileMoney ? "e.g., +2519XXXXXXXX" : "e.g., 1234567890"
            }
          />
        </div>
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-1 ${
              theme === "light" ? "text-gray-700" : "text-gray-300"
            }`}
          >
            Account Name
          </label>
          <input
            type="text"
            name="account_name"
            value={formData.account_name || ""}
            onChange={handleChange}
            className={`w-full p-2 border rounded-lg ${
              theme === "light" ? "bg-white text-gray-800" : "bg-gray-700 text-gray-100"
            }`}
            required
            placeholder="Enter account holder's name"
          />
        </div>
        {!formData.isMobileMoney && (
          <div className="mb-4">
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Bank
            </label>
            <select
              name="bank_code"
              value={formData.bank_code || ""}
              onChange={handleChange}
              className={`w-full p-2 border rounded-lg ${
                theme === "light" ? "bg-white text-gray-800" : "bg-gray-700 text-gray-100"
              }`}
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
          disabled={
            loading ||
            (formData.amount && Number(formData.amount) > totalBalance)
          }
          className={`w-full p-2 rounded-lg ${
            loading || (formData.amount && Number(formData.amount) > totalBalance)
              ? "bg-gray-400 cursor-not-allowed"
              : theme === "light"
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {loading ? "Processing..." : "Withdraw"}
        </button>
      </form>
    );
  };

  if (isPending) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "light" ? "bg-zinc-50" : "bg-gray-900"
        } ${contentMargin} transition-all duration-300`}
      >
        <motion.div
          className="text-center px-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Request Pending
          </motion.h1>
          <motion.p
            className={`mt-4 text-lg sm:text-xl ${
              theme === "light" ? "text-gray-700" : "text-gray-300"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            Your request is being processed. Please wait a few days.
          </motion.p>
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            <div className="flex justify-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 border-4 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p
              className={`mt-4 ${
                theme === "light" ? "text-gray-600" : "text-gray-400"
              } text-sm sm:text-base`}
            >
              We appreciate your patience!
            </p>
          </motion.div>
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
          theme={theme === "light" ? "light" : "dark"}
        />
      </div>
    );
  }

  if (loading || !isAuthenticated || userRole !== "owner") {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
        } ${contentMargin} transition-all duration-300`}
      >
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader
            color={theme === "light" ? "#3b82f6" : "#FFFFFF"}
            size={100}
          />
          <motion.p
            className={`mt-4 text-2xl font-bold ${
              theme === "light" ? "text-zinc-700" : "text-zinc-300"
            }`}
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
          theme={theme === "light" ? "light" : "dark"}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
      } ${contentMargin} transition-all duration-300`}
    >
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
        theme={theme === "light" ? "light" : "dark"}
      />

      <div className={`sticky top-0 z-50 ${
          theme === "light"
            ? "bg-gradient-to-br from-zinc-100 to-zinc-200"
            : "bg-gradient-to-br from-gray-800 to-gray-900"
        } border-b ${theme === "light" ? "border-zinc-200" : "border-zinc-700"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                theme === "light"
                  ? "text-purple-700 hover:bg-purple-100"
                  : "text-purple-300 hover:bg-purple-800"
              } transition-colors`}
            >
              <FaArrowLeft className="h-5 w-5" />
              <span className="text-lg font-medium">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <p
                className={`text-2xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-gray-100"
                }`}
              >
                Balance:{" "}
                {showBalance
                  ? `${totalBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })} ETB`
                  : "••••••"}
              </p>
              <button
                onClick={toggleBalanceVisibility}
                className={`p-2 rounded-full ${
                  theme === "light"
                    ? "text-gray-600 hover:bg-gray-200"
                    : "text-gray-300 hover:bg-gray-700"
                } transition-colors duration-200`}
                aria-label={showBalance ? "Hide balance" : "Show balance"}
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
              { id: "withdraw", label: "Withdraw", icon: <ArrowDownCircle size={20} /> },
              { id: "deposit", label: "Deposit", icon: <ArrowUpCircle size={20} /> },
              {
                id: "transaction",
                label: "Transactions",
                icon: <DollarSign size={20} />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  activeTab === tab.id
                    ? theme === "light"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div
            className={`p-6 rounded-2xl shadow-xl ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-50 to-purple-50"
                : "bg-gradient-to-br from-gray-800 to-gray-900"
            }`}
          >
            {TabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}