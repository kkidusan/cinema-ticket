"use client";
import React, { useState, useEffect } from "react";
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
import { FaTrash, FaClock, FaSearch, FaChartLine } from "react-icons/fa"; // Icons for actions
import { ToastContainer, toast } from "react-toastify"; // Import toast
import "react-toastify/dist/ReactToastify.css"; // Import toast styles

const Modal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold mb-4">{message.title}</h2>
        <p className="mb-4">{message.text}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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
    if (activeTab === "owner") {
      fetchOwners();
    } else if (activeTab === "user") {
      fetchAppUsers();
    }
  }, [activeTab]);

  // Filter data based on search query
  useEffect(() => {
    if (activeTab === "owner") {
      const filtered = owners.filter(
        (owner) =>
          owner.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          owner.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          owner.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOwners(filtered);
    } else if (activeTab === "user") {
      const filtered = appUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
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
    const pendingOwners = owners.filter((owner) => owner.pending).length;

    return {
      totalOwners,
      totalAppUsers,
      activeOwners,
      activeAppUsers,
      pendingOwners,
    };
  };

  const statistics = calculateStatistics();

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
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
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Tabs and Search Bar Container */}
      <div className="flex justify-between items-center mb-6">
        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("owner")}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "owner"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
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
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            User
            {activeTab === "user" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("statistics")}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "statistics"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Statistics
            {activeTab === "statistics" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        {activeTab !== "statistics" && (
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-2 w-64">
            <FaSearch className="text-gray-400 mx-2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 outline-none"
            />
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-700">Loading...</p>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === "statistics" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Total Owners</h3>
              <p className="text-2xl font-bold">{statistics.totalOwners}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Total App Users</h3>
              <p className="text-2xl font-bold">{statistics.totalAppUsers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Active Owners</h3>
              <p className="text-2xl font-bold">{statistics.activeOwners}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Active App Users</h3>
              <p className="text-2xl font-bold">{statistics.activeAppUsers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium">Pending Owners</h3>
              <p className="text-2xl font-bold">{statistics.pendingOwners}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table for Owners and Users */}
      {!loading && activeTab !== "statistics" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(activeTab === "owner" ? filteredOwners : filteredAppUsers).map(
                (item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.firstName} {item.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.status || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 flex space-x-4">
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
      />

      {/* Confirmation Modal for Pending Toggle */}
      <Modal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        onConfirm={confirmPendingToggle}
        message={{ title: "Confirm Pending Change", text: "Are you sure you want to toggle the pending status for this user?", actionText: "Confirm" }}
      />
    </div>
  );
}