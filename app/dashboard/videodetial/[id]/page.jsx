"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { db, collection, query, where, onSnapshot } from "../../../firebaseconfig";
import { PuffLoader } from "react-spinners";
import { FaArrowLeft } from "react-icons/fa";
import { ThemeContext } from "../../../context/ThemeContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function VideoDetail(paramsPromise) {
  const params = React.use(paramsPromise);
  const { id } = params; // Destructure id after unwrapping params
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [soldTickets, setSoldTickets] = useState(0);
  const [availableSite, setAvailableSite] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Unauthorized access. Please log in.";
          toast.error(errorMessage, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.email && data.role) {
          setUserEmail(data.email);
          setUserRole(data.role);

          if (data.role !== "owner") {
            toast.error("User is not an owner.", {
              position: "top-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === "light" ? "light" : "dark",
            });
            throw new Error("User is not an owner.");
          }
        } else {
          toast.error("No email or role found.", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error("No email or role found");
        }
      } catch (error) {
        setTimeout(() => {
          router.replace("/login");
        }, 3500); // Delay redirect to show toast
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, theme]);

  useEffect(() => {
    if (id && userRole === "owner") {
      const q = query(collection(db, "Movies"), where("movieID", "==", id));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const movieData = querySnapshot.docs[0].data();
          setVideo(movieData);
          setSoldTickets(movieData.soldTickets || 0);
          setAvailableSite(movieData.availableSite || 0);
        } else {
          toast.error("No video found with the given ID!", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [id, userRole, theme]);

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-gray-900"} flex items-center justify-center`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color={theme === "light" ? "#3b82f6" : "#818cf8"} size={100} />
        </motion.div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className={`min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-gray-900"} flex items-center justify-center`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color={theme === "light" ? "#ef4444" : "#f87171"} size={100} />
          <motion.p
            className="mt-4 text-2xl font-bold text-zinc-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Movie not found!
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const totalTickets = soldTickets + availableSite;
  const soldPercentage = totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0;
  const availablePercentage = totalTickets > 0 ? (availableSite / totalTickets) * 100 : 0;

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-gray-900"}`}>
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
      {/* Fixed Navigation Header with zinc-100 gradient */}
      <header className={`sticky top-0 z-50 ${theme === "light" ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-gradient-to-br from-gray-800 to-gray-900"} border-b ${theme === "light" ? "border-zinc-200" : "border-gray-700"} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Movie Header */}
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h1 className={`text-4xl font-bold ${theme === "light" ? "text-zinc-800" : "text-white"} mb-4`}>
              {video.title}
            </h1>
          </motion.div>

          {/* Movie Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Poster */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <motion.div
                className={`w-full h-full ${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-shadow`}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="aspect-video w-full h-full rounded-lg overflow-hidden">
                  <motion.img
                    src={video.poster}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    onError={(e) => {
                      e.target.src = '/default-poster.jpg';
                      e.target.onerror = null;
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Details */}
            <div className="space-y-8">
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, staggerChildren: 0.1 }}
              >
                {[
                  { label: "Category", value: video.category },
                  { label: "Duration", value: `${video.duration} minutes` },
                  { label: "Cinema Name", value: video.cinemaName },
                  { label: "Location", value: video.cinemaLocation },
                  { label: "Available On", value: video.availableSite },
                  { label: "Ticket Price", value: `$${video.ticketPrice}` },
                  { label: "Description", value: video.description },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                  >
                    <h3 className={`text-sm font-semibold ${theme === "light" ? "text-zinc-500" : "text-gray-400"} mb-1`}>
                      {item.label}
                    </h3>
                    <p className={`text-lg font-medium ${theme === "light" ? "text-zinc-800" : "text-white"}`}>
                      {item.value}
                    </p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Ticket Statistics */}
              <motion.div
                className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-8 rounded-xl shadow-xl hover:shadow-2xl transition-shadow`}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <h2 className={`text-2xl font-bold ${theme === "light" ? "text-zinc-800" : "text-white"} mb-6`}>
                  Ticket Statistics
                </h2>
                <div className="space-y-6">
                  <div>
                    <p className={`text-lg font-medium ${theme === "light" ? "text-zinc-700" : "text-gray-300"} mb-2`}>
                      Sold Tickets: <span className="font-bold">{soldTickets}</span>
                    </p>
                    <div className="w-full bg-zinc-200 rounded-full h-3">
                      <motion.div
                        className="bg-green-500 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${soldPercentage}%` }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className={`text-lg font-medium ${theme === "light" ? "text-zinc-700" : "text-gray-300"} mb-2`}>
                      Available Tickets: <span className="font-bold">{availableSite}</span>
                    </p>
                    <div className="w-full bg-zinc-200 rounded-full h-3">
                      <motion.div
                        className="bg-blue-500 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${availablePercentage}%` }}
                        transition={{ delay: 1, duration: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-full sm:w-auto px-8 py-3 ${theme === "light" ? "bg-blue-600 text-white" : "bg-blue-700 text-white"} rounded-lg hover:bg-blue-700 transition-colors`}
                  onClick={() => router.push(`/updateMovie/${id}`)}
                >
                  Edit Movie Details
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}