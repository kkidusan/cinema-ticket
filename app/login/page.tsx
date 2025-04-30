"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";

// Email validation function (consistent with RegisterForm)
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Invalid email format");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.role === "owner") {
          router.push("/dashboard");
        } else if (data.role === "admin") {
          router.push("/admin");
        } else {
          setError("Invalid user role");
        }
      } else {
        if (response.status === 401) {
          setError("Invalid email or password");
        } else if (response.status === 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(data.error || "Login failed");
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={`min-h-screen flex items-center justify-center p-6 ${
        theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
      }`}
    >
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
        <div className="p-8">
          <h1
            className={`text-3xl font-bold text-center ${
              theme === "light" ? "text-zinc-800" : "text-zinc-100"
            } mb-6`}
          >
            Log In
          </h1>

          {error && (
            <motion.div
              className="mb-6 p-4 rounded-lg bg-red-100 text-red-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
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
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className={`w-full p-3 pl-10 pr-10 border ${
                    theme === "light" ? "border-zinc-200" : "border-zinc-700"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === "light" ? "bg-white" : "bg-gray-800"
                  } ${
                    error && !validateEmail(email)
                      ? "border-red-500"
                      : email && validateEmail(email)
                      ? "border-green-500"
                      : ""
                  }`}
                  aria-describedby={error && !validateEmail(email) ? "email-error" : undefined}
                  required
                />
                <Mail
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    theme === "light" ? "text-zinc-500" : "text-zinc-400"
                  } w-5 h-5`}
                />
                {email && (
                  <motion.div
                    className="absolute inset-y-0 right-3 flex items-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {validateEmail(email) ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </motion.div>
                )}
              </div>
              {error && !validateEmail(email) && (
                <p id="email-error" className="text-red-500 text-sm mt-1">
                  Invalid email format
                </p>
              )}
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
              transition={{ delay: 0.3, duration: 0.4 }}
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
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className={`w-full p-3 pl-10 pr-10 border ${
                    theme === "light" ? "border-zinc-200" : "border-zinc-700"
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === "light" ? "bg-white" : "bg-gray-800"
                  } ${error && !password ? "border-red-500" : ""}`}
                  aria-describedby={error && !password ? "password-error" : undefined}
                  required
                />
                <Lock
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    theme === "light" ? "text-zinc-500" : "text-zinc-400"
                  } w-5 h-5`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-3 flex items-center hover:bg-gray-200/50 rounded-full p-1 transition-colors ${
                    theme === "light" ? "text-zinc-500" : "text-zinc-400"
                  }`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {error && !password && (
                <p id="password-error" className="text-red-500 text-sm mt-1">
                  Password is required
                </p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || !validateEmail(email)}
              className={`w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md ${
                loading || !validateEmail(email)
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:from-blue-700 hover:to-purple-700"
              } transition-all flex items-center justify-center`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <Link
              href="/forgot-password"
              className={`text-sm ${
                theme === "light" ? "text-blue-600" : "text-blue-400"
              } hover:underline hover:text-blue-500 transition-all`}
            >
              Forgot Password?
            </Link>
            <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
              Don't have an account?{" "}
              <Link
                href="/signup"
                className={`underline ${
                  theme === "light" ? "text-blue-600" : "text-blue-400"
                } hover:text-blue-500`}
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}