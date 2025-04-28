"use client";
import { Bell, MessageCircle, X, LogOut, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useContext, useEffect, useRef, useCallback } from "react";
import ThemeToggle from "./ThemeToggle";
import { ThemeContext } from "../context/ThemeContext";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseconfig"; // Adjust the import based on your Firebase setup

// Types
interface UserData {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  status?: number;
  createdAt?: string;
}

interface NavbarProps {
  messageCount: number;
  notificationCount: number;
}

const Navbar1 = ({ messageCount, notificationCount }: NavbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useContext(ThemeContext);
  const [showProfile, setShowProfile] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Use firstName for initial, fallback to email initial, then "U"
  const userInitial = userData?.firstName
    ? userData.firstName[0].toUpperCase()
    : userData?.email
    ? userData.email[0].toUpperCase()
    : "U";
  const profileRef = useRef<HTMLDivElement>(null);

  const pageTitles: { [key: string]: string } = {
    "/admin": "OverView",
    "/admin/approved": "Approved Requests",
    "/admin/message": "Messages",
    "/admin/managetransaction": "Manage Transactions",
    "/admin/promotion": "Post Promotion",
    "/admin/manageuser": "Manage User",
  };

  const currentTitle = pageTitles[pathname] || "Admin Dashboard";

  // Fetch user data
  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/validate", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Unauthorized");

      const data: UserData = await response.json();
      if (!data.email || !data.role) throw new Error("Invalid user data");

      if (data.role !== "admin") {
        router.push("/unauthorized");
        return;
      }

      // Fetch additional admin data from Firestore
      const adminQuery = query(collection(db, "admin"), where("email", "==", data.email));
      const querySnapshot = await getDocs(adminQuery);
      if (!querySnapshot.empty) {
        const adminData = querySnapshot.docs[0].data();
        setUserData({
          ...data,
          firstName: adminData.firstName || "",
          lastName: adminData.lastName || "",
          status: Number(adminData.status) || 0, // Convert to number to handle string cases
          createdAt: adminData.createdAt || "",
        });
      } else {
        setUserData(data); // Fallback to API data if no Firestore record
      }
    } catch (err: any) {
      console.error("Fetch user error:", err);
      setError("Failed to load profile. Please try again.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch user data on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleNotificationClick = () => {
    router.push("/admin/approved");
  };

  const handleMessageClick = () => {
    router.push("/admin/message");
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        router.push("/");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
    setShowProfile(false);
  };

  // Close Profile View when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfile]);

  // Loading state
  if (loading) {
    return (
      <div
        className={`${
          theme === "light" ? "bg-zinc-100" : "bg-gray-700"
        } shadow-md p-4 flex justify-center items-center`}
      >
        <p className={`${theme === "light" ? "text-gray-900" : "text-gray-100"}`}>Loading...</p>
      </div>
    );
  }

  // Error state (redirects handled by fetchUser)
  if (error) {
    return null;
  }

  // Unauthenticated state (redirected by fetchUser)
  if (!userData) {
    return null;
  }

  return (
    <div
      className={`${
        theme === "light" ? "bg-zinc-100" : "bg-gray-700"
      } shadow-md p-4 flex justify-between items-center relative`}
    >
      {/* Left Section: Title */}
      <h1
        className={`text-xl font-bold ${theme === "light" ? "text-gray-900" : "text-gray-100"}`}
      >
        {currentTitle}
      </h1>

      {/* Right Section: Icons and User Avatar */}
      <div className="flex items-center space-x-6">
        {/* Notification Icon */}
        <div className="relative group">
          <button
            onClick={handleNotificationClick}
            className={`p-2 ${
              theme === "light" ? "text-gray-700 hover:text-blue-600" : "text-gray-400 hover:text-blue-400"
            } transition-colors`}
          >
            <Bell size={24} />
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5">
              {notificationCount}
            </span>
          </button>
          <div
            className={`absolute top-10 left-1/2 transform -translate-x-1/2 ${
              theme === "light" ? "bg-gray-800 text-white" : "bg-gray-700 text-gray-300"
            } text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
          >
            Notifications
            <div
              className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 ${
                theme === "light" ? "bg-gray-800" : "bg-gray-700"
              } rotate-45`}
            ></div>
          </div>
        </div>

        {/* Message Icon */}
        <div className="relative group">
          <button
            onClick={handleMessageClick}
            className={`p-2 ${
              theme === "light" ? "text-gray-700 hover:text-blue-600" : "text-gray-400 hover:text-blue-400"
            } transition-colors`}
          >
            <MessageCircle size={24} />
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5">
              {messageCount}
            </span>
          </button>
          <div
            className={`absolute top-10 left-1/2 transform -translate-x-1/2 ${
              theme === "light" ? "bg-gray-800 text-white" : "bg-gray-700 text-gray-300"
            } text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
          >
            Messages
            <div
              className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 ${
                theme === "light" ? "bg-gray-800" : "bg-gray-700"
              } rotate-45`}
            ></div>
          </div>
        </div>

        {/* User Avatar */}
        <div className="relative group">
          <button
            onClick={toggleProfile}
            className={`p-2 flex items-center justify-center w-10 h-10 ${
              theme === "light" ? "bg-blue-500" : "bg-blue-600"
            } text-white rounded-full hover:bg-blue-600 transition-colors`}
          >
            <span className="font-semibold text-lg">{userInitial}</span>
          </button>
          <div
            className={`absolute top-10 left-1/2 transform -translate-x-1/2 ${
              theme === "light" ? "bg-gray-800 text-white" : "bg-gray-700 text-gray-300"
            } text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
          >
            Profile
            <div
              className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 ${
                theme === "light" ? "bg-gray-800" : "bg-gray-700"
              } rotate-45`}
            ></div>
          </div>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>

      {/* Profile View */}
      {showProfile && (
        <div
          ref={profileRef}
          className={`absolute top-16 right-4 ${
            theme === "light" ? "bg-zinc-100" : "bg-gray-700"
          } shadow-lg rounded-lg w-64 p-4 z-50`}
        >
          <button
            onClick={toggleProfile}
            className={`absolute top-2 right-2 p-1 
              ${theme === "light" ? "text-gray-700 hover:text-red-500" : "text-gray-300 hover:text-red-400"}
              transition-colors`}
          >
            <X size={18} />
          </button>
          <div className="flex items-center space-x-3 mb-4">
            <div
              className={`w-10 h-10 
                ${theme === "light" ? "bg-blue-500" : "bg-blue-600"} 
                rounded-full flex items-center justify-center text-white font-semibold`}
            >
              {userInitial}
            </div>
            <div>
              <p
                className={`text-sm font-semibold 
                  ${theme === "light" ? "text-gray-900" : "text-gray-100"}`}
              >
                {userData.firstName && userData.lastName
                  ? `${userData.firstName} ${userData.lastName}`
                  : "Admin User"}
              </p>
              <p
                className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}
              >
                {userData.email}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                router.push("/admin/profile");
                setShowProfile(false);
              }}
              className={`w-full text-left p-2 text-sm flex items-center gap-2 
                ${theme === "light" ? "text-gray-700 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-600"} 
                rounded-lg transition-colors`}
            >
              View Profile
            </button>
            {userData.status !== 1 && (
              <button
                onClick={() => {
                  router.push("/admin/create-account");
                  setShowProfile(false);
                }}
                className={`w-full text-left p-2 text-sm flex items-center gap-2 
                  ${theme === "light" ? "text-gray-700 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-600"} 
                  rounded-lg transition-colors`}
              >
                <Plus size={16} />
                Add
              </button>
            )}
            <button
              onClick={handleLogout}
              className={`w-full text-left p-2 text-sm flex items-center gap-2 
                bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors`}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar1;