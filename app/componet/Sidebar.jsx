"use client";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  FaHome,
  FaCheckCircle,
  FaCommentDots,
  FaCreditCard,
  FaUsers,
} from "react-icons/fa";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  // Mapping of paths to titles
  const pageTitles = {
    "/admin": "OverView",
    "/admin/approved": "Approved Requests",
    "/admin/message": "Messages",
    "/admin/managetransaction": "Manage Transactions",
    "/admin/manageuser": "Manage User",
  };

  // Get the current page title based on the pathname
  const currentTitle = pageTitles[pathname] || "Admin Dashboard";

  const menuItems = [
    { name: "OverView", icon: <FaHome size={24} />, path: "/admin" },
    { name: "Approved", icon: <FaCheckCircle size={24} />, path: "/admin/approved" },
    { name: "Message", icon: <FaCommentDots size={24} />, path: "/admin/message" },
    { name: "Manage Transactions", icon: <FaCreditCard size={24} />, path: "/admin/managetransaction" },
    { name: "Manage User", icon: <FaUsers size={24} />, path: "/admin/manageuser" },
  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 250 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`fixed min-h-screen ${theme === "light" ? "bg-zinc-200" : "bg-gray-800"} ${theme === "light" ? "text-gray-900" : "text-gray-100"} flex flex-col p-4`}
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-4 top-1/2 transform -translate-y-1/2 ${theme === "light" ? "bg-white" : "bg-gray-700"} p-2 rounded-full shadow-md ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-600"} transition-colors`}
      >
        {isCollapsed ? (
          <ChevronRight size={20} className={theme === "light" ? "text-gray-900" : "text-gray-100"} />
        ) : (
          <ChevronLeft size={20} className={theme === "light" ? "text-gray-900" : "text-gray-100"} />
        )}
      </button>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-3 mt-4">
        {menuItems.map(({ name, icon, path }) => (
          <div
            key={name}
            onClick={() => router.push(path)}
            className={`flex items-center p-3 cursor-pointer ${theme === "light" ? "hover:bg-gray-300" : "hover:bg-gray-700"} rounded-md transition-all ${
              pathname === path ? (theme === "light" ? "bg-gray-300" : "bg-gray-700") : ""
            }`}
          >
            <span className={`flex-shrink-0 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
              {icon}
            </span>
            {!isCollapsed && (
              <span className={`ml-3 text-lg ${theme === "light" ? "text-gray-900" : "text-gray-100"}`}>
                {name}
              </span>
            )}
          </div>
        ))}
      </nav>
    </motion.div>
  );
};

export default Sidebar;