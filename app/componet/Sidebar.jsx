"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Sun, Moon, ChevronLeft, ChevronRight, CheckCircle, CreditCard, MessageCircle } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext"; // Import the dark mode hook

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useDarkMode(); // Use dark mode context

  // Mapping of paths to titles
  const pageTitles = {
    "/admin": "Admin Dashboard",
    "/admin/approved": "Approved Requests",
    "/admin/message": "Messages",
    "/admin/managetransaction": "Manage Transactions",
  };

  // Get the current page title based on the pathname
  const currentTitle = pageTitles[pathname] || "Admin Dashboard";

  const menuItems = [
    { name: "Home", icon: <Home size={isCollapsed ? 36 : 24} />, path: "/admin" },
    { name: "Approved", icon: <CheckCircle size={isCollapsed ? 36 : 24} />, path: "/admin/approved" },
    { name: "Message", icon: <MessageCircle size={isCollapsed ? 36 : 24} />, path: "/admin/message" },
    { name: "Manage Transactions", icon: <CreditCard size={isCollapsed ? 36 : 24} />, path: "/admin/managetransaction" },
  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 250 }}
      className="fixed min-h-screen bg-gray-900 text-white dark:bg-gray-800 flex flex-col p-4 transition-all duration-300"
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-6 bg-gray-700 p-2 rounded-full"
      >
        {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
      </button>

      {/* Page Title */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {currentTitle}
      </h1>

      {/* Dark Mode Toggle */}
      <div className="flex justify-center my-4">
        <button onClick={toggleDarkMode} className="p-2 bg-gray-700 rounded-full">
          {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-3">
        {menuItems.map(({ name, icon, path }) => (
          <div
            key={name}
            onClick={() => router.push(path)}
            className={`flex items-center p-3 cursor-pointer hover:bg-gray-700 rounded-md transition-all ${
              pathname === path ? "bg-gray-700" : ""
            }`}
          >
            <span className="flex-shrink-0">{icon}</span>
            {!isCollapsed && <span className="ml-3 text-lg">{name}</span>}
          </div>
        ))}
      </nav>
    </motion.div>
  );
};

export default Sidebar;