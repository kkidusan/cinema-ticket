"use client";
import { useState, useEffect, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PuffLoader } from "react-spinners";
import { ThemeContext } from "../../context/ThemeContext";
import { auth, db } from "../../firebaseconfig";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { User, Lock, LogOut, Eye, EyeOff, X, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Types
interface UserData {
  name: string;
  email: string;
  role: string;
}

interface OwnerData {
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

const ProfilePage = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
  }>({
    firstName: "",
    lastName: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const router = useRouter();
  const { theme } = useContext(ThemeContext) || { theme: "light" };

  // Fetch user data and validate authentication
  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/validate", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Unauthorized");

      const data: UserData = await response.json();
      if (!data.email || !data.role) throw new Error("Invalid user data");

      if (data.role !== "admin") {
        router.push("/unauthorized");
        return;
      }

      setUserData(data);
    } catch (err: any) {
      console.error("Fetch user error:", err);
      setError("Failed to load profile. Please try again.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch owner data from Firestore
  useEffect(() => {
    if (userData?.email) {
      const fetchOwnerData = async () => {
        try {
          const q = query(collection(db, "admin"), where("email", "==", userData.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const ownerDoc = querySnapshot.docs[0].data() as OwnerData;
            setOwnerData(ownerDoc);
            setFormData({
              firstName: ownerDoc.firstName || "",
              lastName: ownerDoc.lastName || "",
            });
          } else {
            console.log("No owner data found for email:", userData.email);
          }
        } catch (error) {
          console.error("Error fetching owner data:", error);
          setError("Failed to load owner data.");
        }
      };

      fetchOwnerData();
    }
  }, [userData]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.email) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Update Firestore admin document
      const adminQuery = query(collection(db, "admin"), where("email", "==", userData.email));
      const querySnapshot = await getDocs(adminQuery);
      if (!querySnapshot.empty) {
        const adminDocRef = doc(db, "admin", querySnapshot.docs[0].id);
        await updateDoc(adminDocRef, {
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      }

      // Update local state
      setOwnerData((prev) =>
        prev
          ? { ...prev, firstName: formData.firstName, lastName: formData.lastName }
          : prev
      );
      toast.success("Profile updated successfully!");
      setIsProfileModalOpen(false);
    } catch (err: any) {
      console.error("Update profile error:", err);
      setFormError("Failed to update profile. Please try again.");
      toast.error("Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate password
  const validatePassword = useCallback((password: string): string[] => {
    const errorMessages: string[] = [];
    if (password.length < 8) errorMessages.push("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(password)) errorMessages.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errorMessages.push("Password must contain at least one lowercase letter");
    if (!/[0-9]/.test(password)) errorMessages.push("Password must contain at least one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
      errorMessages.push("Password must contain at least one special character");
    return errorMessages;
  }, []);

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors([]);
    setFormError(null);

    if (newPassword !== confirmPassword) {
      setPasswordErrors(["Passwords do not match"]);
      toast.error("Passwords do not match");
      return;
    }

    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setPasswordErrors(validationErrors);
      validationErrors.forEach((error) => toast.error(error));
      return;
    }

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: userData?.email, currentPassword, newPassword }),
      });

      const data: ChangePasswordResponse = await response.json();

      if (response.ok) {
        toast.success(data.message || "Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsPasswordModalOpen(false);
      } else {
        setPasswordErrors([data.error || "Failed to update password"]);
        toast.error(data.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      const errorMessage = "An error occurred. Please try again.";
      setPasswordErrors([errorMessage]);
      toast.error(errorMessage);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      toast.success("Logged out successfully!");
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
        }`}
        aria-label="Loading profile page"
      >
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

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
        }`}
      >
        <motion.p
          className="text-red-500 text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {error}
        </motion.p>
      </div>
    );
  }

  // Main content
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

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 sm:p-6 md:p-8">
        <motion.div
          className={`w-full max-w-2xl rounded-2xl shadow-lg overflow-hidden ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-50 to-purple-50"
              : "bg-gradient-to-br from-gray-800 to-gray-900"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-4 sm:p-6">
            {/* Profile Heading */}
            <h2
              className={`text-xl sm:text-2xl font-bold text-center ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              } mb-6`}
            >
              Admin Profile
            </h2>

            {/* Owner Data */}
            {ownerData ? (
              <div className="space-y-4">
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
                  <p className={theme === "light" ? "text-zinc-700" : "text-zinc-200"}>
                    <span className="font-semibold">Full Name:</span> {ownerData.firstName} {ownerData.lastName}
                  </p>
                </motion.div>
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
                  <p className={theme === "light" ? "text-zinc-700" : "text-zinc-200"}>
                    <span className="font-semibold">Email:</span> {ownerData.email}
                  </p>
                </motion.div>
              </div>
            ) : (
              <p className={`${theme === "light" ? "text-zinc-600" : "text-zinc-400"} text-center mt-4`}>
                No owner data found.
              </p>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => setIsProfileModalOpen(true)}
                className={`flex items-center justify-center gap-2 px-8 py-4 w-full md:w-auto bg-transparent border-2 border-[#4e3dea] rounded-lg text-base font-semibold shadow-md transition-all hover:bg-[#4e3dea] hover:text-white ${
                  theme === "light" ? "text-[#4e3dea]" : "text-white"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Edit size={20} />
                Update Profile
              </motion.button>
              <motion.button
                onClick={() => setIsPasswordModalOpen(true)}
                className={`flex items-center justify-center gap-2 px-8 py-4 w-full md:w-auto bg-transparent border-2 border-[#4e3dea] rounded-lg text-base font-semibold shadow-md transition-all hover:bg-[#4e3dea] hover:text-white ${
                  theme === "light" ? "text-[#4e3dea]" : "text-white"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Lock size={20} />
                Change Password
              </motion.button>
              <motion.button
                onClick={handleLogout}
                className={`flex items-center justify-center gap-2 px-8 py-4 w-full md:w-auto bg-transparent border-2 border-[#f73939] rounded-lg text-base font-semibold shadow-md transition-all hover:bg-[#f73939] hover:text-white ${
                  theme === "light" ? "text-[#f73939]" : "text-white"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut size={20} />
                Logout
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Profile Update Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
          <motion.div
            className={`w-full max-w-lg mx-4 sm:mx-0 rounded-2xl shadow-lg overflow-hidden ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-50 to-purple-50"
                : "bg-gradient-to-br from-gray-800 to-gray-900"
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg sm:text-xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                  Update Profile
                </h3>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className={`p-2 rounded-full transition-colors ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-200" : "text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Update Form */}
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {/* First Name Input */}
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
                    htmlFor="firstName"
                    className={`block text-sm font-medium ${
                      theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    } mb-1`}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full p-3 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    placeholder="Enter your first name"
                  />
                </motion.div>

                {/* Last Name Input */}
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
                    htmlFor="lastName"
                    className={`block text-sm font-medium ${
                      theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    } mb-1`}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full p-3 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    placeholder="Enter your last name"
                  />
                </motion.div>

                {/* Email (Read-only) */}
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-100 to-purple-100"
                      : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <label
                    htmlFor="email"
                    className={`block text-sm font-medium ${
                      theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    } mb-1`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={userData?.email || ""}
                    disabled
                    className={`w-full p-3 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none ${
                      theme === "light" ? "bg-zinc-100 text-zinc-500" : "bg-gray-700 text-zinc-400"
                    }`}
                  />
                </motion.div>

                {/* Form Error */}
                {formError && (
                  <motion.div
                    className="mt-4 p-4 rounded-lg bg-red-100 text-red-700"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {formError}
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !formData.firstName || !formData.lastName}
                  className={`w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md ${
                    isSubmitting || !formData.firstName || !formData.lastName
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-blue-700 hover:to-purple-700"
                  } transition-all`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? "Updating..." : "Update Profile"}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
          <motion.div
            className={`w-full max-w-lg mx-4 sm:mx-0 rounded-2xl shadow-lg overflow-hidden ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-50 to-purple-50"
                : "bg-gradient-to-br from-gray-800 to-gray-900"
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg sm:text-xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                  Change Password
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className={`p-2 rounded-full transition-colors ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-200" : "text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password */}
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
                        <EyeOff className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 mb-6 h-5`} />
                      ) : (
                        <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 mb-6 h-5`} />
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* New Password */}
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
                        <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 mb-6 h-5`} />
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Confirm Password */}
                <motion.div
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-100 to-purple-100"
                      : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <label
                    className={`block text-sm font-medium ${
                      theme === "light" ? "text-zinc-700" : "text-zinc-300"
                    } mb-1`}
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full p-3 pr-10 border ${
                        theme === "light" ? "border-zinc-200" : "border-zinc-700"
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === "light" ? "bg-white" : "bg-gray-800"
                      }`}
                    />
                    <div
                      className="absolute inset-y-0 right-3 pt-7 flex items-center cursor-pointer"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 mb-6 h-5`} />
                      ) : (
                        <Eye className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 mb-6 h-5`} />
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Password Errors */}
                {passwordErrors.length > 0 && (
                  <motion.div
                    className="mt-4 p-4 rounded-lg bg-red-100 text-red-700"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ul className="list-disc list-inside">
                      {passwordErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  className={`w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:from-blue-700 hover:to-purple-700 transition-all`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Change Password
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;