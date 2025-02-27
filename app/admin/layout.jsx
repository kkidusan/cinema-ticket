"use client";
import { useState, useEffect } from "react";
import Navbar1 from "../componet/Nav";
import Sidebar from "../componet/Sidebar";
import { auth, db } from "../firebaseconfig"; // Import Firebase auth and db
import { collection, query, where, onSnapshot } from "firebase/firestore"; // Firebase Firestore methods
import { useDarkMode } from "../context/DarkModeContext"; // Import the dark mode hook

const AdminLayout = ({ children }) => {
  const [messageCount, setMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const { darkMode, toggleDarkMode } = useDarkMode(); // Use dark mode context

  // Fetch message count from Firestore
  useEffect(() => {
    const user = auth.currentUser;

    if (user) {
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
    }
  }, []);

  // Fetch notification count from Firestore (owner collection where approved is false)
  useEffect(() => {
    const user = auth.currentUser;

    if (user) {
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
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col pl-[250px]"> {/* Add padding to account for Sidebar width */}
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