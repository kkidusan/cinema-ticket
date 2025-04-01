"use client";
import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, MessageCircle, LogOut, Upload } from "lucide-react";
import { auth, db } from "../firebaseconfig";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore";
import Footer from "../componet/Footer";
import { PuffLoader } from "react-spinners";
import ThemeToggle from "../componet/ThemeToggle";
import { ThemeContext } from "../context/ThemeContext";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userData, setUserData] = useState(null);
  const [upload, setUpload] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [messageCount, setMessageCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [userMovies, setUserMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

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

  // Fetch user data, uploads, messages, and movies when userEmail changes
  useEffect(() => {
    if (isAuthenticated && userEmail && userRole === "owner") {
      fetchUserData(userEmail);
      fetchUserUpload(userEmail);
      fetchMessages(userEmail);
      fetchUserMovies(userEmail);
    }
  }, [isAuthenticated, userEmail, userRole]);

  // Real-time listener for user approval status
  useEffect(() => {
    if (isAuthenticated && userEmail) {
      const q = query(collection(db, "owner"), where("email", "==", userEmail));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          setIsApproved(userDoc.approved !== false);
        } else {
          setIsApproved(false);
        }
      });

      // Cleanup the listener on unmount
      return () => unsubscribe();
    }
  }, [isAuthenticated, userEmail]);

  const fetchUserData = async (email) => {
    try {
      const q = query(collection(db, "owner"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0].data();
        setUserData(userDoc);
        setIsApproved(userDoc.approved !== false);
      } else {
        setIsApproved(false);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchUserUpload = async (email) => {
    try {
      const q = query(collection(db, "Movies"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      setUpload(querySnapshot.docs.map((doc) => doc.data()));
    } catch (error) {
      console.error("Error fetching user uploads:", error);
    }
  };

  const fetchUserMovies = async (email) => {
    try {
      const q = query(collection(db, "Movies"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      setUserMovies(querySnapshot.docs.map((doc) => doc.data()));
    } catch (error) {
      console.error("Error fetching user movies:", error);
    }
  };

  const fetchMessages = (email) => {
    try {
      const q = query(
        collection(db, "messages"),
        where("ownerEmail", "==", email),
        where("sender", "==", "admin"),
        where("show", "==", false)
      );

      onSnapshot(q, (querySnapshot) => {
        setMessageCount(querySnapshot.size);
        setMessages(querySnapshot.docs.map((doc) => doc.data()));
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleMessageClick = async () => {
    try {
      const q = query(
        collection(db, "messages"),
        where("ownerEmail", "==", userEmail),
        where("sender", "==", "admin"),
        where("show", "==", false)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnapshot) => {
        const messageDocRef = doc(db, "messages", docSnapshot.id);
        await updateDoc(messageDocRef, { show: true });
      });

      router.push("/dashboard/messages");
    } catch (error) {
      console.error("Error updating messages:", error);
    }
  };

  const handleMovieClick = (movieID) => {
    router.push(`/dashboard/videodetial/${movieID}`);
  };

  const handleShowMore = () => {
    setVisibleCount(visibleCount + 4);
  };

  const handleShowLess = () => {
    setVisibleCount((prev) => Math.max(4, prev - 4));
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        router.replace("/");
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const stats = {
    totalMovies: userMovies.length,
    averageRating: 4.5,
    mostPopularGenre: "Action",
    totalViews: 15000,
    totalLikes: 1200,
    totalComments: 450,
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-zinc-50" : "bg-gray-900"}`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#36D7B7" size={100} />
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === "light" ? "bg-zinc-50" : "bg-gray-900"}`}>
      {/* Navigation Header with updated zinc-100 gradient */}
      <nav className={`fixed w-full ${theme === "light" ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-gradient-to-br from-gray-800 to-gray-900"} border-b ${theme === "light" ? "border-zinc-200" : "border-zinc-700"} shadow-lg z-50`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between h-16 items-center">
          <motion.div
            className="text-2xl font-extrabold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {userData ? (
              <span className={`${theme === "light" ? "text-purple-700" : "text-purple-300"}`}>
                {userData.firstName} {userData.lastName}
              </span>
            ) : (
              "Loading user data..."
            )}
          </motion.div>

          <div className="flex items-center space-x-6 ml-auto">
            {/* Profile Button */}
            <div className="relative group">
              <button
                onClick={() => router.push("/dashboard/profile")}
                className={`p-2 rounded-full ${theme === "light" ? "text-purple-700 hover:bg-purple-100" : "text-purple-300 hover:bg-purple-800"} transition-colors`}
              >
                <User size={28} />
              </button>
              <span className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Profile
              </span>
            </div>

            {/* Message Button */}
            <div className="relative group">
              <button
                onClick={handleMessageClick}
                className={`p-2 rounded-full ${theme === "light" ? "text-purple-700 hover:bg-purple-100" : "text-purple-300 hover:bg-purple-800"} transition-colors`}
              >
                <MessageCircle size={28} />
                {messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {messageCount}
                  </span>
                )}
              </button>
              <span className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Messages
              </span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Logout Button */}
            <div className="relative group">
              <button
                onClick={handleLogout}
                className={`p-2 rounded-full ${theme === "light" ? "text-purple-700 hover:bg-purple-100" : "text-purple-300 hover:bg-purple-800"} transition-colors`}
              >
                <LogOut size={28} />
              </button>
              <span className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Logout
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      {isApproved === false ? (
        <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-zinc-50" : "bg-gray-900"}`}>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.h1
              className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Request Pending
            </motion.h1>
            <motion.p
              className={`mt-4 text-xl md:text-2xl ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              Your request is being processed. Please wait a few days.
            </motion.p>
            <motion.div
              className="mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
            >
              <div className="flex justify-center">
                <div className="w-24 h-24 border-4 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p className={`mt-4 ${theme === "light" ? "text-gray-600" : "text-gray-400"} text-sm`}>
                We appreciate your patience!
              </p>
            </motion.div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Rest of the dashboard content */}
          <div className="p-8 pt-24">
            {/* Grid Layout for Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Owner's Role and Responsibilities Card */}
              <motion.div
                className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow`}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <h3 className={`text-2xl font-bold ${theme === "light" ? "text-gray-800" : "text-gray-100"} mb-6`}>
                  Owner's Role and Responsibilities
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Manage video uploads and oversee content shared on the platform.</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Approve or reject uploads based on platform guidelines.</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    <span className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Handle real-time messages from the admin.</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Maintain personal settings and customize dashboard.</span>
                  </li>
                </ul>
              </motion.div>

              {/* Video Upload Management Card */}
              <motion.div
                className={`${theme === "light" ? "bg-gradient-to-br from-purple-50 to-pink-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow`}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <h3 className={`text-2xl font-bold ${theme === "light" ? "text-gray-800" : "text-gray-100"} mb-6`}>
                  Video Upload Management
                </h3>
                <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"} mb-6`}>
                  The owner can upload, manage, and organize videos, providing details such as titles, descriptions, and posters.
                </p>

                {/* Upload New Video Section */}
                <div className={`${theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"} p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow`}>
                  <h4 className={`text-xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"} mb-4`}>
                    Upload New Video
                  </h4>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"} mb-6`}>
                    Upload new videos by providing a title, description, and poster. Your videos will be added to the platform.
                  </p>
                  <button
                    onClick={() => router.push("/dashboard/videoUploadDetail")}
                    className={`bg-transparent border-2 ${theme === "light" ? "border-purple-600 text-purple-700" : "border-purple-400 text-purple-300"} px-4 py-2 rounded-md transition-all hover:bg-purple-600 hover:text-white flex items-center space-x-2`}
                  >
                    <Upload size={20} />
                    <span>Upload New Video</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* User Uploaded Movies Section */}
          <div className="flex-grow p-8">
            <h2 className={`text-3xl font-bold ${theme === "light" ? "text-gray-900" : "text-gray-100"} mb-6`}>
              Your Uploaded Movies
            </h2>

            {userMovies.length === 0 ? (
              <div className={`text-center ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                <p className="text-xl">You have not uploaded any movies.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {userMovies.slice(0, visibleCount).map((movie, index) => (
                    <div
                      key={index}
                      className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer`}
                      onClick={() => handleMovieClick(movie.movieID)}
                    >
                      <p className={`text-lg font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"} mb-4`}>
                        Movie ID: {movie.movieID}
                      </p>
                      <img
                        src={movie.poster}
                        alt="Movie Poster"
                        className="rounded-lg w-full h-auto object-cover"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  {userMovies.length > visibleCount && (
                    <button
                      onClick={handleShowMore}
                      className={`bg-transparent border-2 ${theme === "light" ? "border-purple-600 text-purple-700" : "border-purple-400 text-purple-300"} px-4 py-2 rounded-md transition-all hover:bg-purple-600 hover:text-white mr-4`}
                    >
                      Show More...
                    </button>
                  )}
                  {visibleCount > 4 && (
                    <button
                      onClick={handleShowLess}
                      className={`bg-transparent border-2 ${theme === "light" ? "border-purple-600 text-purple-700" : "border-purple-400 text-purple-300"} px-4 py-2 rounded-md transition-all hover:bg-purple-600 hover:text-white`}
                    >
                      Show Less
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Statistical Analysis Section */}
          <div className="mt-16 p-8">
            <h2 className={`text-3xl font-bold ${theme === "light" ? "text-gray-900" : "text-gray-100"} mb-6`}>
              Statistical Analysis
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Movies Uploaded */}
              <div className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
                <h3 className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"}`}>
                  Total Movies Uploaded
                </h3>
                <p className="mt-4 text-4xl font-bold text-blue-500">
                  {stats.totalMovies}
                </p>
              </div>

              {/* Average Rating */}
              <div className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
                <h3 className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"}`}>
                  Average Rating
                </h3>
                <p className="mt-4 text-4xl font-bold text-green-500">
                  {stats.averageRating} ⭐
                </p>
              </div>

              {/* Most Popular Genre */}
              <div className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
                <h3 className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"}`}>
                  Most Popular Genre
                </h3>
                <p className="mt-4 text-4xl font-bold text-purple-500">
                  {stats.mostPopularGenre}
                </p>
              </div>

              {/* Total Views */}
              <div className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
                <h3 className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"}`}>
                  Total Views
                </h3>
                <p className="mt-4 text-4xl font-bold text-yellow-500">
                  {stats.totalViews.toLocaleString()}
                </p>
              </div>

              {/* Total Likes */}
              <div className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
                <h3 className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"}`}>
                  Total Likes
                </h3>
                <p className="mt-4 text-4xl font-bold text-pink-500">
                  {stats.totalLikes.toLocaleString()}
                </p>
              </div>

              {/* Total Comments */}
              <div className={`${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}>
                <h3 className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-100"}`}>
                  Total Comments
                </h3>
                <p className="mt-4 text-4xl font-bold text-red-500">
                  {stats.totalComments.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}