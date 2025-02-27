"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sun, Moon, MessageCircle, Loader2 } from "lucide-react"; // Removed User icon
import { auth, db } from "../firebaseconfig"; // Importing authentication and database configurations from firebase
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore"; // Firebase methods for querying and updating data
import Footer from "../componet/Footer"; // Importing the Footer component

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState(null);
  const [upload, setUpload] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4); // Initially show 4 movies
  const [messageCount, setMessageCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [userMovies, setUserMovies] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state
  const [isApproved, setIsApproved] = useState(null); // Track if the user is approved (null initially)
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setDarkMode(savedTheme === "dark");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");

    const authUser = auth.currentUser;
    if (authUser) {
      setUserEmail(authUser.email);
      fetchUserData(authUser.email);
    } else {
      router.push("/login");
    }
  }, []);

  const fetchUserData = async (email) => {
    try {
      const q = query(collection(db, "owner"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0].data();
        setUserData(userDoc);

        // Check if the user is approved
        if (userDoc.approved === false) {
          setIsApproved(false); // User is not approved
        } else {
          setIsApproved(true); // User is approved
          fetchUserUpload(email);
          fetchMessages(email);
          fetchUserMovies(email);
        }
      } else {
        setIsApproved(false); // If no user data found, assume not approved
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false); // Set loading to false after fetching data
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
        const messagesData = querySnapshot.docs.map((doc) => doc.data());
        setMessages(messagesData);
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

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  const handleMovieClick = (movieID) => {
    router.push(`/dashboard/videodetial/${movieID}`);
  };

  // Handle Show More button click
  const handleShowMore = () => {
    setVisibleCount(visibleCount + 4); // Increase visible count by 4
  };

  const handleShowLess = () => {
    setVisibleCount((prev) => Math.max(4, prev - 4));
  };

  // Dynamic stats based on userMovies
  const stats = {
    totalMovies: userMovies.length, // Total number of movies uploaded
    averageRating: 4.5, // Static average rating
    mostPopularGenre: "Action", // Static most popular genre
    totalViews: 15000, // Static total views
    totalLikes: 1200, // Static total likes
    totalComments: 450, // Static total comments
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "bg-gray-900" : "bg-zinc-50"} transition-colors`}>
      {/* Navigation Bar */}
      <nav className="fixed w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 dark:from-gray-800 dark:to-gray-700 shadow-lg z-50">
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
              "Loading user data..."
            )}
          </motion.div>

          <div className="flex items-center space-x-6 ml-auto">
            {/* Profile Button with Hover Text */}
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="relative flex items-center space-x-2 text-white text-lg font-medium hover:text-yellow-300 transition-colors group"
              title="Profile"
            >
              {userData ? (
                <div className="w-9 h-9 flex items-center justify-center bg-blue-500 rounded-full text-white font-bold">
                  {userData.firstName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-6 h-6 flex items-center justify-center bg-blue-500 rounded-full text-white font-bold">
                  U
                </div>
              )}
              {/* Hover Text */}
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Profile
              </span>
            </button>

            {/* Message Button with Hover Text */}
            <button
              onClick={handleMessageClick}
              className="relative text-white hover:text-yellow-300 transition-colors group"
              title="Message"
            >
              <MessageCircle size={28} />
              {messageCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
                  {messageCount}
                </span>
              )}
              {/* Hover Text */}
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Message
              </span>
            </button>

            {/* Dark Mode Toggle Button */}
            <button onClick={toggleDarkMode} className="text-white hover:text-yellow-300 transition-colors">
              {darkMode ? <Moon size={28} /> : <Sun size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="flex-grow p-6">
        {loading ? (
          // Loading state
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="ml-3 text-gray-700 dark:text-gray-300">Loading dashboard...</p>
          </div>
        ) : isApproved === false ? (
          // User is not approved
          <div className="text-center text-gray-700 dark:text-gray-300">
            <p className="text-xl">Your request is being processed. Please wait a few days.</p>
          </div>
        ) : (
          // User is approved, show dashboard content
          <>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">Owner's Role and Responsibilities</h3>
                <ul className="list-disc pl-5 mt-4 text-gray-600 dark:text-gray-300">
                  <li>Manage video uploads and oversee content shared on the platform.</li>
                  <li>Approve or reject uploads based on platform guidelines.</li>
                  <li>Handle real-time messages from the admin.</li>
                  <li>Maintain personal settings and customize dashboard.</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">Video Upload Management</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  The owner can upload, manage, and organize videos, providing details such as titles, descriptions, and posters.
                </p>

                <div className="bg-gray-100 dark:bg-gray-700 p-6 mt-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                  <h4 className="text-xl font-semibold text-gray-800 dark:text-white">Upload New Video</h4>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Upload new videos by providing a title, description, and poster. Your videos will be added to the platform.
                  </p>
                  <button
                    onClick={() => router.push("/dashboard/upload")}
                    className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                  >
                    Upload New Video
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 text-center">
              <h2 className="text-4xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text">
                Your Posts on This Site
              </h2>
              <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
                Explore and manage your uploaded videos with ease!
              </p>
            </div>

            {/* User Uploaded Movies Section */}
            <div className="flex-grow p-6 mt-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Your Uploaded Movies
              </h2>

              {userMovies.length === 0 ? (
                // No movies uploaded
                <div className="text-center text-gray-700 dark:text-gray-300">
                  <p className="text-xl">You have not uploaded any movies.</p>
                </div>
              ) : (
                // Display movies
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {userMovies.slice(0, visibleCount).map((movie, index) => (
                      <div
                        key={index}
                        className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                        onClick={() => handleMovieClick(movie.movieID)}
                      >
                        <p className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
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
                      <button onClick={handleShowMore} className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
                        Show More...
                      </button>
                    )}
                    {visibleCount > 4 && (
                      <button onClick={handleShowLess} className="ml-4 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600">
                        Show Less
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Statistical Analysis Section */}
            <div className="mt-16 p-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Statistical Analysis
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Movies Uploaded */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Total Movies Uploaded
                  </h3>
                  <p className="mt-4 text-4xl font-bold text-blue-500 dark:text-blue-300">
                    {stats.totalMovies}
                  </p>
                </div>

                {/* Average Rating */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Average Rating
                  </h3>
                  <p className="mt-4 text-4xl font-bold text-green-500 dark:text-green-300">
                    {stats.averageRating} ⭐
                  </p>
                </div>

                {/* Most Popular Genre */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Most Popular Genre
                  </h3>
                  <p className="mt-4 text-4xl font-bold text-purple-500 dark:text-purple-300">
                    {stats.mostPopularGenre}
                  </p>
                </div>

                {/* Total Views */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Total Views
                  </h3>
                  <p className="mt-4 text-4xl font-bold text-yellow-500 dark:text-yellow-300">
                    {stats.totalViews.toLocaleString()}
                  </p>
                </div>

                {/* Total Likes */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Total Likes
                  </h3>
                  <p className="mt-4 text-4xl font-bold text-pink-500 dark:text-pink-300">
                    {stats.totalLikes.toLocaleString()}
                  </p>
                </div>

                {/* Total Comments */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Total Comments
                  </h3>
                  <p className="mt-4 text-4xl font-bold text-red-500 dark:text-red-300">
                    {stats.totalComments.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}