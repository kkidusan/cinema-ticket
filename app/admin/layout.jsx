"use client";
import { useState, useEffect, useContext } from "react";
import Navbar1 from "../componet/Nav";
import Sidebar from "../componet/Sidebar";
import { auth, db } from "../firebaseconfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { WaveLoader } from "react-loaders-kit";
import { ThemeContext } from "../context/ThemeContext";

const AdminLayout = ({ children }) => {
  const [messageCount, setMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme } = useContext(ThemeContext); // Access the theme from ThemeContext

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
          if (data.role !== "admin") {
            router.replace("/login");
            return;
          }
          setIsAuthenticated(true);
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

  // Fetch message count from Firestore
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMessageCount = async () => {
      try {
        const q = query(
          collection(db, "messages"),
          where("sender", "==", "owner"),
          where("show", "==", false)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          setMessageCount(querySnapshot.size);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching message count:", error);
      }
    };

    fetchMessageCount();
  }, [isAuthenticated]);

  // Fetch notification count from Firestore
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchNotificationCount = async () => {
      try {
        const q = query(
          collection(db, "owner"),
          where("approved", "==", false)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          setNotificationCount(querySnapshot.size);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchNotificationCount();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${
          theme === "light" ? "bg-gray-100" : "bg-gray-900"
        }`}
      >
        <WaveLoader loading={loading} size={100} color="#6D28D9" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className={`flex min-h-screen ${
        theme === "light" ? "bg-gray-100" : "bg-gray-900"
      }`}
    >
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        theme={theme} // Pass theme to Sidebar
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
            theme={theme} // Pass theme to Navbar1
          />
        </div>
        <main
          className={`flex-1 p-6 overflow-y-auto mt-16 ${
            theme === "light" ? "text-gray-900" : "text-gray-200"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;