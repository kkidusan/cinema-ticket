"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sun, Moon, Home, User, ArrowRightCircle, MessageCircle } from "lucide-react";
import { auth, db } from "../firebaseconfig"; // Assuming db is already imported
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore"; // Import missing methods
import Footer from "../componet/Footer";

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState(null);
  const [upload, setUpload] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [messageCount, setMessageCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setDarkMode(savedTheme === "dark");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");

    const authUser = auth.currentUser;
    if (authUser) {
      setUserEmail(authUser.email);
      fetchUserData(authUser.email);
      fetchUserUpload(authUser.email);
      fetchMessages(authUser.email); // Real-time message updates
    } else {
      router.push("/login");
    }
  }, []);

  const fetchUserData = async (email) => {
    try {
      const q = query(collection(db, "owner"), where("email", "==", email));
      const querySnapshot = await getDocs(q); // getDocs is used to fetch the data from Firestore
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
      setUpload(querySnapshot.docs.map((doc) => doc.data()));
    } catch (error) {
      console.error("Error fetching user uploads:", error);
    }
  };

  const fetchMessages = (email) => {
    try {
      const q = query(
        collection(db, "messages"), // Get the "messages" collection
        where("ownerEmail", "==", email),
        where("sender", "==", "admin"),
        where("show", "==", false) // Filter messages where "show" is false
      );

      // Real-time listener for message changes
      onSnapshot(q, (querySnapshot) => {
        setMessageCount(querySnapshot.size); // Update message count
        const messagesData = querySnapshot.docs.map((doc) => doc.data());
        setMessages(messagesData); // Update messages state
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

      // After updating, the message count will be updated automatically due to real-time listener.
      router.push("/dashboard/messages");
    } catch (error) {
      console.error("Error updating messages:", error);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "bg-gray-900" : "bg-zinc-50"} transition-colors`}>
      <nav className="fixed w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 dark:from-gray-800 dark:to-gray-700 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between h-16 items-center">
          {darkMode && (
            <button onClick={toggleDarkMode} className="text-white hover:text-yellow-300 transition-colors">
              <Moon size={28} />
            </button>
          )}

          <motion.div className="text-2xl font-extrabold text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}>
            {userData ? (
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500">
                {userData.firstName} {userData.lastName}
              </span>
            ) : "Loading user data..."}
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

            <button onClick={handleMessageClick} className="relative text-white hover:text-yellow-300 transition-colors">
              <MessageCircle size={28} />
              {messageCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
                  {messageCount}
                </span>
              )}
            </button>

            {!darkMode && (
              <button onClick={toggleDarkMode} className="text-white hover:text-yellow-300 transition-colors">
                <Sun size={28} />
              </button>
            )}
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
              <p className="text-sm mb-4">Upload and manage your videos with ease.</p>
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
                    <p className="text-sm mb-4">Uploaded on: {video.uploadingDate?.toDate().toLocaleDateString()}</p>
                    <p className="text-sm">{video.description}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-300 mt-8">No uploads found.</p>
            )}
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
