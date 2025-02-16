// components/Sidebar.js
"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Sun, Moon, ChevronLeft, ChevronRight, Inbox, Send, CheckCircle, CreditCard } from "lucide-react";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = typeof window !== "undefined" ? usePathname() : "";
  const router = typeof window !== "undefined" ? useRouter() : null;

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  const menuItems = [
    { name: "Home", icon: <Home size={isCollapsed ? 36 : 24} />, path: "/admin" },
    { name: "Approved", icon: <CheckCircle size={isCollapsed ? 36 : 24} />, path: "/admin/approved" },
    { name: "Send Message", icon: <Send size={isCollapsed ? 36 : 24} />, path: "/admin/sendmessage" },
    { name: "Receive Feedback", icon: <Inbox size={isCollapsed ? 36 : 24} />, path: "/admin/receivfeedback" },
    { name: "Manage Transactions", icon: <CreditCard size={isCollapsed ? 36 : 24} />, path: "/admin/managetransaction" },
  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 250 }}
      className="h-screen bg-gray-900 text-white dark:bg-gray-800 flex flex-col p-4 relative transition-all duration-300"
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-6 bg-gray-700 p-2 rounded-full"
      >
        {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
      </button>

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
            onClick={() => router && router.push(path)}
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
