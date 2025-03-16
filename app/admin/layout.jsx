"use client";
import { useState, useEffect } from "react";
import Navbar1 from "../componet/Nav";
import Sidebar from "../componet/Sidebar";
import { auth, db } from "../firebaseconfig"; // Import Firebase auth and db
import { collection, query, where, onSnapshot } from "firebase/firestore"; // Firebase Firestore methods
import { useDarkMode } from "../context/DarkModeContext"; // Import the dark mode hook
import { useRouter } from "next/navigation"; // Import useRouter for redirection
import { WaveLoader } from "react-loaders-kit"; // Import a wave animation loader

const AdminLayout = ({ children }) => {
  const [messageCount, setMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Authentication state
  const [loading, setLoading] = useState(true); // Loading state
  const { darkMode, toggleDarkMode } = useDarkMode(); // Use dark mode context
  const router = useRouter();

  // Fetch user authentication details
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
          // Check if the user is an admin
          if (data.role !== "admin") {
            router.replace("/login"); // Redirect to login if not admin
            return;
          }
          setIsAuthenticated(true); // Set authenticated state
        } else {
          throw new Error("No email or role found");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        router.replace("/login");
      } finally {
        setLoading(false); // Stop loading after authentication check
      }
    };

    fetchUser();
  }, [router]);

  // Fetch message count from Firestore
  useEffect(() => {
    if (!isAuthenticated) return; // Only fetch data if authenticated

    const fetchMessageCount = async () => {
      try {
        const q = query(
          collection(db, "messages"),
          where("sender", "==", "owner"), // Filter by sender
          where("show", "==", false) // Filter by unread messages
        );

        // Set up a real-time listener
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          setMessageCount(querySnapshot.size); // Update the count in real-time
        });

        // Clean up the listener when the component unmounts
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching message count:", error);
      }
    };

    fetchMessageCount();
  }, [isAuthenticated]);

  // Fetch notification count from Firestore
  useEffect(() => {
    if (!isAuthenticated) return; // Only fetch data if authenticated

    const fetchNotificationCount = async () => {
      try {
        const q = query(
          collection(db, "owner"),
          where("approved", "==", false) // Filter by unapproved requests
        );

        // Set up a real-time listener
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          setNotificationCount(querySnapshot.size); // Update the count in real-time
        });

        // Clean up the listener when the component unmounts
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchNotificationCount();
  }, [isAuthenticated]);

  // Show loading animation while validating authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <WaveLoader
          loading={loading}
          size={100}
          color={darkMode ? "#FFFFFF" : "#6D28D9"}
        />
      </div>
    );
  }

  // Show nothing if the user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ paddingLeft: isCollapsed ? "80px" : "250px" }} // Adjust padding based on sidebar state
      >
        {/* Navbar */}
        <Navbar1
          messageCount={messageCount}
          notificationCount={notificationCount} // Pass notification count to Navbar1
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;