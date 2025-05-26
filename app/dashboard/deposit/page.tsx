"use client";

import { useState, useEffect, useContext } from "react";
import { X, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { db } from "../../lib/firebase-client";
import { collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";
import Dashboard from "../page";

// Encryption utilities
const decoder = new TextDecoder();

async function importKey(rawKey) {
  const keyBuffer = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );
}

async function decryptData(encryptedData, key) {
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    data
  );
  return decoder.decode(decrypted);
}

export default function Meeting({ isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapse }) {
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [userData, setUserData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const router = useRouter();
  const { theme = "light" } = useContext(ThemeContext) || {};

  const contentMargin = isSidebarOpen ? (isCollapsed ? "lg:ml-24" : "lg:ml-64") : "ml-0";

  // Authentication check
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Please log in to continue.");
            setIsAuthenticated(false);
            router.replace("/login");
            return;
          }
          throw new Error("Failed to validate user");
        }

        const data = await response.json();
        if (!data.email) {
          toast.error("Authentication failed. Please log in.");
          setIsAuthenticated(false);
          router.replace("/login");
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        if (error.message !== "Unauthorized") {
          console.error("Authentication error:", error);
        }
        toast.error("Authentication failed. Please log in.");
        setIsAuthenticated(false);
        router.replace("/login");
      }
    };

    fetchUser();
  }, [router]);

  // Fetch payment details and update Firestore
  useEffect(() => {
    if (isAuthenticated !== true) return;

    const fetchPaymentStatus = async () => {
      try {
        const txId = localStorage.getItem("order_id");
        const encryptedDetails = localStorage.getItem("payment_details");
        const rawKey = localStorage.getItem("encryption_key");

        const missingItems = [];
        if (!txId) missingItems.push("order_id");
        if (!encryptedDetails) missingItems.push("payment_details");
        if (!rawKey) missingItems.push("encryption_key");

        if (missingItems.length > 0) {
          setErrorMessage(`Missing required data: ${missingItems.join(", ")}`);
          setPaymentStatus("failed");
          setTimeout(() => router.push("/dashboard/finance"), 3000);
          return;
        }

        setOrderId(txId);

        const key = await importKey(rawKey);
        const decryptedDetails = await decryptData(encryptedDetails, key);
        const paymentDetails = JSON.parse(decryptedDetails);

        if (!paymentDetails) {
          setErrorMessage("Invalid payment details. Please try again.");
          setPaymentStatus("failed");
          setTimeout(() => router.push("/dashboard/finance"), 3000);
          return;
        }

        setUserData(paymentDetails);
        setPaymentStatus("success");

        // Update Firestore: Subtract 3% from amount and update totalAmount
        try {
          const amount = parseFloat(paymentDetails.amount);
          if (isNaN(amount)) {
            throw new Error("Invalid amount format");
          }

          // Subtract 3% from the amount
          const adjustedAmount = amount * 0.97; // 100% - 3% = 97%

          const ownerAmountRef = collection(db, "ownerAmount");
          const q = query(ownerAmountRef, where("movieEmail", "==", paymentDetails.email));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            console.warn(`No document found with movieEmail: ${paymentDetails.email}`);
            return;
          }

          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, {
            totalAmount: increment(adjustedAmount),
          });
        } catch (firestoreError) {
          console.error("Error updating Firestore:", firestoreError);
          toast.error("Payment recorded, but failed to update total amount. Contact support.");
        }
      } catch (error) {
        console.error("Error fetching payment status:", error);
        setErrorMessage("An error occurred while processing your payment. Please try again.");
        setPaymentStatus("failed");
        setTimeout(() => router.push("/dashboard/finance"), 3000);
      } finally {
        localStorage.removeItem("order_id");
        localStorage.removeItem("payment_details");
        localStorage.removeItem("encryption_key");
      }
    };

    fetchPaymentStatus();
  }, [router, isAuthenticated]);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (isAuthenticated === null || paymentStatus === "pending") {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "light" ? "bg-zinc-100" : "bg-gray-900"
        } ${contentMargin}`}
      >
        <motion.div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      </div>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          theme === "light" ? "bg-zinc-100" : "bg-gray-900"
        } ${contentMargin}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`p-8 rounded-2xl shadow-lg border max-w-md w-full text-center ${
            theme === "light"
              ? "bg-gradient-to-br from-gray-100 to-indigo-200 border-indigo-300/20"
              : "bg-gradient-to-br from-gray-800 to-indigo-900 border-indigo-500/20"
          }`}
        >
          <AlertCircle
            className={`w-16 h-16 ${theme === "light" ? "text-red-500" : "text-red-400"} mx-auto mb-4`}
          />
          <h2
            className={`text-2xl font-bold ${theme === "light" ? "text-gray-800" : "text-gray-200"} mb-4`}
          >
            Payment Failed
          </h2>
          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"} mb-6`}>
            {errorMessage || "There was an issue with your payment. Please try again."}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/dashboard/finance")}
            className={`flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 rounded-lg transition-all w-full ${
              theme === "light"
                ? "border-[#4e3dea] text-[#4e3dea] hover:bg-[#4e3dea] hover:text-white"
                : "border-[#4e3dea] text-white hover:bg-[#4e3dea] hover:text-white"
            }`}
            aria-label="Return to payment"
          >
            Return to Payment
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setErrorMessage("")}
            className={`mt-4 p-2 rounded-full ${theme === "light" ? "hover:bg-red-200" : "hover:bg-red-800"}`}
            aria-label="Close error message"
          >
            <X className={`w-5 h-5 ${theme === "light" ? "text-red-700" : "text-red-200"}`} />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <main
      className={`min-h-screen w-full ${theme === "light" ? "bg-zinc-100" : "bg-gray-900"} m-0 p-0 ${contentMargin}`}
    >
      <div
        className={`sticky top-0 z-50 w-full ${
          theme === "light" ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-gradient-to-br from-gray-800 to-gray-900"
        } border-b ${theme === "light" ? "border-zinc-200" : "border-zinc-700"} transition-all duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back() || router.push("/dashboard/finance")}
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
              Payment Confirmation
            </h1>
            <div className="ww-10" />
          </div>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-12 px-4 sm:px-6 lg:px-8"
      >
        <div
          className={`max-w-2xl mx-auto p-8 rounded-2xl shadow-lg border relative ${
            theme === "light"
              ? "bg-gradient-to-br from-gray-100 to-indigo-200 border-indigo-300/20"
              : "bg-gradient-to-br from-gray-800 to-indigo-900 border-indigo-500/20"
          }`}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/dashboard/finance")}
            className={`absolute top-4 right-4 p-2 rounded-full ${
              theme === "light" ? "hover:bg-gray-200" : "hover:bg-gray-700"
            } transition-colors`}
            aria-label="Close"
          >
            <X className={`w-6 h-6 ${theme === "light" ? "text-gray-500" : "text-gray-400"}`} />
          </motion.button>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div
              className={`rounded-lg p-4 mb-8 ${
                theme === "light" ? "bg-green-100 text-green-700" : "bg-green-900 text-green-200"
              }`}
            >
              <p className="text-center font-medium">
                Payment Successful! Amount Paid: {userData?.amount} ETB
              </p>
            </div>

            <div 
        className={`p-6 rounded-2xl shadow-lg mb-6 ${
                theme === "light"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600"
                  : "bg-gradient-to-r from-indigo-700 to-purple-700"
              } text-white`}
            >
              <h2 className="text-2xl font-bold mb-4">Payment Details</h2>
              <div className="space-y-4">
                <p className="text-lg">Name: {userData?.firstName} {userData?.lastName}</p>
                <p className="text-lg">Email: {userData?.email}</p>
                <p className="text-lg">Amount: {userData?.amount} ETB</p>
                <p className="text-lg">Date: {userData?.date}</p>
              </div>
            </div>

            <div
              className={`mt-6 p-4 rounded-2xl border ${
                theme === "light"
                  ? "bg-gray-100 border-indigo-300/20"
                  : "bg-gray-800 border-indigo-500/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-lg ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  <span className="font-medium">Transaction ID:</span> {orderId}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyOrderId}
                  className={`p-2 rounded-full ${
                    theme === "light" ? "hover:bg-gray-200" : "hover:bg-gray-700"
                  } transition-colors`}
                  aria-label="Copy transaction ID"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <CheckCircle
                          className={`w-5 h-5 ${theme === "light" ? "text-green-500" : "text-green-400"}`}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy
                          className={`w-5 h-5 ${theme === "light" ? "text-indigo-500" : "text-indigo-400"}`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            <motion.div
              className="text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/dashboard/finance")}
                className={`flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 rounded-lg transition-all w-full ${
                  theme === "light"
                    ? "border-[#4e3dea] text-[#4e3dea] hover:bg-[#4e3dea] hover:text-white"
                    : "border-[#4e3dea] text-white hover:bg-[#4e3dea] hover:text-white"
                }`}
                aria-label="View profile"
              >
                Successful!
                <CheckCircle className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </main>
  );
}