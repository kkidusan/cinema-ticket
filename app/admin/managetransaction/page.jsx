"use client"

import React, { useState, useEffect, useContext } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase-client";
import { Search, Plus } from "lucide-react";
import { PuffLoader } from "react-spinners";
import { ThemeContext } from "../../context/ThemeContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function TransactionManagementPage() {
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState("movies");
  const [ticketHistory, setTicketHistory] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [movies, setMovies] = useState([]);
  const [filteredTicketHistory, setFilteredTicketHistory] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovieId, setSelectedMovieId] = useState("");

  // Fetch movies from Movies collection
  const fetchMovies = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "Movies"));
      const moviesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMovies(moviesData);
      setFilteredMovies(moviesData);
    } catch (error) {
      console.error("Error fetching movies:", error);
      toast.error("Error fetching movies!");
    } finally {
      setLoading(false);
    }
  };

  // Fetch ticket history from paymentHistory collection
  const fetchTicketHistory = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "paymentHistory"));
      const transactionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTicketHistory(transactionsData);
      setFilteredTicketHistory(transactionsData);
    } catch (error) {
      console.error("Error fetching ticket history:", error);
      toast.error("Error fetching ticket history!");
    } finally {
      setLoading(false);
    }
  };

  // Fetch withdrawals from ownerAmount collection
  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "ownerAmount"));
      const withdrawalsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setWithdrawals(withdrawalsData);
      setFilteredWithdrawals(withdrawalsData);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Error fetching withdrawals!");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "movies") {
      fetchMovies();
    } else if (activeTab === "ticketHistory") {
      fetchTicketHistory();
    } else if (activeTab === "withdraw") {
      fetchWithdrawals();
    }
  }, [activeTab]);

  // Filter data based on search query
  useEffect(() => {
    if (activeTab === "movies") {
      const filtered = movies.filter((movie) => {
        const firstName = movie.firstName || "";
        const lastName = movie.lastName || "";
        const movieId = movie.movieID || "";
        return (
          firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          movieId.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredMovies(filtered);
    } else if (activeTab === "ticketHistory") {
      const filtered = ticketHistory.filter((transaction) => {
        const firstName = transaction.firstName || "";
        const lastName = transaction.lastName || "";
        const email = transaction.email || "";
        return (
          firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredTicketHistory(
        selectedMovieId
          ? filtered.filter((t) => t.movieId === selectedMovieId)
          : filtered
      );
    } else if (activeTab === "withdraw") {
      const filtered = withdrawals.filter((withdrawal) => {
        const firstName = withdrawal.firstName || "";
        const lastName = withdrawal.lastName || "";
        const email = withdrawal.email || "";
        return (
          firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredWithdrawals(filtered);
    }
  }, [searchQuery, movies, ticketHistory, withdrawals, activeTab, selectedMovieId]);

  // Format timestamp to readable date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  // Handle detail button click for movies
  const handleDetailClick = (movieId) => {
    setSelectedMovieId(movieId);
    setActiveTab("ticketHistory");
    setSearchQuery("");
  };

  // Handle padding action for withdrawals (toggle true/false)
  const handlePaddingAction = async (withdrawalId, currentPadding) => {
    setLoading(true);
    try {
      const withdrawalRef = doc(db, "ownerAmount", withdrawalId);
      const newPadding = !currentPadding; // Toggle padding value
      await updateDoc(withdrawalRef, {
        padding: newPadding,
      });
      // Update local state to reflect the change
      setWithdrawals((prev) =>
        prev.map((withdrawal) =>
          withdrawal.id === withdrawalId
            ? { ...withdrawal, padding: newPadding }
            : withdrawal
        )
      );
      setFilteredWithdrawals((prev) =>
        prev.map((withdrawal) =>
          withdrawal.id === withdrawalId
            ? { ...withdrawal, padding: newPadding }
            : withdrawal
        )
      );
      toast.success(`Padding ${newPadding ? "applied" : "removed"} successfully!`);
    } catch (error) {
      console.error("Error toggling padding:", error);
      toast.error("Failed to toggle padding!");
    } finally {
      setLoading(false);
    }
  };

  // Handle back to movies tab
  const handleBackToMovies = () => {
    setActiveTab("movies");
    setSelectedMovieId("");
    setSearchQuery("");
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
      <h1 className={`text-2xl font-bold mb-6 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
        Transaction Management
      </h1>

      {/* Tabs and Search Bar Container */}
      <div className="flex justify-between items-center mb-6">
        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab("movies");
              setSelectedMovieId("");
            }}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "movies"
                ? theme === "light"
                  ? "text-blue-600"
                  : "text-blue-400"
                : theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Movies
            {activeTab === "movies" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("withdraw");
              setSelectedMovieId("");
            }}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "withdraw"
                ? theme === "light"
                  ? "text-blue-600"
                  : "text-blue-400"
                : theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Withdraw
            {activeTab === "withdraw" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div
          className={`flex items-center ${
            theme === "light" ? "bg-gradient-to-r from-blue-50 to-purple-50" : "bg-gradient-to-r from-gray-800 to-gray-700"
          } rounded-lg shadow-sm border ${
            theme === "light" ? "border-gray-200" : "border-gray-600"
          } p-2 w-64 hover:shadow-md transition-shadow`}
        >
          <Search className={`${theme === "light" ? "text-gray-500" : "text-gray-400"} mx-2`} size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full p-2 outline-none bg-transparent ${
              theme === "light" ? "placeholder-gray-400 text-gray-800" : "placeholder-gray-500 text-white"
            }`}
          />
        </div>
      </div>

      {/* Back Button for Ticket History */}
      {activeTab === "ticketHistory" && (
        <div className="mb-4">
          <button
            onClick={handleBackToMovies}
            className={`px-4 py-2 rounded ${
              theme === "light"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-blue-500 text-white hover:bg-blue-600"
            } transition-colors`}
          >
            Back to Movies
          </button>
        </div>
      )}

      {/* Loading State with PuffLoader */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <PuffLoader color="#3B82F6" size={60} />
        </div>
      )}

      {/* Table for Movies, Ticket History, or Withdrawals */}
      {!loading && (
        <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-lg shadow overflow-hidden`}>
          {(activeTab === "movies" && filteredMovies.length === 0) ||
          (activeTab === "ticketHistory" && filteredTicketHistory.length === 0) ||
          (activeTab === "withdraw" && filteredWithdrawals.length === 0) ? (
            <div className={`p-6 text-center ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
              No {activeTab === "movies" ? "movies" : activeTab === "ticketHistory" ? "transactions" : "withdrawals"} found.
            </div>
          ) : (
            <table className="min-w-full border border-gray-200">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-700"}`}>
                <tr>
                  {activeTab === "movies" ? (
                    <>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        First Name
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Last Name
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Movie ID
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Sold Tickets
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Ticket Price
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Available Seats
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Actions
                      </th>
                    </>
                  ) : activeTab === "ticketHistory" ? (
                    <>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Ticket ID
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Email
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        First Name
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Last Name
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Movie ID
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Order ID
                      </th>
                      <th
                        className={`px-6 py-3 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Purchase Date (Ethiopian)
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Created At
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Last Updated
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Movie Email
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Total Amount
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Actions
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(activeTab === "movies"
                  ? filteredMovies
                  : activeTab === "ticketHistory"
                  ? filteredTicketHistory
                  : filteredWithdrawals
                ).map((item) => (
                  <tr key={item.id}>
                    {activeTab === "movies" ? (
                      <>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.firstName || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.lastName || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.movieID || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.soldTickets || "0"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.ticketPrice || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.availableSite || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          <button
                            onClick={() => handleDetailClick(item.movieID)}
                            className={`px-4 py-2 rounded ${
                              theme === "light"
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                            } transition-colors`}
                          >
                            Details
                          </button>
                        </td>
                      </>
                    ) : activeTab === "ticketHistory" ? (
                      <>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.ticketId || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.email || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.firstName || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.lastName || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.movieId || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.orderId || "N/A"}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.purchaseDateEthiopian || "N/A"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          className={`px-8 py-5 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {formatTimestamp(item.createdAt)}
                        </td>
                        <td
                          className={`px-8 py-5 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {formatTimestamp(item.lastUpdated)}
                        </td>
                        <td
                          className={`px-8 py-5 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.movieEmail || "N/A"}
                        </td>
                        <td
                          className={`px-8 py-5 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.totalAmount != null ? item.totalAmount : "N/A"}
                        </td>
                        <td
                          className={`px-8 py-5 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          <button
                            onClick={() => handlePaddingAction(item.id, item.padding)}
                            className={`flex items-center justify-center px-4 py-2 rounded ${
                              item.padding === true
                                ? theme === "light"
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-red-500 text-white hover:bg-red-600"
                                : theme === "light"
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                            } transition-colors`}
                            title={item.padding === true ? "Remove Padding" : "Add Padding"}
                          >
                            <Plus size={16} className="mr-2" />
                            {item.padding === true ? "Remove Padding" : "Add Padding"}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
