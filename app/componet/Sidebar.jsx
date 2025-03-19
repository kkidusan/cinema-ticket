"use client";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Keep Lucide for arrows
import {
  FaHome,
  FaCheckCircle,
  FaCommentDots,
  FaCreditCard,
  FaBullhorn,
  FaUsers, // Updated icon for "Manage User"
} from "react-icons/fa"; // Import all React Icons

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();
  const router = useRouter();

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

  const menuItems = [
    { name: "OverView", icon: <FaHome size={24} />, path: "/admin" },
    { name: "Approved", icon: <FaCheckCircle size={24} />, path: "/admin/approved" },
    { name: "Message", icon: <FaCommentDots size={24} />, path: "/admin/message" },
    { name: "Manage Transactions", icon: <FaCreditCard size={24} />, path: "/admin/managetransaction" },
    { name: "Manage User", icon: <FaUsers size={24} />, path: "/admin/manageuser" }, // Updated icon
    { name: "Post Promotion", icon: <FaBullhorn size={24} />, path: "/admin/promotion" },

  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 250 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed min-h-screen bg-zinc-200 text-gray-900 flex flex-col p-4"
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-3 mt-4">
        {menuItems.map(({ name, icon, path }) => (
          <div
            key={name}
            onClick={() => router.push(path)}
            className={`flex items-center p-3 cursor-pointer hover:bg-gray-300 rounded-md transition-all ${
              pathname === path ? "bg-gray-300" : ""
            }`}
          >
            <span className="flex-shrink-0 text-gray-700">{icon}</span>
            {!isCollapsed && <span className="ml-3 text-lg text-gray-900">{name}</span>}
          </div>
        ))}
      </nav>
    </motion.div>
  );
};

export default Sidebar;