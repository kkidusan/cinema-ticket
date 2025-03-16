"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff, FiCheck, FiX } from "react-icons/fi"; // Icons from react-icons
import { db } from "../firebaseconfig"; // Adjust the path to your Firebase config
import { collection, getDocs } from "firebase/firestore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [promotionImages, setPromotionImages] = useState([]); // State to store promotion images
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Track the current image index
  const router = useRouter();

  // Fetch promotion images from Firestore
  useEffect(() => {
    const fetchPromotionImages = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Promotion"));
        const images = querySnapshot.docs.map((doc) => doc.data().image); // Extract image URLs
        setPromotionImages(images);
      } catch (error) {
        console.error("Error fetching promotion images:", error);
      }
    };

    fetchPromotionImages();
  }, []);

  // Auto-loop images every 1 second
  useEffect(() => {
    if (promotionImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) =>
          prevIndex === promotionImages.length - 1 ? 0 : prevIndex + 1
        );
      }, 1000); // Change image every 1 second

      return () => clearInterval(interval); // Cleanup interval on unmount
    }
  }, [promotionImages]);

  // Email validation function
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Simple validation
    if (!email || !password) {
      setError("Email and password are required");
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
        // Redirect based on the user's role
        if (data.role === "owner") {
          router.push("/dashboard"); // Redirect to owner dashboard
        } else if (data.role === "admin") {
          router.push("/admin"); // Redirect to admin dashboard
        }
      } else {
        // Handle specific HTTP errors
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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50">
      {/* Login Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8 transform transition-all duration-500 hover:scale-105 flex">
        {/* Left Side: Login Form */}
        <div className="w-1/2 pr-8">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back</h1>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              {/* Validation Icon */}
              {email && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {validateEmail(email) ? (
                    <FiCheck className="text-green-500" />
                  ) : (
                    <FiX className="text-red-500" />
                  )}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
              disabled={loading || !validateEmail(email)} // Disable if email is invalid
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Forgot Password and Sign Up Links */}
          <div className="mt-6 text-center space-y-4">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-500 hover:text-blue-600 hover:underline transition-all"
            >
              Forgot Password?
            </Link>
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-500 hover:text-blue-600 hover:underline transition-all"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side: Promotion Images */}
        <div className="w-1/2 pl-8">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Promotions</h2>
          <div className="relative h-96 w-full overflow-hidden rounded-lg shadow-lg">
            {promotionImages.length > 0 && (
              <img
                src={promotionImages[currentImageIndex]}
                alt={`Promotion ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-500"
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}