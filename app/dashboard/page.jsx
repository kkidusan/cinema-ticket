"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sun, Moon, ArrowRightCircle } from "lucide-react";
import { auth } from "../firebaseconfig";
import Cookies from "js-cookie";
import { db, collection, getDocs, query, where } from "../firebaseconfig";

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState(null);
  const [upload, setUpload] = useState([]);
  const [theme, settheme] = useState("light")

  const router = useRouter();

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    const storedUser = Cookies.get("token");
    if (storedUser) {
      setUser(storedUser);
    }

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
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchUserUpload = async (email) => {
    try {
      const q = query(collection(db, "Movies"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const uploads = querySnapshot.docs.map((doc) => doc.data());
        setUpload(uploads); // Ensure upload is always an array
      }
    } catch (error) {
      console.error("Error fetching user uploads:", error);
    }
  };

  // Function to format Firebase Timestamp to a human-readable date
  const formatDate = (timestamp) => {
    if (timestamp) {
      const date = timestamp.toDate();
      return date.toLocaleDateString(); // You can change the format here as needed
    }
    return "";
  };

  // Function to toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 flex flex-col items-center"
      style={{ backgroundColor: theme ? "red" : "blue" }}
    >
      {/* Navbar */}
      <nav className="fixed w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between h-16 items-center">
          <motion.div
            className="text-2xl font-extrabold text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {userData ? (
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500">
                {userData.firstName} {userData.lastName}
              </span>
            ) : (
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500">
                Loading user data...
              </span>
            )}
          </motion.div>
          <button
            // onClick={toggleDarkMode}
            onClick={() => settheme(!theme)}
            className="text-white hover:text-yellow-300">
            {darkMode ? <Sun size={28} /> : <Moon size={28} />}
          </button>
        </div>
      </nav>

      {/* Video Uploads Section */}
      <div className="mt-24 w-full max-w-3xl">


        {/* Video Upload Portal Card */}
        <motion.div
          className="mt-20 w-full max-w-md bg-white dark:bg-gray-900 shadow-lg rounded-xl p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
            Video Upload Portal
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Upload and manage your videos with ease. Enhance your audience engagement today!
          </p>
          <button
            onClick={() => router.push("/dashboard/videoUploadDetail")}
            className="w-full flex items-center justify-center space-x-2 text-lg font-medium px-5 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md hover:scale-105 transition-transform"
          >
            <ArrowRightCircle size={20} />
            <span>Upload Video</span>
          </button>
        </motion.div>


        {upload.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upload.map((video, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-900 shadow-lg rounded-xl p-6 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{video.title}</h3>
                <img
                  src={video.poster}
                  alt={video.title}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Uploading: {formatDate(video.uploadingDate)} {/* Format the date here */}
                </p>

                <p className="text-sm text-gray-600 dark:text-gray-300">{video.description}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">No uploads found.</p>
        )}
      </div>
    </div>
  );
}
