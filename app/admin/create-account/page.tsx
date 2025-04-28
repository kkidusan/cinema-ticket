"use client";
import React from "react";
import { useState, useContext, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PuffLoader } from "react-spinners";
import { ThemeContext } from "../../context/ThemeContext";
import { auth, db } from "../../firebaseconfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { Lock, User, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Types
interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

interface UserData {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  status?: number;
  createdAt?: string;
}

const CreateAccountPage = () => {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [canRenderForm, setCanRenderForm] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const router = useRouter();
  const { theme } = useContext(ThemeContext) || { theme: "light" };

  // Fetch user data to check status
  const fetchUser = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setCanRenderForm(true); // No user logged in, allow form rendering
        return;
      }

      // Fetch user data from Firestore
      const adminQuery = query(collection(db, "admin"), where("email", "==", user.email));
      const querySnapshot = await getDocs(adminQuery);
      if (!querySnapshot.empty) {
        const adminData = querySnapshot.docs[0].data();
        const userData: UserData = {
          email: adminData.email || user.email!,
          role: adminData.role || "",
          firstName: adminData.firstName || "",
          lastName: adminData.lastName || "",
          status: Number(adminData.status) || 0,
          createdAt: adminData.createdAt || "",
        };

        if (userData.status === 1) {
          router.replace("/admin"); // Use replace to avoid adding to history
          return;
        }
      }
      setCanRenderForm(true); // No status 1, allow form rendering
    } catch (err: any) {
      console.error("Fetch user error:", err);
      toast.error("Failed to load user data. Please try again.");
      setCanRenderForm(true); // Allow form rendering on error to avoid blocking
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch user data on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
    setPasswordErrors([]);
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPasswordErrors([]);
    setIsSubmitting(true);
    setLoading(true);

    const { email, password, confirmPassword, firstName, lastName } = formData;

    // Basic validation
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      setFormError("All fields are required.");
      setIsSubmitting(false);
      setLoading(false);
      toast.error("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordErrors(["Passwords do not match"]);
      setIsSubmitting(false);
      setLoading(false);
      toast.error("Passwords do not match");
      return;
    }

    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      setPasswordErrors(validationErrors);
      validationErrors.forEach((error) => toast.error(error));
      setIsSubmitting(false);
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user data in Firestore admin collection
      const adminDocRef = doc(db, "admin", user.uid);
      await setDoc(adminDocRef, {
        email,
        firstName,
        lastName,
        role: "admin",
        status: 1,
        createdAt: new Date().toISOString(),
      });

      toast.success("Account created successfully!");
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
      });
      router.push("/login");
    } catch (error: any) {
      console.error("Error creating account:", error);
      let errorMessage = "Failed to create account. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      }
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  // Loading state
  if (loading || !canRenderForm) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
        }`}
        aria-label="Loading create account page"
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
            Loading...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Render form only if allowed
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
          className={`w-full max-w-lg rounded-2xl shadow-lg overflow-hidden ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-50 to-purple-50"
              : "bg-gradient-to-br from-gray-800 to-gray-900"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-4 sm:p-6">
            {/* Heading */}
            <h2
              className={`text-xl sm:text-2xl font-bold text-center ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              } mb-6`}
            >
              Create Admin Account
            </h2>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
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
                  htmlFor="email"
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-1`}
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full p-3 pl-10 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    placeholder="Enter your email"
                  />
                  <Mail
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      theme === "light" ? "text-zinc-500" : "text-zinc-400"
                    } w-5 h-5`}
                  />
                </div>
              </motion.div>

              {/* First Name Input */}
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
                  htmlFor="firstName"
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-1`}
                >
                  First Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full p-3 pl-10 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    placeholder="Enter your first name"
                  />
                  <User
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      theme === "light" ? "text-zinc-500" : "text-zinc-400"
                    } w-5 h-5`}
                  />
                </div>
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
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <label
                  htmlFor="lastName"
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-1`}
                >
                  Last Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full p-3 pl-10 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    placeholder="Enter your last name"
                  />
                  <User
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      theme === "light" ? "text-zinc-500" : "text-zinc-400"
                    } w-5 h-5`}
                  />
                </div>
              </motion.div>

              {/* Password Input */}
              <motion.div
                className={`p-4 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <label
                  htmlFor="password"
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-1`}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full p-3 pr-10 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    placeholder="Enter your password"
                  />
                  <div
                    className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Lock className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 h-5`} />
                  </div>
                </div>
              </motion.div>

              {/* Confirm Password Input */}
              <motion.div
                className={`p-4 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <label
                  htmlFor="confirmPassword"
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-1`}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full p-3 pr-10 border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    placeholder="Confirm your password"
                  />
                  <div
                    className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Lock className={`${theme === "light" ? "text-zinc-500" : "text-zinc-400"} w-5 h-5`} />
                  </div>
                </div>
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
                disabled={
                  isSubmitting ||
                  !formData.email ||
                  !formData.password ||
                  !formData.confirmPassword ||
                  !formData.firstName ||
                  !formData.lastName
                }
                className={`w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md ${
                  isSubmitting ||
                  !formData.email ||
                  !formData.password ||
                  !formData.confirmPassword ||
                  !formData.firstName ||
                  !formData.lastName
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-blue-700 hover:to-purple-700"
                } transition-all`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </motion.button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <p className={`${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                Already have an account?{" "}
                <a
                  href="/login"
                  className={`underline ${theme === "light" ? "text-blue-600" : "text-blue-400"} hover:text-blue-500`}
                >
                  Log in
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateAccountPage;