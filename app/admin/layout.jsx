"use client";
import { useState, useEffect, useContext } from "react";
import Navbar1 from "../componet/Nav";
import Sidebar from "../componet/Sidebar";
import { db } from "../firebaseconfig";
import { collection, query, where, onSnapshot, setLogLevel } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { PuffLoader } from "react-spinners";
import { ThemeContext } from "../context/ThemeContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Suppress Firestore connectivity warnings
setLogLevel("error");

const AdminLayout = ({ children }) => {
  const [messageCount, setMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPending, setIsPending] = useState(null); // null indicates not yet checked
  const [userEmail, setUserEmail] = useState(null); // Store authenticated user's email
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  // Authenticate user and fetch their email
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
            position: "top-center",
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
          if (data.role !== "admin") {
            toast.error("Access denied. Admins only.", {
              position: "top-center",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === "light" ? "light" : "dark",
            });
            throw new Error("Access denied. Admins only.");
          }
          setUserEmail(data.email);
          setIsAuthenticated(true);
        } else {
          toast.error("User data incomplete. Please try again.", {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error("User data incomplete. Please try again.");
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

  // Fetch pending status in real-time from Firestore admin collection
  useEffect(() => {
    if (!isAuthenticated || !userEmail) return;

    const q = query(collection(db, "admin"), where("email", "==", userEmail));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const pendingStatus = userDoc.data().pending || false;
          setIsPending(pendingStatus);
        } else {
          toast.error("No admin profile found for this user.", {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          setIsPending(false); // Default to false if no document found
        }
      },
      (error) => {
        // Suppress Firestore connectivity errors
        if (error.message.includes("Could not reach Cloud Firestore backend")) {
          return; // Silently ignore connectivity errors
        }
        toast.error("Failed to fetch account status. Please try again.", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
        setIsPending(false); // Default to false on error
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, userEmail, theme]);

  // Fetch message count from Firestore
  useEffect(() => {
    if (!isAuthenticated || isPending) return;

    const q = query(
      collection(db, "messages"),
      where("sender", "==", "owner"),
      where("show", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        setMessageCount(querySnapshot.size);
      },
      (error) => {
        // Suppress Firestore connectivity errors
        if (error.message.includes("Could not reach Cloud Firestore backend")) {
          return; // Silently ignore connectivity errors
        }
        toast.error("Failed to fetch messages. Please try again.", {
          position: "top-center",
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
  }, [isAuthenticated, isPending, theme]);

  // Fetch notification count from Firestore
  useEffect(() => {
    if (!isAuthenticated || isPending) return;

    const q = query(collection(db, "owner"), where("approved", "==", false));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        setNotificationCount(querySnapshot.size);
      },
      (error) => {
        // Suppress Firestore connectivity errors
        if (error.message.includes("Could not reach Cloud Firestore backend")) {
          return; // Silently ignore connectivity errors
        }
        toast.error("Failed to fetch notifications. Please try again.", {
          position: "top-center",
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
  }, [isAuthenticated, isPending, theme]);

  // Display loading state
  if (loading || isPending === null) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${
          theme === "light" ? "bg-gray-100" : "bg-gray-900"
        }`}
      >
        <PuffLoader color="#3B82F6" size={60} />
        <ToastContainer
          position="top-center"
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
      </div>
    );
  }

  // Display pending message if account is pending
  if (isPending) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${
          theme === "light" ? "bg-gray-100" : "bg-gray-900"
        }`}
      >
        <div
          className={`p-6 rounded-lg shadow-lg ${
            theme === "light" ? "bg-white text-gray-900" : "bg-gray-800 text-white"
          }`}
        >
          <h1 className="text-2xl font-bold">Your account is processing</h1>
        </div>
        <ToastContainer
          position="top-center"
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
      </div>
    );
  }

  // Display original content if not pending
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className={`flex min-h-screen ${
        theme === "light" ? "bg-gray-100" : "bg-gray-900"
      }`}
    >
      <ToastContainer
        position="top-center"
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
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        theme={theme}
      />
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ paddingLeft: isCollapsed ? "80px" : "250px" }}
      >
        <div
          className="fixed top-0 left-0 right-0 z-50"
          style={{ marginLeft: isCollapsed ? "80px" : "250px" }}
        >
          <Navbar1
            messageCount={messageCount}
            notificationCount={notificationCount}
            theme={theme}
          />
        </div>
        <main
          className={`flex-1 p-6 overflow-y-auto mt-16 ${
            theme === "light" ? "bg-white text-gray-900" : "bg-gray-800 text-gray-200"
          } rounded-lg shadow-lg`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;