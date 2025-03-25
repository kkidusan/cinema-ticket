"use client";
import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseconfig"; // Adjust the path as needed
import { FaTrash, FaClock } from "react-icons/fa"; // Icons for actions
import { ToastContainer, toast } from "react-toastify"; // Import toast
import "react-toastify/dist/ReactToastify.css"; // Import toast styles
import { Search } from "lucide-react"; // Modern search icon
import { PuffLoader } from "react-spinners"; // PuffLoader for loading state
import { Pie } from "react-chartjs-2"; // Pie chart for statistics
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"; // Chart.js setup
import { ThemeContext } from "../../context/ThemeContext"; // Import ThemeContext

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Modal = ({ isOpen, onClose, onConfirm, message, theme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-lg shadow-lg p-6 max-w-sm w-full`}>
        <h2 className={`text-lg font-bold mb-4 ${theme === "light" ? "text-gray-900" : "text-white"}`}>{message.title}</h2>
        <p className={`mb-4 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>{message.text}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className={`px-4 py-2 ${theme === "light" ? "bg-gray-300 text-gray-700" : "bg-gray-600 text-white"} rounded hover:bg-gray-400`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {message.actionText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function UserManagementPage() {
  const { theme } = useContext(ThemeContext); // Use ThemeContext
  const [activeTab, setActiveTab] = useState("owner");
  const [owners, setOwners] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOwners, setFilteredOwners] = useState([]);
  const [filteredAppUsers, setFilteredAppUsers] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToTogglePending, setItemToTogglePending] = useState(null);

  // Fetch owners from Firestore
  const fetchOwners = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "owner"));
      const ownersData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const owner = { id: doc.id, ...doc.data() };
          const moviesQuery = query(
            collection(db, "Movies"),
            where("email", "==", owner.email)
          );
          const moviesSnapshot = await getDocs(moviesQuery);
          owner.status = moviesSnapshot.size <= 3 ? "Passive" : "Active";
          return owner;
        })
      );

      setOwners(ownersData);
      setFilteredOwners(ownersData);
    } catch (error) {
      console.error("Error fetching owners:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch app users from Firestore
  const fetchAppUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "appuser"));
      const appUsersData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const user = { id: doc.id, ...doc.data() };
          if (!user.email) {
            user.status = "N/A";
            return user;
          }

          const paymentQuery = query(
            collection(db, "paymentHistory"),
            where("email", "==", user.email)
          );
          const paymentSnapshot = await getDocs(paymentQuery);
          user.status = paymentSnapshot.size <= 3 ? "Passive" : "Active";
          return user;
        })
      );

      setAppUsers(appUsersData);
      setFilteredAppUsers(appUsersData);
    } catch (error) {
      console.error("Error fetching app users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    fetchOwners();
    fetchAppUsers();
  }, [activeTab]);

  // Filter data based on search query
  useEffect(() => {
    if (activeTab === "owner") {
      const filtered = owners.filter((owner) => {
        const firstName = owner.firstName || "";
        const lastName = owner.lastName || "";
        const email = owner.email || "";
        return (
          firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredOwners(filtered);
    } else if (activeTab === "user") {
      const filtered = appUsers.filter((user) => {
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        const email = user.email || "";
        return (
          firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredAppUsers(filtered);
    }
  }, [searchQuery, owners, appUsers, activeTab]);

  // Handle deletion of a record
  const handleDelete = async (id, collectionName) => {
    if (itemToDelete) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        if (collectionName === "owner") {
          await fetchOwners();
        } else if (collectionName === "appuser") {
          await fetchAppUsers();
        }
        toast.success("Record deleted successfully!");
      } catch (error) {
        console.error("Error deleting record:", error);
        toast.error("Error deleting record!");
      } finally {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
      }
    }
  };

  // Handle toggling the pending status
  const handlePendingToggle = async (id) => {
    setItemToTogglePending(id);
    setIsPendingModalOpen(true);
  };

  // Confirm the pending toggle action
  const confirmPendingToggle = async () => {
    try {
      const collectionName = activeTab === "owner" ? "owner" : "appuser";
      const userRef = doc(db, collectionName, itemToTogglePending);
      const user = (activeTab === "owner" ? owners : appUsers).find(
        (u) => u.id === itemToTogglePending
      );
      const newPendingStatus = !user.pending; // Toggle the pending status

      await updateDoc(userRef, { pending: newPendingStatus }); // Update pending field
      toast.success(
        `User marked as ${newPendingStatus ? "pending" : "not pending"}!`
      );

      // Refresh the data
      if (activeTab === "owner") {
        await fetchOwners();
      } else if (activeTab === "user") {
        await fetchAppUsers();
      }
    } catch (error) {
      console.error("Error updating pending status:", error);
      toast.error("Error updating pending status!");
    } finally {
      setIsPendingModalOpen(false);
      setItemToTogglePending(null);
    }
  };

  // Calculate statistics
  const calculateStatistics = () => {
    const totalOwners = owners.length;
    const totalAppUsers = appUsers.length;
    const activeOwners = owners.filter((owner) => owner.status === "Active").length;
    const activeAppUsers = appUsers.filter((user) => user.status === "Active").length;
    const passiveOwners = owners.filter((owner) => owner.status === "Passive").length;
    const passiveAppUsers = appUsers.filter((user) => user.status === "Passive").length;
    const pendingOwners = owners.filter((owner) => owner.pending).length;
    const pendingAppUsers = appUsers.filter((user) => user.pending).length;

    return {
      totalOwners,
      totalAppUsers,
      activeOwners,
      activeAppUsers,
      passiveOwners,
      passiveAppUsers,
      pendingOwners,
      pendingAppUsers,
    };
  };

  const statistics = calculateStatistics();

  // Pie chart data for statistics
  const pieChartData = {
    labels: [
      "Active Owners",
      "Active App Users",
      "Passive Owners",
      "Passive App Users",
      "Pending Owners",
      "Pending App Users",
    ],
    datasets: [
      {
        data: [
          statistics.activeOwners,
          statistics.activeAppUsers,
          statistics.passiveOwners,
          statistics.passiveAppUsers,
          statistics.pendingOwners,
          statistics.pendingAppUsers,
        ],
        backgroundColor: [
          "#3B82F6", // Blue
          "#10B981", // Green
          "#F59E0B", // Yellow
          "#EF4444", // Red
          "#8B5CF6", // Purple
          "#F97316", // Orange
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  // Handle Statistics tab click
  const handleStatisticsTabClick = () => {
    setActiveTab("statistics");
  };

  return (
    <div className={`p-6 ${theme === "light" ? "bg-gray-100" : "bg-gray-900"} min-h-screen`}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        pauseOnFocusLoss
      />
      <h1 className={`text-2xl font-bold mb-6 ${theme === "light" ? "text-gray-900" : "text-white"}`}>User Management</h1>

      {/* Tabs and Search Bar Container */}
      <div className="flex justify-between items-center mb-6">
        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("owner")}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "owner"
                ? theme === "light"
                  ? "text-blue-600"
                  : "text-blue-400"
                : theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Owner
            {activeTab === "owner" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("user")}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "user"
                ? theme === "light"
                  ? "text-blue-600"
                  : "text-blue-400"
                : theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            User
            {activeTab === "user" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={handleStatisticsTabClick}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "statistics"
                ? theme === "light"
                  ? "text-blue-600"
                  : "text-blue-400"
                : theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Statistics
            {activeTab === "statistics" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
        </div>

        {/* Modern Search Bar */}
        {activeTab !== "statistics" && (
          <div className={`flex items-center ${theme === "light" ? "bg-gradient-to-r from-blue-50 to-purple-50" : "bg-gradient-to-r from-gray-800 to-gray-700"} rounded-lg shadow-sm border ${theme === "light" ? "border-gray-200" : "border-gray-600"} p-2 w-64 hover:shadow-md transition-shadow`}>
            <Search className={`${theme === "light" ? "text-gray-500" : "text-gray-400"} mx-2`} size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full p-2 outline-none bg-transparent ${theme === "light" ? "placeholder-gray-400" : "placeholder-gray-500"} ${theme === "light" ? "text-gray-800" : "text-white"}`}
            />
          </div>
        )}
      </div>

      {/* Loading State with PuffLoader */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <PuffLoader color="#3B82F6" size={60} />
        </div>
      )}

      {/* Statistics Tab with Pie Chart and Data */}
      {activeTab === "statistics" && (
        <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-lg shadow p-6`}>
          <h2 className={`text-xl font-semibold mb-4 ${theme === "light" ? "text-gray-900" : "text-white"}`}>Statistics</h2>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Pie Chart */}
            <div className="w-full md:w-1/2">
              <Pie data={pieChartData} />
            </div>

            {/* Statistics Data */}
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Total Owners: {statistics.totalOwners}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Total App Users: {statistics.totalAppUsers}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Active Owners: {statistics.activeOwners}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Active App Users: {statistics.activeAppUsers}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Passive Owners: {statistics.passiveOwners}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Passive App Users: {statistics.passiveAppUsers}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Pending Owners: {statistics.pendingOwners}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Pending App Users: {statistics.pendingAppUsers}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table for Owners and Users */}
      {!loading && activeTab !== "statistics" && (
        <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-lg shadow overflow-hidden`}>
          {filteredOwners.length === 0 && filteredAppUsers.length === 0 ? (
            <div className={`p-6 text-center ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
              No results found.
            </div>
          ) : (
            <table className="min-w-full border border-gray-200">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-700"}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"} border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                    Full Name
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"} border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                    Email
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"} border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"} border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(activeTab === "owner" ? filteredOwners : filteredAppUsers).map(
                  (item) => (
                    <tr key={item.id}>
                      <td className={`px-6 py-4 text-sm ${theme === "light" ? "text-gray-900" : "text-white"} border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                        {item.firstName} {item.lastName}
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme === "light" ? "text-gray-900" : "text-white"} border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                        {item.email}
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme === "light" ? "text-gray-900" : "text-white"} border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                        {item.status || "N/A"}
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme === "light" ? "text-gray-900" : "text-white"} flex space-x-4 border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}>
                        {/* Pending Button */}
                        <div className="relative group">
                          <button
                            onClick={() => handlePendingToggle(item.id)}
                            className={`${
                              item.pending ? "text-red-600" : "text-yellow-600"
                            } hover:text-red-800`}
                          >
                            <FaClock size={18} />
                          </button>
                          <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.pending ? "Mark as Not Pending" : "Mark as Pending"}
                          </span>
                        </div>
                        {/* Delete Button */}
                        <div className="relative group">
                          <button
                            onClick={() => {
                              setItemToDelete(item.id);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTrash size={18} />
                          </button>
                          <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Delete
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (itemToDelete) {
            handleDelete(
              itemToDelete,
              activeTab === "owner" ? "owner" : "appuser"
            );
          }
        }}
        message={{ title: "Confirm Deletion", text: "Are you sure you want to delete this record? This action cannot be undone.", actionText: "Delete" }}
        theme={theme}
      />

      {/* Confirmation Modal for Pending Toggle */}
      <Modal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        onConfirm={confirmPendingToggle}
        message={{ title: "Confirm Pending Change", text: "Are you sure you want to toggle the pending status for this user?", actionText: "Confirm" }}
        theme={theme}
      />
    </div>
  );
}