"use client";

import { useEffect, useState, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase-client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { User, Lock, LogOut, Eye, EyeOff, X } from "lucide-react";
import { PuffLoader } from "react-spinners";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { FaArrowLeft } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// TypeScript interfaces
interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
}

interface ChangePasswordResponse {
  message?: string;
  error?: string;
}

export default function Profile() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [ownerData, setOwnerData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [passwordSuccess, setPasswordSuccess] = useState<string>("");
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const router = useRouter();
  const { theme = "light" } = useContext(ThemeContext);

  // Password requirements for UI
  const passwordRequirements = useMemo(
    () => [
      { id: 1, text: "8+ characters", valid: newPassword.length >= 8 },
      { id: 2, text: "Uppercase letter", valid: /(?=.*[A-Z])/.test(newPassword) },
      { id: 3, text: "Lowercase letter", valid: /(?=.*[a-z])/.test(newPassword) },
      { id: 4, text: "Number", valid: /(?=.*[0-9])/.test(newPassword) },
      { id: 5, text: "Special character", valid: /(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword) },
    ],
    [newPassword]
  );

  // Fetch user email and role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Unauthorized access. Please log in.");
        }

        const data = await response.json();
        if (data.email && data.role === "owner") {
          setUserEmail(data.email);
          setUserRole(data.role);
        } else {
          throw new Error(data.role !== "owner" ? "User is not an owner." : "No email found.");
        }
      } catch (error) {
        toast.error(error.message || "Authentication failed.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        setTimeout(() => router.replace("/login"), 3500);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, theme]);

  // Fetch owner data from Firestore
  useEffect(() => {
    if (userEmail && userRole === "owner") {
      const fetchOwnerData = async () => {
        setLoading(true);
        try {
          const q = query(collection(db, "owner"), where("email", "==", userEmail));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const ownerDoc = querySnapshot.docs[0].data() as UserData;
            setOwnerData(ownerDoc);
          } else {
            toast.error("No owner found with the provided email.", {
              position: "top-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === "light" ? "light" : "dark",
            });
          }
        } catch (error) {
          toast.error("Failed to load owner data.", {
            position: "top-right",
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

      fetchOwnerData();
    }
  }, [userEmail, userRole, theme]);

  // Validate password
  const validatePassword = () => {
    if (!newPassword) return "New password is required";
    if (newPassword.length < 8) return "Password must be at least 8 characters";
    if (!/(?=.*[A-Z])/.test(newPassword)) return "Requires an uppercase letter";
    if (!/(?=.*[a-z])/.test(newPassword)) return "Requires a lowercase letter";
    if (!/(?=.*[0-9])/.test(newPassword)) return "Requires a number";
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword)) return "Requires a special character";
    if (newPassword !== confirmPassword) return "Passwords do not match";
    return "";
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordLoading(true);

    if (!currentPassword) {
      setPasswordError("Current password is required");
      toast.error("Current password is required", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      setPasswordLoading(false);
      return;
    }

    const passwordValidationError = validatePassword();
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      toast.error(passwordValidationError, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: userEmail, currentPassword, newPassword }),
      });

      const data: ChangePasswordResponse = await response.json();

      if (response.ok) {
        setPasswordSuccess(data.message || "Password updated successfully!");
        toast.success(data.message || "Password updated successfully!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setPasswordError(data.error || "Failed to update password");
        toast.error(data.error || "Failed to update password", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
      }
    } catch (error) {
      setPasswordError("An error occurred. Please try again.");
      toast.error("An error occurred. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        toast.success("Logged out successfully!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        router.push("/login");
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      toast.error("Failed to log out. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    }
  };

  // Loading state
  if (loading || !userEmail || !userRole) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#3b82f6" size={60} />
          <motion.p
            className={`mt-4 text-base font-bold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Loading profile...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // If no owner data, don't render content (user will be redirected)
  if (!ownerData) {
    return null;
  }

  const fullName = `${ownerData.firstName || ""} ${ownerData.lastName || ""}`.trim();

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
      <ToastContainer
        position="top-right"
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

      {/* Navigation Header */}
      <div
        className={`sticky top-0 z-50 w-full ${
          theme === "light" ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-gradient-to-br from-gray-800 to-gray-900"
        } border-b ${theme === "light" ? "border-zinc-200" : "border-zinc-700"}`}
      >
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                theme === "light" ? "text-purple-700 hover:bg-purple-100" : "text-purple-300 hover:bg-purple-800"
              } transition-colors`}
              aria-label="Back"
            >
              <FaArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 pt-16 sm:p-6">
        <motion.div
          className={`w-full max-w-md rounded-2xl shadow-lg overflow-hidden ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-50 to-purple-50"
              : "bg-gradient-to-br from-gray-800 to-gray-900"
          } sm:max-w-lg`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-4 sm:p-6">
            {/* Profile Icon */}
            <div className="flex justify-center mb-4">
              <motion.div
                className={`relative w-16 h-16 rounded-full overflow-hidden border-4 ${
                  theme === "light" ? "border-zinc-200" : "border-zinc-700"
                } sm:w-20 sm:h-20`}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <User size={32} className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-full h-full p-2`} />
              </motion.div>
            </div>

            {/* Profile Heading */}
            <h2 className={`text-lg font-bold text-center ${theme === "light" ? "text-zinc-800" : "text-zinc-100"} mb-4 sm:text-xl`}>
              My Account
            </h2>

            {/* Displaying Owner Data */}
            <div className="space-y-3">
              <motion.div
                className={`p-3 rounded-xl shadow-sm ${
                  theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <p className={`text-sm ${theme === "light" ? "text-zinc-700" : "text-zinc-200"} sm:text-base`}>
                  <span className="font-semibold">Name:</span> {fullName}
                </p>
              </motion.div>
              <motion.div
                className={`p-3 rounded-xl shadow-sm ${
                  theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <p className={`text-sm ${theme === "light" ? "text-zinc-700" : "text-zinc-200"} sm:text-base`}>
                  <span className="font-semibold">Email:</span> {ownerData.email}
                </p>
              </motion.div>
              <motion.div
                className={`p-3 rounded-xl shadow-sm ${
                  theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <p className={`text-sm ${theme === "light" ? "text-zinc-700" : "text-zinc-200"} sm:text-base`}>
                  <span className="font-semibold">Phone:</span> {ownerData.phoneNumber}
                </p>
              </motion.div>
              <motion.div
                className={`p-3 rounded-xl shadow-sm ${
                  theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <p className={`text-sm ${theme === "light" ? "text-zinc-700" : "text-zinc-200"} sm:text-base`}>
                  <span className="font-semibold">Address:</span> {ownerData.location}
                </p>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <motion.button
                onClick={() => setIsModalOpen(true)}
                aria-label="Change password"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-transparent border-2 border-[#4e3dea] rounded-lg transition-all hover:bg-[#4e3dea] text-sm ${
                  theme === "light" ? "text-[#4e3dea] hover:text-white" : "text-white hover:text-white"
                } sm:text-base`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Lock size={16} />
                Change Password
              </motion.button>
              <motion.button
                onClick={handleLogout}
                aria-label="Log out"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-transparent border-2 border-[#f73939] rounded-lg transition-all hover:bg-[#f73939] text-sm ${
                  theme === "light" ? "text-[#f73939] hover:text-white" : "text-white hover:text-white"
                } sm:text-base`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut size={16} />
                Logout
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-11/12 max-w-md rounded-2xl shadow-lg overflow-hidden ${
                theme === "light"
                  ? "bg-gradient-to-br from-blue-50 to-purple-50"
                  : "bg-gradient-to-br from-gray-800 to-gray-900"
              } sm:max-w-lg`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 sm:p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"} sm:text-xl`}>
                    Change Password
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className={`p-2 rounded-full transition-colors ${
                      theme === "light" ? "text-zinc-600 hover:bg-zinc-200" : "text-zinc-400 hover:bg-zinc-700"
                    }`}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Password Change Form */}
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <AnimatePresence>
                    {passwordError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-3 rounded-lg bg-red-100 text-red-700 text-center text-sm sm:text-base"
                      >
                        {passwordError}
                      </motion.p>
                    )}
                    {passwordSuccess && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 text-green-600 text-center text-sm sm:text-base"
                      >
                        {passwordSuccess}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Current Password */}
                  <motion.div
                    className={`p-3 rounded-xl shadow-sm ${
                      theme === "light"
                        ? "bg-gradient-to-br from-blue-100 to-purple-100"
                        : "bg-gradient-to-br from-gray-700 to-gray-800"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <label
                      htmlFor="currentPassword"
                      className={`block text-sm font-medium ${
                        theme === "light" ? "text-zinc-700" : "text-zinc-300"
                      } mb-1 sm:text-base`}
                    >
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                        className={`w-full p-2 pr-10 border ${
                          theme === "light" ? "border-zinc-200" : "border-zinc-700"
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          theme === "light" ? "bg-white" : "bg-gray-800"
                        } text-sm sm:text-base`}
                        placeholder="Enter current password"
                        required
                        aria-label="Current Password"
                      />
                      <div
                        className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-4 h-4`} />
                        ) : (
                          <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-4 h-4`} />
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* New Password */}
                  <motion.div
                    className={`p-3 rounded-xl shadow-sm ${
                      theme === "light"
                        ? "bg-gradient-to-br from-blue-100 to-purple-100"
                        : "bg-gradient-to-br from-gray-700 to-gray-800"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <label
                      htmlFor="newPassword"
                      className={`block text-sm font-medium ${
                        theme === "light" ? "text-zinc-700" : "text-zinc-300"
                      } mb-1 sm:text-base`}
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                        className={`w-full p-2 pr-10 border ${
                          theme === "light" ? "border-zinc-200" : "border-zinc-700"
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          theme === "light" ? "bg-white" : "bg-gray-800"
                        } text-sm sm:text-base`}
                        placeholder="Enter new password"
                        required
                        aria-label="New Password"
                      />
                      <div
                        className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-4 h-4`} />
                        ) : (
                          <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-4 h-4`} />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
                      {passwordRequirements.map((req) => (
                        <div key={req.id} className="flex items-center text-xs sm:text-sm">
                          <span
                            className={`w-3 h-3 rounded-full mr-1 flex items-center justify-center ${
                              req.valid
                                ? theme === "light"
                                  ? "bg-green-500"
                                  : "bg-green-400"
                                : theme === "light"
                                ? "bg-gray-300"
                                : "bg-gray-600"
                            }`}
                          >
                            {req.valid && <span className="text-white text-[10px]">✔</span>}
                          </span>
                          <span
                            className={
                              req.valid
                                ? theme === "light"
                                  ? "text-green-600"
                                  : "text-green-400"
                                : theme === "light"
                                ? "text-gray-600"
                                : "text-gray-400"
                            }
                          >
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Confirm New Password */}
                  <motion.div
                    className={`p-3 rounded-xl shadow-sm ${
                      theme === "light"
                        ? "bg-gradient-to-br from-blue-100 to-purple-100"
                        : "bg-gradient-to-br from-gray-700 to-gray-800"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  >
                    <label
                      htmlFor="confirmPassword"
                      className={`block text-sm font-medium ${
                        theme === "light" ? "text-zinc-700" : "text-zinc-300"
                      } mb-1 sm:text-base`}
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                        className={`w-full p-2 pr-10 border ${
                          theme === "light" ? "border-zinc-200" : "border-zinc-700"
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          theme === "light" ? "bg-white" : "bg-gray-800"
                        } text-sm sm:text-base`}
                        placeholder="Confirm new password"
                        required
                        aria-label="Confirm New Password"
                      />
                      <div
                        className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-4 h-4`} />
                        ) : (
                          <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-4 h-4`} />
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <motion.button
                      type="submit"
                      disabled={passwordLoading}
                      className={`px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm sm:text-base ${
                        passwordLoading ? "opacity-50 cursor-not-allowed" : ""
                      } sm:flex-1`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {passwordLoading ? "Updating..." : "Change Password"}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className={`px-4 py-2 bg-transparent border-2 border-zinc-500 text-zinc-500 font-medium rounded-lg hover:bg-zinc-500 hover:text-white transition-all text-sm sm:text-base sm:flex-1`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}