"use client";
import { useState, useEffect, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, MessageCircle, LogOut, Upload, Bell, Menu } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseconfig";
import Footer from "../componet/Footer";
import { PuffLoader } from "react-spinners";
import ThemeToggle from "../componet/ThemeToggle";
import { ThemeContext } from "../context/ThemeContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userData, setUserData] = useState(null);
  const [userMovies, setUserMovies] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [messageCount, setMessageCount] = useState(0);
  const [cancelledMoviesCount, setCancelledMoviesCount] = useState(0);
  const [cancelledMovies, setCancelledMovies] = useState([]);
  const [isCancelledMoviesOpen, setIsCancelledMoviesOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(null); // Changed from isApproved to isPending
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const router = useRouter();
  const { theme = "light" } = useContext(ThemeContext) || {};
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mainContentRef = useRef(null);
  const cancelledMoviesRef = useRef(null);

  // Check if the screen is in mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    checkMobileView();
    window.addEventListener("resize", checkMobileView);
    return () => window.removeEventListener("resize", checkMobileView);
  }, []);

  // Handle clicks outside profile, mobile menu, and cancelled movies card
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
      if (cancelledMoviesRef.current && !cancelledMoviesRef.current.contains(event.target)) {
        setIsCancelledMoviesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scrolling and apply blur to main content when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      if (mainContentRef.current) {
        mainContentRef.current.style.filter = "blur(4px)";
        mainContentRef.current.style.transition = "filter 0.3s ease";
      }
    } else {
      document.body.style.overflow = "auto";
      if (mainContentRef.current) {
        mainContentRef.current.style.filter = "none";
        mainContentRef.current.style.transition = "filter 0.3s ease";
      }
    }
    return () => {
      document.body.style.overflow = "auto";
      if (mainContentRef.current) {
        mainContentRef.current.style.filter = "none";
      }
    };
  }, [isMobileMenuOpen]);

  // Fetch user email, role, and validate authentication using /api/validate?role=owner
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate?role=owner", {
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
        if (data.email && data.role === "owner") {
          setUserEmail(data.email);
          setUserRole(data.role);
          setIsAuthenticated(true);
        } else {
          const errorMessage = "User is not an owner or email is missing.";
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
      } catch (error) {
        setTimeout(() => {
          router.replace("/login");
        }, 3500);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router, theme]);

  // Fetch cancelled movies count and data
  useEffect(() => {
    if (!isAuthenticated || !userEmail) return;

    const q = query(
      collection(db, "Movies"),
      where("email", "==", userEmail),
      where("cancellation", "==", true),
      where("showStatus", "==", 1)
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        setCancelledMoviesCount(querySnapshot.size);
        setCancelledMovies(querySnapshot.docs.map((doc) => doc.data()));
      },
      (error) => {
        toast.error("Failed to fetch cancelled movies.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
      }
    );
    return () => unsubscribe();
  }, [isAuthenticated, userEmail, theme]);

  // Fetch user data, movies, and messages
  useEffect(() => {
    if (!isAuthenticated || !userEmail || userRole !== "owner") return;

    const fetchUserData = async () => {
      try {
        const q = query(collection(db, "owner"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUserData(querySnapshot.docs[0].data());
        }
      } catch (error) {
        toast.error("Failed to fetch user data.", {
          position: "top-right",
          autoClose: 3000,
          theme: theme === "light" ? "light" : "dark",
        });
      }
    };

    const fetchMovies = () => {
      try {
        const q = query(collection(db, "Movies"), where("email", "==", userEmail));
        return onSnapshot(
          q,
          (querySnapshot) => {
            const movies = querySnapshot.docs.map((doc) => doc.data());
            setUserMovies(movies);
            const totalComments = movies.reduce((sum, movie) => {
              const reviews = Array.isArray(movie.reviews) ? movie.reviews : [];
              return sum + reviews.length;
            }, 0);
            setStats((prev) => ({
              ...prev,
              totalMovies: movies.length,
              totalComments,
            }));
          },
          (error) => {
            toast.error("Failed to fetch movies.", {
              position: "top-right",
              autoClose: 3000,
              theme: theme === "light" ? "light" : "dark",
            });
          }
        );
      } catch (error) {
        toast.error("Failed to fetch movies.", {
          position: "top-right",
          autoClose: 3000,
          theme: theme === "light" ? "light" : "dark",
        });
        return () => {};
      }
    };

    const fetchMessages = () => {
      try {
        const q = query(
          collection(db, "messages"),
          where("ownerEmail", "==", userEmail),
          where("sender", "==", "admin"),
          where("show", "==", true)
        );
        return onSnapshot(
          q,
          (querySnapshot) => {
            setMessageCount(querySnapshot.size);
            setMessages(querySnapshot.docs.map((doc) => doc.data()));
          },
          (error) => {
            toast.error("Failed to fetch messages.", {
              position: "top-right",
              autoClose: 3000,
              theme: theme === "light" ? "light" : "dark",
            });
          }
        );
      } catch (error) {
        toast.error("Failed to fetch messages.", {
          position: "top-right",
          autoClose: 3000,
          theme: theme === "light" ? "light" : "dark",
        });
        return () => {};
      }
    };

    fetchUserData();
    const unsubscribeMovies = fetchMovies();
    const unsubscribeMessages = fetchMessages();
    return () => {
      unsubscribeMovies && unsubscribeMovies();
      unsubscribeMessages && unsubscribeMessages();
    };
  }, [isAuthenticated, userEmail, userRole, theme]);

  // Real-time listener for user pending status
  useEffect(() => {
    if (!isAuthenticated || !userEmail) return;
    const q = query(collection(db, "owner"), where("email", "==", userEmail));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          setIsPending(userDoc.pending === true); // Check for pending === true
        } else {
          setIsPending(false); // Default to false if no user document found
        }
      },
      (error) => {
        toast.error("Failed to fetch pending status.", {
          position: "top-right",
          autoClose: 3000,
          theme: theme === "light" ? "light" : "dark",
        });
      }
    );
    return () => unsubscribe();
  }, [isAuthenticated, userEmail, theme]);

  const handleMessageClick = async () => {
    try {
      const q = query(
        collection(db, "messages"),
        where("ownerEmail", "==", userEmail),
        where("sender", "==", "admin"),
        where("show", "==", true)
      );
      const querySnapshot = await getDocs(q);
      for (const docSnapshot of querySnapshot.docs) {
        const messageDocRef = doc(db, "messages", docSnapshot.id);
        await updateDoc(messageDocRef, { show: false });
      }
      router.push("/dashboard/messages");
    } catch (error) {
      toast.error("Failed to update messages.", {
        position: "top-right",
        autoClose: 3000,
        theme: theme === "light" ? "light" : "dark",
      });
    }
  };

  const handleNotificationClick = async () => {
    try {
      const q = query(
        collection(db, "Movies"),
        where("email", "==", userEmail),
        where("cancellation", "==", true)
      );
      const querySnapshot = await getDocs(q);
      for (const docSnapshot of querySnapshot.docs) {
        const movieDocRef = doc(db, "Movies", docSnapshot.id);
        await updateDoc(movieDocRef, { showStatus: 0 });
      }
      setIsCancelledMoviesOpen(!isCancelledMoviesOpen);
    } catch (error) {
      toast.error("Failed to update cancelled movies status.", {
        position: "top-right",
        autoClose: 3000,
        theme: theme === "light" ? "light" : "dark",
      });
    }
  };

  const handleMovieClick = (movieID) => {
    router.push(`/dashboard/videodetial/${movieID}`);
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 4);
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
        toast.success("Logged out successfully.", {
          position: "top-right",
          autoClose: 2000,
          theme: theme === "light" ? "light" : "dark",
        });
        router.replace("/");
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      toast.error("Failed to log out.", {
        position: "top-right",
        autoClose: 3000,
        theme: theme === "light" ? "light" : "dark",
      });
    }
  };

  const [stats, setStats] = useState({
    totalMovies: 0,
    mostPopularGenre: "Action",
    totalComments: 0,
  });

  const profileMenuItems = [
    { label: "My Account", path: "/dashboard/profile" },
    { label: "Withdraw", path: "/dashboard/finance?tab=withdraw" },
    { label: "Deposit", path: "/dashboard/finance?tab=deposit" },
    { label: "Transaction", path: "/dashboard/finance?tab=transaction" },
    { label: "Design Cinema Seat Position", path: "/dashboard/designseat" },
  ];

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "light" ? "bg-zinc-50" : "bg-gray-900"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#36D7B7" size={100} />
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "light" ? "bg-zinc-50" : "bg-gray-900"
      }`}
    >
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
      `}</style>
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
      <nav
        className={`fixed w-full ${
          theme === "light"
            ? "bg-gradient-to-r from-white to-gray-50"
            : "bg-gradient-to-r from-gray-800 to-gray-900"
        } border-b ${
          theme === "light" ? "border-gray-200" : "border-gray-700"
        } shadow-md z-50`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <motion.div
            className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {userData ? `${userData.firstName} ${userData.lastName}` : "Loading..."}
          </motion.div>
          <div className="hidden sm:flex items-center space-x-4">
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <button
                onClick={handleNotificationClick}
                className={`p-2 rounded-full ${
                  theme === "light"
                    ? "text-gray-600 hover:bg-gray-100"
                    : "text-gray-300 hover:bg-gray-700"
                } transition-colors duration-200`}
              >
                <Bell size={24} />
                {cancelledMoviesCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full px-2 py-0.5 shadow-md ${
                      cancelledMoviesCount > 0 ? "animate-[pulse_2s_infinite]" : ""
                    }`}
                  >
                    {cancelledMoviesCount}
                  </span>
                )}
              </button>
              <span
                className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              >
                Cancelled Movies
              </span>
              <AnimatePresence>
                {isCancelledMoviesOpen && (
                  <motion.div
                    ref={cancelledMoviesRef}
                    className={`absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto ${
                      theme === "light"
                        ? "bg-gradient-to-br from-white to-gray-100"
                        : "bg-gradient-to-br from-gray-800 to-gray-900"
                    } rounded-xl shadow-2xl border ${
                      theme === "light" ? "border-gray-200" : "border-gray-700"
                    } p-4 z-50 backdrop-blur-md`}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "light" ? "text-gray-800" : "text-gray-100"
                      } mb-3 flex items-center space-x-2`}
                    >
                      <Bell size={20} className="text-red-500" />
                      <span>Cancelled Movies</span>
                    </h3>
                    {cancelledMovies.length > 0 ? (
                      cancelledMovies.map((movie, index) => (
                        <motion.div
                          key={index}
                          className={`p-3 rounded-lg mb-2 cursor-pointer ${
                            theme === "light" ? "bg-gray-50" : "bg-gray-700"
                          } border-l-4 border-red-500`}
                          onClick={() => handleMovieClick(movie.movieID)}
                        >
                          <p
                            className={`text-base font-medium ${
                              theme === "light" ? "text-gray-800" : "text-gray-100"
                            }`}
                          >
                            {movie.title}
                          </p>
                          <p className="text-sm text-red-500 font-semibold mt-1">
                            The Movie is cancelled !!
                          </p>
                        </motion.div>
                      ))
                    ) : (
                      <div
                        className={`p-3 text-sm ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        No cancelled movies.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <button
                onClick={handleMessageClick}
                className={`p-2 rounded-full ${
                  theme === "light"
                    ? "text-gray-600 hover:bg-gray-100"
                    : "text-gray-300 hover:bg-gray-700"
                } transition-colors duration-200`}
              >
                <MessageCircle size={24} />
                {messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {messageCount}
                  </span>
                )}
              </button>
              <span
                className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              >
                Messages
              </span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ThemeToggle />
            </motion.div>
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
              ref={profileRef}
            >
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`p-2 rounded-full ${
                  theme === "light"
                    ? "text-gray-600 hover:bg-gray-100"
                    : "text-gray-300 hover:bg-gray-700"
                } transition-colors duration-200`}
              >
                <User size={24} />
              </button>
              <span
                className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              >
                Profile
              </span>
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    className={`absolute right-0 mt-2 w-48 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    } rounded-lg shadow-xl border ${
                      theme === "light" ? "border-gray-200" : "border-gray-700"
                    } overflow-hidden`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {profileMenuItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          router.push(item.path);
                          setIsProfileOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          theme === "light"
                            ? "text-gray-700 hover:bg-gray-100"
                            : "text-gray-300 hover:bg-gray-700"
                        } transition-colors duration-150 flex items-center space-x-2`}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsProfileOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        theme === "light"
                          ? "text-red-600 hover:bg-red-50"
                          : "text-red-400 hover:bg-red-900"
                      } transition-colors duration-150 flex items-center space-x-2`}
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          <motion.div
            className="sm:hidden"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`p-2 rounded-full ${
                theme === "light"
                  ? "text-gray-600 hover:bg-gray-100"
                  : "text-gray-300 hover:bg-gray-700"
                } transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500`}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <motion.div
                animate={isMobileMenuOpen ? { rotate: 180 } : { rotate: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isMobileMenuOpen ? (
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </motion.svg>
                ) : (
                  <Menu size={24} />
                )}
              </motion.div>
            </button>
          </motion.div>
        </div>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              className={`sm:hidden absolute top-20 left-0 right-0 max-w-md mx-auto mt-2 z-40 ${
                theme === "light"
                  ? "bg-gradient-to-br from-blue-50 to-purple-50"
                  : "bg-gradient-to-br from-gray-800 to-gray-900"
              } p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow border ${
                theme === "light" ? "border-gray-200" : "border-gray-700"
              }`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={() => {
                    handleMessageClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex justify-center items-center space-x-2 px-4 py-2 rounded-md ${
                    theme === "light"
                      ? "text-gray-600 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-gray-700"
                  } transition-colors duration-200`}
                >
                  <MessageCircle size={20} />
                  <span>Messages</span>
                  {messageCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {messageCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    handleNotificationClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex justify-center items-center space-x-2 px-4 py-2 rounded-md ${
                    theme === "light"
                      ? "text-gray-600 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-gray-700"
                  } transition-colors duration-200`}
                >
                  <Bell size={20} />
                  <span>Notifications</span>
                  {cancelledMoviesCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {cancelledMoviesCount}
                    </span>
                  )}
                </button>
                <div className="w-full flex justify-center py-2">
                  <ThemeToggle />
                </div>
                {profileMenuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      router.push(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-center px-4 py-2 rounded-md ${
                      theme === "light"
                        ? "text-gray-600 hover:bg-gray-100"
                        : "text-gray-300 hover:bg-gray-700"
                    } transition-colors duration-200`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex justify-center items-center space-x-2 px-4 py-2 rounded-md ${
                    theme === "light"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-red-400 hover:bg-red-900"
                  } transition-colors duration-200`}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <div ref={mainContentRef}>
        {isPending === true ? ( // Changed condition to check isPending === true
          <div
            className={`min-h-screen flex items-center justify-center ${
              theme === "light" ? "bg-zinc-50" : "bg-gray-900"
            }`}
          >
            <motion.div
              className="text-center px-4"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.h1
                className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                Request Pending
              </motion.h1>
              <motion.p
                className={`mt-4 text-lg sm:text-xl ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              >
                Your request is being processed. Please wait a few days.
              </motion.p>
              <motion.div
                classTypclassName="mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 border-4 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p
                  className={`mt-4 ${
                    theme === "light" ? "text-gray-600" : "text-gray-400"
                  } text-sm sm:text-base`}
                >
                  We appreciate your patience!
                </p>
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-8 pt-20 sm:pt-24">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <motion.div
                  className={`${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-50 to-purple-50"
                      : "bg-gradient-to-br from-gray-800 to-gray-900"
                  } p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <h3
                    className={`text-xl sm:text-2xl font-bold ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    } mb-6`}
                  >
                    Owner's Role and Responsibilities
                  </h3>
                  <ul className="space-y-4 text-sm sm:text-base">
                    <li className="flex items-center space-x-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span
                        className={`${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        Manage video uploads and oversee content shared on the
                        platform.
                      </span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span
                        className={`${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        Approve or reject uploads based on platform guidelines.
                      </span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                      <span
                        className={`${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        Handle real-time messages from the admin.
                      </span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span
                        className={`${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        Maintain personal settings and customize dashboard.
                      </span>
                    </li>
                  </ul>
                </motion.div>
                <motion.div
                  className={`${
                    theme === "light"
                      ? "bg-gradient-to-br from-purple-50 to-pink-50"
                      : "bg-gradient-to-br from-gray-800 to-gray-900"
                  } p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <h3
                    className={`text-xl sm:text-2xl font-bold ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    } mb-6`}
                  >
                    Movie Ticket Upload Management
                  </h3>
                  <p
                    className={`${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    } mb-6 text-sm sm:text-base`}
                  >
                    The owner can upload, manage, and organize movie tickets,
                    providing details such as titles, descriptions, and posters.
                  </p>
                  <div
                    className={`${
                      theme === "light"
                        ? "bg-gradient-to-br from-blue-100 to-purple-100"
                        : "bg-gradient-to-br from-gray-700 to-gray-800"
                    } p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow`}
                  >
                    <h4
                      className={`text-lg sm:text-xl font-semibold ${
                        theme === "light" ? "text-gray-800" : "text-gray-100"
                      } mb-4`}
                    >
                      Upload Movie Ticket
                    </h4>
                    <p
                      className={`${
                        theme === "light" ? "text-gray-700" : "text-gray-300"
                      } mb-6 text-sm sm:text-base`}
                    >
                      Upload new movie tickets by providing a title, description,
                      and poster. Your tickets will be added to the platform.
                    </p>
                    <button
                      onClick={() => router.push("/dashboard/videoUploadDetail")}
                      className={`bg-transparent border-2 ${
                        theme === "light"
                          ? "border-purple-600 text-purple-700"
                          : "border-purple-400 text-purple-300"
                      } px-4 py-2 rounded-md transition-all hover:bg-purple-600 hover:text-white flex items-center space-x-2 text-sm sm:text-base`}
                    >
                      <Upload size={16} />
                      <span>Upload Movie Ticket</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
            <div className="flex-grow p-4 sm:p-8">
              <h2
                className={`text-2xl sm:text-3xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-gray-100"
                } mb-6`}
              >
                Your Uploaded Tickets
              </h2>
              {userMovies.length === 0 ? (
                <div
                  className={`text-center ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  <p className="text-lg sm:text-xl">
                    You have not uploaded any movies.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {userMovies.slice(0, visibleCount).map((movie, index) => (
                      <div
                        key={index}
                        className={`${
                          theme === "light"
                            ? "bg-gradient-to-br from-blue-50 to-purple-50"
                            : "bg-gradient-to-br from-gray-800 to-gray-900"
                        } p-4 sm:p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer`}
                        onClick={() => handleMovieClick(movie.movieID)}
                      >
                        <p
                          className={`text-base sm:text-lg font-semibold ${
                            theme === "light" ? "text-gray-800" : "text-gray-100"
                          } mb-4`}
                        >
                          Movie Name: {movie.title}
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
                        className={`bg-transparent border-2 ${
                          theme === "light"
                            ? "border-purple-600 text-purple-700"
                            : "border-purple-400 text-purple-300"
                        } px-4 py-2 rounded-md transition-all hover:bg-purple-600 hover:text-white mr-4 text-sm sm:text-base`}
                      >
                        Show More...
                      </button>
                    )}
                    {visibleCount > 4 && (
                      <button
                        onClick={handleShowLess}
                        className={`bg-transparent border-2 ${
                          theme === "light"
                            ? "border-purple-600 text-purple-700"
                            : "border-purple-400 text-purple-300"
                        } px-4 py-2 rounded-md transition-all hover:bg-purple-600 hover:text-white text-sm sm:text-base`}
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="mt-12 sm:mt-16 p-4 sm:p-8">
              <h2
                className={`text-2xl sm:text-3xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-gray-100"
                } mb-6`}
              >
                Statistical Analysis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div
                  className={`${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-50 to-purple-50"
                      : "bg-gradient-to-br from-gray-800 to-gray-900"
                  } p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}
                >
                  <h3
                    className={`text-lg sm:text-2xl font-semibold ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    }`}
                  >
                    Total Movies Uploaded
                  </h3>
                  <p className="mt-4 text-3xl sm:text-4xl font-bold text-blue-500">
                    {stats.totalMovies}
                  </p>
                </div>
                <div
                  className={`${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-50 to-purple-50"
                      : "bg-gradient-to-br from-gray-800 to-gray-900"
                  } p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}
                >
                  <h3
                    className={`text-lg sm:text-2xl font-semibold ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    }`}
                  >
                    Most Popular Genre
                  </h3>
                  <p className="mt-4 text-3xl sm:text-4xl font-bold text-purple-500">
                    {stats.mostPopularGenre}
                  </p>
                </div>
                <div
                  className={`${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-50 to-purple-50"
                      : "bg-gradient-to-br from-gray-800 to-gray-900"
                  } p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow`}
                >
                  <h3
                    className={`text-lg sm:text-2xl font-semibold ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    }`}
                  >
                    Total Comments
                  </h3>
                  <p className="mt-4 text-3xl sm:text-4xl font-bold text-red-500">
                    {stats.totalComments.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
        <Footer />
      </div>
    </div>
  );
}