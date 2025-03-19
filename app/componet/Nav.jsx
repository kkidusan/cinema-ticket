"use client";
import { Bell, MessageCircle, Sun, Moon, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const Navbar1 = ({ messageCount, notificationCount, darkMode, toggleDarkMode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false); // State to manage profile visibility
  const userEmail = "admin@example.com"; // Replace with dynamic user email from your auth system
  const userInitial = userEmail ? userEmail[0].toUpperCase() : "U"; // Get the first letter of the email

  // Mapping of paths to titles
  const pageTitles = {
    "/admin": "OverView",
    "/admin/approved": "Approved Requests",
    "/admin/message": "Messages",
    "/admin/managetransaction": "Manage Transactions",
    "/admin/promotion": "Post Promotion",
    "/admin/manageuser": "Manage User",


  };

  // Get the current page title based on the pathname
  const currentTitle = pageTitles[pathname] || "Admin Dashboard";

  // Handle notification icon click
  const handleNotificationClick = () => {
    router.push("/admin/approved");
  };

  // Handle message icon click
  const handleMessageClick = () => {
    router.push("/admin/message");
  };

  // Toggle profile view
  const toggleProfile = () => {
    setShowProfile(!showProfile);
  };

  // Logout function
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Clear any client-side state if necessary
        router.push("/"); // Redirect to home page or login page
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center relative">
      {/* Dynamic Header Title */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        {currentTitle}
      </h1>
      <div className="flex items-center space-x-6">
        {/* Notification Icon with Tooltip */}
        <div className="relative group">
          <button
            onClick={handleNotificationClick}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Bell size={24} />
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5">
              {notificationCount}
            </span>
          </button>
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Notifications
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        </div>

        {/* Message Icon with Tooltip */}
        <div className="relative group">
          <button
            onClick={handleMessageClick}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <MessageCircle size={24} />
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5">
              {messageCount}
            </span>
          </button>
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Messages
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        </div>

        {/* User Avatar with Tooltip */}
        <div className="relative group">
          <button
            onClick={toggleProfile}
            className="p-2 flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            <span className="font-semibold text-lg">{userInitial}</span>
          </button>
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Profile
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        </div>

        {/* Dark Mode Toggle with Tooltip */}
        <div className="relative group">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {darkMode ? "Light Mode" : "Dark Mode"}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        </div>
      </div>

      {/* Profile View */}
      {showProfile && (
        <div className="absolute top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg w-64 p-4 z-50">
          {/* Close Button */}
          <button
            onClick={toggleProfile}
            className="absolute top-2 right-2 p-1 text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Profile Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {userInitial}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Admin User
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Profile Actions */}
          <div className="space-y-2">
            <button
              onClick={() => router.push("/admin/profile")}
              className="w-full text-left p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              View Profile
            </button>
            <button
              onClick={() => router.push("/admin/settings")}
              className="w-full text-left p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar1;