"use client";
import { useState, useEffect, use, useContext } from "react"; // Add useContext here
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { db, collection, query, where, onSnapshot } from "../../../firebaseconfig";
import { PuffLoader } from "react-spinners";
import { FaArrowLeft } from "react-icons/fa";
import { ThemeContext } from "../../../context/ThemeContext"; // Ensure ThemeContext is imported

export default function VideoDetail({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const { theme } = useContext(ThemeContext); // Use ThemeContext

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

        if (!response.ok) throw new Error("Unauthorized");

        const data = await response.json();
        if (data.email && data.role) {
          setUserEmail(data.email);
          setUserRole(data.role);

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

  useEffect(() => {
    if (id && userRole === "owner") {
      const q = query(collection(db, "Movies"), where("movieID", "==", id));

      // Realtime fetch using onSnapshot
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const movieData = querySnapshot.docs[0].data();
          setVideo(movieData);
          setSoldTickets(movieData.soldTickets || 0);
          setAvailableSite(movieData.availableSite || 0);
        } else {
          console.error("No video found with the given ID!");
        }
        setLoading(false);
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    }
  }, [id, userRole]);

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

  // Calculate ticket statistics
  const totalTickets = soldTickets + availableSite;
  const soldPercentage = totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0;
  const availablePercentage = totalTickets > 0 ? (availableSite / totalTickets) * 100 : 0;

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-gray-900"}`}>
      {/* Navigation Header */}
      <div className={`${theme === "light" ? "bg-zinc-100 border-b border-zinc-200" : "bg-gray-800 border-b border-gray-700"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.button
            onClick={() => router.back()}
            className={`flex items-center ${theme === "light" ? "text-zinc-600 hover:text-zinc-800" : "text-gray-300 hover:text-gray-100"} transition-colors`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft className="mr-2 h-5 w-5" />
            <span className="text-lg font-medium">Back to Dashboard</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <p className={`text-lg ${theme === "light" ? "text-zinc-600" : "text-gray-300"} max-w-3xl mx-auto`}>
              {video.description}
            </p>
          </motion.div>

          {/* Movie Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Poster */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"} p-4 hover:shadow-xl transition-shadow`}>
                <div className="aspect-video bg-zinc-100 rounded-lg overflow-hidden mx-auto">
                  <motion.img
                    src={video.poster}
                    alt={video.title}
                    className="w-full h-full object-contain scale-90"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    onError={(e) => {
                      e.target.src = '/default-poster.jpg';
                      e.target.onerror = null;
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Right Column - Details */}
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
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className={`${theme === "light" ? "bg-white" : "bg-gray-800"} p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow`}
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
          </div>

          {/* Ticket Statistics */}
          <motion.div
            className={`mt-8 ${theme === "light" ? "bg-white" : "bg-gray-800"} p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow`}
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
            className="mt-8 flex flex-col sm:flex-row gap-4"
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
        </motion.div>
      </main>
    </div>
  );
}