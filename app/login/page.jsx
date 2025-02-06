"use client";
import { useState } from "react";
import { auth } from "../firebaseconfig"; // Firebase Auth
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Cookies from "js-cookie"; // For cookie handling
import Link from "next/link";
import { motion } from "framer-motion"; // For animations

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", general: "" }); // To store specific field errors and general errors
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "", general: "" }); // Clear specific error and general error when the user starts typing
  };

  const validateForm = () => {
    const newErrors = { email: "", password: "", general: "" };

    // Basic email validation
    if (!formData.email) {
      newErrors.email = "Please enter your email address.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Oops! That doesn't look like a valid email.";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Please enter your password.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Your password needs to be at least 6 characters long.";
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === "");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate form before submitting
    if (!validateForm()) {
      setLoading(false);
      return; // Don't submit if there are validation errors
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Save the session token in cookies
      const token = await user.getIdToken();
      Cookies.set("token", token, { expires: 1 }); // 1 day expiry

      // Redirect to the dashboard after successful login
      router.push("/dashboard");
    } catch (error) {
      // Firebase-specific error handling
      if (error.code === "auth/user-not-found") {
        setErrors({
          ...errors,
          general: "We couldn't find an account with that email. Please check and try again.",
        });
      } else if (error.code === "auth/wrong-password") {
        setErrors({
          ...errors,
          general: "Oops! The password you entered is incorrect. Please try again.",
        });
      } else if (error.code === "auth/invalid-email") {
        setErrors({
          ...errors,
          general: "The email address is invalid. Please provide a valid email address.",
        });
      } else {
        // General fallback error
        setErrors({
          ...errors,
          general: "The email address is invalid. Please provide a valid email address.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="flex justify-center items-center min-h-screen bg-gray-100 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-6">Welcome Back</h2>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 mt-2 border rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 mt-2 border rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* General Error Message */}
          {errors.general && (
            <div className="text-red-500 text-sm mt-3 text-center">
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            className={`w-full p-3 mt-4 text-white font-semibold rounded-lg ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
