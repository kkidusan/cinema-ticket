"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sun, Moon, Home, User, ArrowRightCircle, ChevronDown, ChevronUp } from "lucide-react";
import { auth } from "../firebaseconfig";
import Cookies from "js-cookie";
import { db, collection, getDocs, query, where } from "../firebaseconfig";
import Footer from "../componet/Footer";

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState(null);
  const [upload, setUpload] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setDarkMode(savedTheme === "dark");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");

    const storedUser = Cookies.get("token");
    if (storedUser) setUser(storedUser);

    const authUser = auth.currentUser;
    if (authUser) {
      setUserEmail(authUser.email);
      fetchUserData(authUser.email);
      fetchUserUpload(authUser.email);
    } else {
      router.push("/login");
    }
  }, []);

  const fetchUserData = async (email) => {
    try {
      const q = query(collection(db, "owner"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUserData(querySnapshot.docs[0].data());
      } else {
        console.error("No user data found!");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchUserUpload = async (email) => {
    try {
      const q = query(collection(db, "Movies"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      const uploads = querySnapshot.docs.map((doc) => doc.data());
      setUpload(uploads);
    } catch (error) {
      console.error("Error fetching user uploads:", error);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  const formatDate = (timestamp) => {
    if (timestamp) {
      const date = timestamp.toDate();
      return date.toLocaleDateString();
    }
    return "";
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 4, upload.length));
  };

  const handleShowLess = () => {
    setVisibleCount((prev) => Math.max(prev - 4, 4));
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "bg-gray-900" : "bg-zinc-50"} transition-colors duration-300`}>
      <nav className="fixed w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 dark:from-gray-800 dark:to-gray-700 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between h-16 items-center">
          <motion.div className="text-2xl font-extrabold text-white" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            {userData ? (
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500">
                {userData.firstName} {userData.lastName}
              </span>
            ) : (
              "Loading user data..."
            )}
          </motion.div>
          <div className="flex items-center space-x-6">
            <button onClick={() => router.push("/dashboard")} className="flex items-center space-x-2 text-white text-lg font-medium hover:text-yellow-300 transition-colors">
              <Home size={24} />
              <span>Home</span>
            </button>
            <button onClick={() => router.push("/dashboard/profile")} className="flex items-center space-x-2 text-white text-lg font-medium hover:text-yellow-300 transition-colors">
              <User size={24} />
              <span>Profile</span>
            </button>
            <button onClick={toggleDarkMode} className="text-white hover:text-yellow-300 transition-colors">
              {darkMode ? <Moon size={28} /> : <Sun size={28} />}
            </button>
          </div>
        </div>
      </nav>

      <div className="mt-24 flex-grow pb-11">
        {userData?.approved ? (
          <>
            <motion.div className={`mt-20 w-full max-w-md rounded-xl p-6 text-center shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"} transition-colors`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-semibold mb-3">Video Upload Portal</h2>
              <p className="text-sm mb-4">Upload and manage your videos with ease. Enhance your audience engagement today!</p>
              <button onClick={() => router.push("/dashboard/videoUploadDetail")}
                className="w-full flex items-center justify-center space-x-2 text-lg font-medium px-5 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md hover:scale-105 transition-transform">
                <ArrowRightCircle size={20} />
                <span>Upload Video</span>
              </button>
            </motion.div>

            {upload.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {upload.slice(0, visibleCount).map((video, index) => (
                  <motion.div key={index} className={`shadow-lg rounded-xl p-6 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => router.push(`/dashboard/videodetail/${video.title}`)}>
                    <h3 className="text-xl font-semibold mb-2">{video.title}</h3>
                    <img src={video.poster} alt={video.title} className="w-full h-48 object-cover rounded-md mb-4" />
                    <p className="text-sm mb-4">Uploaded on: {formatDate(video.uploadingDate)}</p>
                    <p className="text-sm">{video.description}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-300 mt-8">No uploads found.</p>
            )}

            <div className="flex justify-center mt-6 space-x-4">
              {visibleCount < upload.length && (
                <button onClick={handleShowMore} className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                  <span>Show More</span>
                  <ChevronDown size={20} />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-screen text-xl font-semibold text-gray-700 dark:text-gray-300">
            Please wait a few days, your request is being processed...
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
