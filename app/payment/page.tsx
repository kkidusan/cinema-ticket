"use client";

import { useState, useEffect, useContext } from "react";
import { Mail, User, Loader2, CreditCard, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

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

// Types
interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  amount: string;
}

interface Errors {
  email?: string;
  firstName?: string;
  lastName?: string;
  amount?: string;
}

interface PaymentFormProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export default function PaymentForm({ isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapse }: PaymentFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    amount: "",
  });
  const [isClient, setIsClient] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const { theme = "light" } = useContext(ThemeContext) || {};

  // Compute content margin based on sidebar state
  const contentMargin = isSidebarOpen ? (isCollapsed ? "lg:ml-24" : "lg:ml-64") : "ml-0";

  useEffect(() => {
    setIsClient(true);
    generateKey().then((key) => setEncryptionKey(key));
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Errors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fill in all required fields correctly.");
      setTimeout(() => toast.error("Please fill in all required fields."), 0);
      return;
    }

    if (!encryptionKey) {
      setError("Encryption key not available. Please try again.");
      setTimeout(() => toast.error("Encryption key not available."), 0);
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
      return_url: `${window.location.origin}/payment/deposit`,
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

      const encryptedDetails = await encryptData(JSON.stringify(paymentDetails), encryptionKey);
      localStorage.setItem("order_id", orderId);
      localStorage.setItem("payment_details", encryptedDetails);
      const exportedKey = await crypto.subtle.exportKey("raw", encryptionKey);
      localStorage.setItem("encryption_key", btoa(String.fromCharCode(...new Uint8Array(exportedKey))));

      const res = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const data = await res.json();

      if (res.ok && data.data?.checkout_url) {
        window.location.href = data.data.checkout_url;
      } else {
        setError(data.error || "Payment initialization failed");
        setTimeout(() => toast.error("Payment initialization failed."), 0);
        localStorage.removeItem("order_id");
        localStorage.removeItem("payment_details");
        localStorage.removeItem("encryption_key");
      }
    } catch (error) {
      setError("An error occurred during payment initialization");
      setTimeout(() => toast.error("Payment initialization failed."), 0);
      localStorage.removeItem("order_id");
      localStorage.removeItem("payment_details");
      localStorage.removeItem("encryption_key");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={`min-h-screen flex flex-col items-center w-full ${
        theme === "light" ? "bg-zinc-100" : "bg-gray-900"
      } m-0 p-0`}
    >
      <div
        className={`sticky top-0 z-50 w-full ${
          theme === "light" ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-gradient-to-br from-gray-800 to-gray-900"
        } border-b ${theme === "light" ? "border-zinc-200" : "border-zinc-700"} ${contentMargin} transition-all duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back() || router.push("/movies")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                theme === "light" ? "text-purple-700 hover:bg-purple-100" : "text-purple-300 hover:bg-purple-800"
              } transition-colors`}
              aria-label="Go back"
            >
              <FaArrowLeft className="h-5 w-5" />
              <span className="text-lg font-medium">Back</span>
            </button>
            <h1
              className={`text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r ${
                theme === "light" ? "from-purple-500 to-indigo-500" : "from-purple-300 to-indigo-300"
              } truncate max-w-[70%]`}
            >
              Book Tickets
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`mt-24 w-full max-w-4xl ${contentMargin} transition-all duration-300 px-4 sm:px-6 lg:px-8 py-6`}
      >
        <div
          className={`p-6 sm:p-8 rounded-2xl shadow-lg border ${
            theme === "light"
              ? "bg-gradient-to-br from-gray-100 to-indigo-200 border-indigo-300/20"
              : "bg-gradient-to-br from-gray-800 to-indigo-900 border-indigo-500/20"
          }`}
        >
          <h1
            className={`text-xl sm:text-2xl md:text-3xl font-bold mb-6 text-center ${
              theme === "light" ? "text-gray-800" : "text-gray-200"
            }`}
          >
            Book Your Movie Tickets
          </h1>

          {loading && (
            <div className="flex justify-center items-center h-64">
              <motion.div
                className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-b-4 border-indigo-500"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity }}
              ></motion.div>
            </div>
          )}

          {isClient && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`p-6 sm:p-8 rounded-2xl shadow-lg border ${
                theme === "light"
                  ? "bg-gradient-to-br from-gray-100 to-indigo-200 border-indigo-300/20"
                  : "bg-gradient-to-br from-gray-800 to-indigo-900 border-indigo-500/20"
              } max-w-md mx-auto`}
            >
              <form id="payment-form" onSubmit={handlePayment} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className={`block text-sm font-medium mb-1 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-2 border ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                        theme === "light" ? "bg-white" : "bg-gray-700 text-gray-200"
                      }`}
                      placeholder="Enter email"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className={`block text-sm font-medium mb-1 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}
                    >
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2 border ${
                          errors.firstName ? "border-red-500" : "border-gray-300"
                        } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                          theme === "light" ? "bg-white" : "bg-gray-700 text-gray-200"
                        }`}
                        placeholder="First name"
                      />
                    </div>
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className={`block text-sm font-medium mb-1 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}
                    >
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2 border ${
                          errors.lastName ? "border-red-500" : "border-gray-300"
                        } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                          theme === "light" ? "bg-white" : "bg-gray-700 text-gray-200"
                        }`}
                        placeholder="Last name"
                      />
                    </div>
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="amount"
                    className={`block text-sm font-medium mb-1 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}
                  >
                    Amount (ETB)
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="amount"
                      type="number"
                      name="amount"
                      value={formData.amount}
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
                  {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
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
                  form="payment-form"
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
                <p className={`text-sm font-medium ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                  Secured by Chapa Payment Gateway
                </p>
                <p className={`text-xs mt-1 ${theme === "light" ? "text-gray-500" : "text-gray-500"}`}>
                  You will be redirected to complete your payment
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.section>
    </main>
  );
}