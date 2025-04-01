"use client";
import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { db } from "../../firebaseconfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { User, Lock, LogOut, Eye, EyeOff, X } from "lucide-react";
import { PuffLoader } from "react-spinners";
import { motion } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { FaArrowLeft } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Profile() {
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  // Initialize Firebase Auth
  const auth = getAuth();

  // Fetch user email, role, and validate authentication
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) throw new Error("Unauthorized");

        const data = await response.json();
        if (data.email && data.role) {
          setUserEmail(data.email);
          setUserRole(data.role);

          // Redirect if the user is not an owner
          if (data.role !== "owner") {
            router.replace("/unauthorized");
            return;
          }
        } else {
          throw new Error("No email or role found");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Fetch owner data from Firestore when userEmail changes
  useEffect(() => {
    if (userEmail && userRole === "owner") {
      const fetchOwnerData = async () => {
        try {
          const q = query(collection(db, "owner"), where("email", "==", userEmail));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const ownerDoc = querySnapshot.docs[0].data();
            setOwnerData(ownerDoc);
          } else {
            console.log("No owner found with email:", userEmail);
          }
        } catch (error) {
          console.error("Error fetching owner data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchOwnerData();
    }
  }, [userEmail, userRole]);

  // Validate password function
  const validatePassword = (password) => {
    const errorMessages = [];
    if (password.length < 8) errorMessages.push("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(password)) errorMessages.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errorMessages.push("Password must contain at least one lowercase letter");
    if (!/[0-9]/.test(password)) errorMessages.push("Password must contain at least one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errorMessages.push("Password must contain at least one special character");
    return errorMessages;
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccess("");

    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      validationErrors.forEach((error) => toast.error(error));
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("User is not authenticated. Please log in again.");
      router.push("/login");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setIsModalOpen(false); // Close the modal after successful password change
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully!");
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  // Loading Spinner
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#3b82f6" size={100} />
          <motion.p
            className={`mt-4 text-2xl font-bold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}
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

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
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
        theme={theme === "light" ? "light" : "dark"}
      />
      
      {/* Navigation Header with zinc-100 gradient */}
      <div className={`sticky top-0 z-50 ${theme === "light" ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-gradient-to-br from-gray-800 to-gray-900"} border-b ${theme === "light" ? "border-zinc-200" : "border-zinc-700"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === "light" ? "text-purple-700 hover:bg-purple-100" : "text-purple-300 hover:bg-purple-800"} transition-colors`}
            >
              <FaArrowLeft className="h-5 w-5" />
              <span className="text-lg font-medium">Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 pt-24"> {/* Added pt-24 to account for fixed header */}
        <motion.div
          className={`w-full max-w-md rounded-2xl shadow-lg overflow-hidden ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-50 to-purple-50"
              : "bg-gradient-to-br from-gray-800 to-gray-900"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-6">
            {/* Profile Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                className={`relative w-24 h-24 rounded-full overflow-hidden border-4 ${
                  theme === "light" ? "border-zinc-200" : "border-zinc-700"
                }`}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <User size={72} className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-full h-full p-2`} />
              </motion.div>
            </div>

            {/* Profile Heading */}
            <h2 className={`text-2xl font-bold text-center ${theme === "light" ? "text-zinc-800" : "text-zinc-100"} mb-6`}>
              My Account
            </h2>

            {/* Displaying Owner Data */}
            {ownerData ? (
              <div className="space-y-4">
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <p className={theme === "light" ? "text-zinc-700" : "text-zinc-200"}>
                    <span className="font-semibold">Name:</span> {ownerData.firstName} {ownerData.lastName}
                  </p>
                </motion.div>
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <p className={theme === "light" ? "text-zinc-700" : "text-zinc-200"}>
                    <span className="font-semibold">Email:</span> {ownerData.email}
                  </p>
                </motion.div>
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <p className={theme === "light" ? "text-zinc-700" : "text-zinc-200"}>
                    <span className="font-semibold">Phone:</span> {ownerData.phoneNumber}
                  </p>
                </motion.div>
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <p className={theme === "light" ? "text-zinc-700" : "text-zinc-200"}>
                    <span className="font-semibold">Address:</span> {ownerData.location}
                  </p>
                </motion.div>
              </div>
            ) : (
              <p className={`${theme === "light" ? "text-zinc-600" : "text-zinc-400"} text-center mt-4`}>
                No owner data found.
              </p>
            )}

            {/* Buttons in Flex Row Layout */}
            <div className="mt-8 flex flex-row gap-4 justify-center">
              <motion.button
                onClick={() => setIsModalOpen(true)}
                className={`flex items-center gap-2 px-6 py-3 bg-transparent border-2 border-[#4e3dea] rounded-lg transition-all hover:bg-[#4e3dea] ${
                  theme === "light" ? "text-[#4e3dea] hover:text-white" : "text-white hover:text-white"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Lock size={18} />
                Change Password
              </motion.button>
              <motion.button
                onClick={handleLogout}
                className={`flex items-center gap-2 px-6 py-3 bg-transparent border-2 border-[#f73939] rounded-lg transition-all hover:bg-[#f73939] ${
                  theme === "light" ? "text-[#f73939] hover:text-white" : "text-white hover:text-white"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut size={18} />
                Logout
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Password Change Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
          <motion.div
            className={`w-full max-w-md rounded-2xl shadow-lg overflow-hidden ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-50 to-purple-50"
                : "bg-gradient-to-br from-gray-800 to-gray-900"
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                  Change Password
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`p-2 rounded-full transition-colors ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-200" : "text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password Field */}
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-100 to-purple-100"
                      : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <label
                    className={`block text-sm font-medium ${
                      theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    } mb-1`}
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`w-full p-3 pr-10 border ${
                        theme === "light" ? "border-zinc-200" : "border-zinc-700"
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === "light" ? "bg-white" : "bg-gray-800"
                      }`}
                    />
                    <div
                      className="absolute inset-y-0 right-3 pt-7 flex items-center cursor-pointer"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} mb-6 w-5 h-5`} />
                      ) : (
                        <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} mb-6 w-5 h-5`} />
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* New Password Field */}
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-100 to-purple-100"
                      : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <label
                    className={`block text-sm font-medium ${
                      theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    } mb-1`}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full p-3 pr-10 border ${
                        theme === "light" ? "border-zinc-200" : "border-zinc-700"
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === "light" ? "bg-white" : "bg-gray-800"
                      }`}
                    />
                    <div
                      className="absolute inset-y-0 right-3 pt-7 flex items-center cursor-pointer"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 mb-6 h-5`} />
                      ) : (
                        <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5  mb-6 h-5`} />
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  className={`w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Change Password
                </motion.button>
              </form>

              {/* Display Errors */}
              {errors.length > 0 && (
                <motion.div
                  className="mt-4 p-4 rounded-lg bg-red-100 text-red-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <ul className="list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Display Success Message */}
              {success && (
                <motion.p
                  className="mt-4 text-green-600 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {success}
                </motion.p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}