"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { auth as firebaseAuth } from "../../../firebaseconfig";
import { Eye, EyeOff } from "lucide-react";
import { PuffLoader } from "react-spinners";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";

export default function AboutPage() {
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Fetch user authentication details
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
          setIsAuthenticated(true);

          if (data.role !== "owner") {
            router.replace("/login");
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
      return;
    }

    const user = firebaseAuth.currentUser;
    if (!user) {
      setErrors(["User is not authenticated."]);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      setErrors([error.message]);
    }
  };

  // Show loading state while fetching user data
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-100">
        <PuffLoader color="#3b82f6" size={100} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* Navigation Header */}
      <div className="bg-zinc-100 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.button
            onClick={() => router.back()}
            className="flex items-center text-zinc-600 hover:text-zinc-800 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft className="mr-2 h-5 w-5" />
            <span className="text-lg font-medium">Back</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center text-zinc-800 mb-6">Change Password</h2>
            <p className="text-zinc-600 text-center mb-6">User: {userEmail}</p>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Current Password</label>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-3 pr-10 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div
                  className="absolute inset-y-0 right-3 pt-7 flex items-center cursor-pointer"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="text-zinc-500 w-5 h-5" /> : <Eye className="text-zinc-500 w-5 h-5" />}
                </div>
              </div>

              {/* New Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-700 mb-1">New Password</label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 pr-10 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div
                  className="absolute inset-y-0 right-3 pt-7 flex items-center cursor-pointer"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="text-zinc-500 w-5 h-5" /> : <Eye className="text-zinc-500 w-5 h-5" />}
                </div>
              </div>

              <motion.button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Change Password
              </motion.button>
            </form>

            {/* Display Errors */}
            {errors.length > 0 && (
              <motion.div
                className="mt-4 bg-red-100 p-4 rounded-lg text-red-700"
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
    </div>
  );
}