"use client"

import React, { useState, useEffect, useContext } from "react";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase-client";
import { Search, Plus, Download, Eye, X } from "lucide-react";
import { PuffLoader } from "react-spinners";
import { ThemeContext } from "../../context/ThemeContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransactionManagementPage() {
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState("movies");
  const [ticketHistory, setTicketHistory] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [movies, setMovies] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [filteredTicketHistory, setFilteredTicketHistory] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [filteredUserTransactions, setFilteredUserTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportFields, setReportFields] = useState({
    movies: { firstName: true, lastName: true, soldTickets: true, ticketPrice: true, availableSite: true },
    ticketHistory: { ticketId: true, email: true, firstName: true, lastName: true, purchaseDateEthiopian: true },
    ownerTransactions: { createdAt: true, lastUpdated: true, movieEmail: true, totalAmount: true, pending: true },
    userTransactions: { amount: true, paymentMethod: true, phoneNumber: true, status: true, timestamp: true, type: true, userEmail: true }
  });
  const [reportPeriod, setReportPeriod] = useState("day");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [movieGroupPeriod, setMovieGroupPeriod] = useState("all");

  // Fetch movies from Movies collection, filtered by email
  const fetchMovies = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "Movies"), where("email", "==", "mekuriawerede64@gmail.com"));
      const querySnapshot = await getDocs(q);
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
      console.error("Error fetching owner transactions:", error);
      toast.error("Error fetching owner transactions!");
    } finally {
      setLoading(false);
    }
  };

  // Fetch user transactions from userTransaction collection
  const fetchUserTransactions = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "userTransaction"));
      const transactionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        amount: doc.data().amount,
        paymentMethod: doc.data().paymentMethod,
        phoneNumber: doc.data().phoneNumber,
        status: doc.data().status,
        timestamp: doc.data().timestamp,
        type: doc.data().type,
        userEmail: doc.data().userEmail,
      }));

      setUserTransactions(transactionsData);
      setFilteredUserTransactions(transactionsData);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      toast.error("Error fetching user transactions!");
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction details from transactions collection
  const fetchTransactionDetails = async (email) => {
    setTransactionLoading(true);
    try {
      const q = query(collection(db, "transactions"), where("userEmail", "==", email));
      const querySnapshot = await getDocs(q);
      const transactionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTransactionDetails(transactionsData);
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      toast.error("Error fetching transaction details!");
    } finally {
      setTransactionLoading(false);
    }
  };

  // Handle detail button click for withdrawals
  const handleTransactionDetailClick = (email) => {
    fetchTransactionDetails(email);
    setIsTransactionModalOpen(true);
  };

  // Handle detail button click for movies
  const handleDetailClick = (movieId) => {
    setSelectedMovieId(movieId);
    setActiveTab("ticketHistory");
    setSearchQuery("");
  };

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "movies") {
      fetchMovies();
    } else if (activeTab === "ticketHistory") {
      fetchTicketHistory();
    } else if (activeTab === "ownerTransactions") {
      fetchWithdrawals();
    } else if (activeTab === "userTransactions") {
      fetchUserTransactions();
    }
  }, [activeTab]);

  // Filter data based on search query
  useEffect(() => {
    if (activeTab === "movies") {
      const filtered = movies.filter((movie) => {
        const firstName = movie.firstName || "";
        const lastName = movie.lastName || "";
        return (
          firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastName.toLowerCase().includes(searchQuery.toLowerCase())
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
    } else if (activeTab === "ownerTransactions") {
      const filtered = withdrawals.filter((withdrawal) => {
        const firstName = withdrawal.firstName || "";
        const lastName = withdrawal.lastName || "";
        const email = withdrawal.movieEmail || "";
        return (
          firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredWithdrawals(filtered);
    } else if (activeTab === "userTransactions") {
      const filtered = userTransactions.filter((transaction) => {
        const userEmail = transaction.userEmail || "";
        return userEmail.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredUserTransactions(filtered);
    }
  }, [searchQuery, movies, ticketHistory, withdrawals, userTransactions, activeTab, selectedMovieId]);

  // Parse Ethiopian date to Gregorian date
  const parseEthiopianDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return null;
    }
    const [day, month, year] = dateStr.split("/").map(Number);
    const gregorianYear = year - 8;
    const gregorianDate = new Date(gregorianYear, month - 1, day);
    return isNaN(gregorianDate.getTime()) ? null : gregorianDate;
  };

  // Format timestamp to readable date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
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

  // Handle pending action for owner transactions
  const handlePendingAction = async (withdrawalId, currentPending) => {
    setLoading(true);
    try {
      const withdrawalRef = doc(db, "ownerAmount", withdrawalId);
      const newPending = !currentPending;
      await updateDoc(withdrawalRef, {
        pending: newPending,
      });
      setWithdrawals((prev) =>
        prev.map((withdrawal) =>
          withdrawal.id === withdrawalId
            ? { ...withdrawal, pending: newPending }
            : withdrawal
        )
      );
      setFilteredWithdrawals((prev) =>
        prev.map((withdrawal) =>
          withdrawal.id === withdrawalId
            ? { ...withdrawal, pending: newPending }
            : withdrawal
        )
      );
      toast.success(`Pending status ${newPending ? "applied" : "removed"} successfully!`);
    } catch (error) {
      console.error("Error toggling pending status:", error);
      toast.error("Failed to toggle pending status!");
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

  // Handle report field toggle
  const handleFieldToggle = (field) => {
    setReportFields((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: !prev[activeTab][field],
      },
    }));
  };

  // Group ticketHistory data by period
  const groupTicketHistoryByPeriod = (data, period) => {
    const grouped = {};

    data.forEach((item) => {
      const date = parseEthiopianDate(item.purchaseDateEthiopian);
      if (!date) return;

      let key;
      if (period === "day") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      } else if (period === "week") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
      } else if (period === "month") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      } else if (period === "year") {
        key = date.getFullYear().toString();
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  };

  // Group movies by uploadingDate
  const groupMoviesByPeriod = (data, period) => {
    if (period === "all") {
      return { "All Movies": data };
    }

    const grouped = {};

    data.forEach((item) => {
      const date = item.uploadingDate
        ? item.uploadingDate.toDate
          ? item.uploadingDate.toDate()
          : new Date(item.uploadingDate)
        : null;
      if (!date || isNaN(date.getTime())) return;

      let key;
      if (period === "day") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      } else if (period === "week") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - startOfWeek.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
      } else if (period === "month") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      } else if (period === "year") {
        key = date.getFullYear().toString();
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  };

  // Group user transactions by timestamp
  const groupUserTransactionsByPeriod = (data, period) => {
    const grouped = {};

    data.forEach((item) => {
      const date = item.timestamp ? new Date(item.timestamp) : null;
      if (!date || isNaN(date.getTime())) return;

      let key;
      if (period === "day") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      } else if (period === "week") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - startOfWeek.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
      } else if (period === "month") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      } else if (period === "year") {
        key = date.getFullYear().toString();
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  };

  // Group transaction details by timestamp
  const groupTransactionDetailsByPeriod = (data, period) => {
    const referenceDate = new Date("2025-05-24T03:31:43.736Z");
    const grouped = {};

    data.forEach((item) => {
      const date = item.date ? new Date(item.date) : null;
      if (!date || isNaN(date.getTime())) return;

      let key;
      if (period === "day") {
        const diffDays = Math.floor((referenceDate - date) / (1000 * 60 * 60 * 24));
        key = diffDays === 0 ? "Today" : `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
      } else if (period === "week") {
        const startOfWeek = new Date(referenceDate);
        startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());
        const itemWeekStart = new Date(date);
        itemWeekStart.setDate(date.getDate() - date.getDay());
        const diffWeeks = Math.floor((startOfWeek - itemWeekStart) / (1000 * 60 * 60 * 24 * 7));
        key = diffWeeks === 0 ? "This Week" : `${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
      } else if (period === "month") {
        const diffMonths = (referenceDate.getFullYear() - date.getFullYear()) * 12 + (referenceDate.getMonth() - date.getMonth());
        key = diffMonths === 0 ? "This Month" : `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
      } else if (period === "year") {
        const diffYears = referenceDate.getFullYear() - date.getFullYear();
        key = diffYears === 0 ? "This Year" : `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  };

  // Generate PDF report
  const generateReport = () => {
    const doc = new jsPDF();
    const title = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report - ${new Date().toLocaleDateString()}`;
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    let startY = 30;

    if (activeTab === "ticketHistory") {
      const headers = Object.keys(reportFields.ticketHistory)
        .filter((key) => reportFields.ticketHistory[key])
        .map((header) => header.replace(/([A-Z])/g, " $1").trim());
      const groupedData = groupTicketHistoryByPeriod(filteredTicketHistory, reportPeriod);

      Object.keys(groupedData)
        .sort((a, b) => {
          if (reportPeriod === "day") {
            const [aMonth, aDay, aYear] = a.split("/").map(Number);
            const [bMonth, bDay, bYear] = b.split("/").map(Number);
            return new Date(aYear, aMonth - 1, aDay) - new Date(bYear, bMonth - 1, bDay);
          } else if (reportPeriod === "week") {
            return new Date(a.split("Week of ")[1]) - new Date(b.split("Week of ")[1]);
          } else if (reportPeriod === "month") {
            const [aMonth, aYear] = a.split(" ");
            const [bMonth, bYear] = b.split(" ");
            const monthOrder = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            return (
              Number(aYear) - Number(bYear) ||
              monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth)
            );
          } else {
            return Number(a) - Number(b);
          }
        })
        .forEach((key) => {
          doc.setFontSize(14);
          doc.text(key, 14, startY);
          startY += 10;

          const data = groupedData[key].map((item) =>
            headers.map((key) => (key === "Purchase Date Ethiopian" ? item.purchaseDateEthiopian || "N/A" : item[key.toLowerCase().replace(/\s/g, "")] || "N/A"))
          );

          autoTable(doc, {
            head: [headers],
            body: data,
            startY,
            theme: "grid",
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            styles: { fontSize: 10, cellPadding: 4 },
          });

          startY = doc.lastAutoTable.finalY + 10;
        });
    } else if (activeTab === "movies") {
      const headers = Object.keys(reportFields.movies)
        .filter((key) => reportFields.movies[key])
        .map((header) => header.replace(/([A-Z])/g, " $1").trim());
      const groupedData = groupMoviesByPeriod(filteredMovies, reportPeriod);

      Object.keys(groupedData)
        .sort((a, b) => {
          if (reportPeriod === "day") {
            const [aMonth, aDay, aYear] = a.split("/").map(Number);
            const [bMonth, bDay, bYear] = b.split("/").map(Number);
            return new Date(aYear, aMonth - 1, aDay) - new Date(bYear, bMonth - 1, bDay);
          } else if (reportPeriod === "week") {
            return new Date(a.split("Week of ")[1]) - new Date(b.split("Week of ")[1]);
          } else if (reportPeriod === "month") {
            const [aMonth, aYear] = a.split(" ");
            const [bMonth, bYear] = b.split(" ");
            const monthOrder = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            return (
              Number(aYear) - Number(bYear) ||
              monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth)
            );
          } else {
            return Number(a) - Number(b);
          }
        })
        .forEach((key) => {
          doc.setFontSize(14);
          doc.text(key, 14, startY);
          startY += 10;

          const data = groupedData[key].map((item) =>
            headers.map((key) => item[key.toLowerCase().replace(/\s/g, "")] || "N/A")
          );

          autoTable(doc, {
            head: [headers],
            body: data,
            startY,
            theme: "grid",
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            styles: { fontSize: 10, cellPadding: 4 },
          });

          startY = doc.lastAutoTable.finalY + 10;
        });
    } else if (activeTab === "userTransactions") {
      const headers = Object.keys(reportFields.userTransactions)
        .filter((key) => reportFields.userTransactions[key])
        .map((header) => header.replace(/([A-Z])/g, " $1").trim());
      const groupedData = groupUserTransactionsByPeriod(filteredUserTransactions, reportPeriod);

      Object.keys(groupedData)
        .sort((a, b) => {
          if (reportPeriod === "day") {
            const [aMonth, aDay, aYear] = a.split("/").map(Number);
            const [bMonth, bDay, bYear] = b.split("/").map(Number);
            return new Date(aYear, aMonth - 1, aDay) - new Date(bYear, bMonth - 1, bDay);
          } else if (reportPeriod === "week") {
            return new Date(a.split("Week of ")[1]) - new Date(b.split("Week of ")[1]);
          } else if (period === "month") {
            const [aMonth, aYear] = a.split(" ");
            const [bMonth, bYear] = b.split(" ");
            const monthOrder = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            return (
              Number(aYear) - Number(bYear) ||
              monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth)
            );
          } else {
            return Number(a) - Number(b);
          }
        })
        .forEach((key) => {
          doc.setFontSize(14);
          doc.text(key, 14, startY);
          startY += 10;

          const data = groupedData[key].map((item) =>
            headers.map((key) => (key === "Timestamp" ? formatTimestamp(item[key.toLowerCase().replace(/\s/g, "")]) : item[key.toLowerCase().replace(/\s/g, "")] || "N/A"))
          );

          autoTable(doc, {
            head: [headers],
            body: data,
            startY,
            theme: "grid",
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            styles: { fontSize: 10, cellPadding: 4 },
          });

          startY = doc.lastAutoTable.finalY + 10;
        });
    } else {
      let data = [];
      let headers = [];

      if (activeTab === "ownerTransactions") {
        headers = Object.keys(reportFields.ownerTransactions).filter((key) => reportFields.ownerTransactions[key]);
        data = filteredWithdrawals.map((item) =>
          headers.map((key) =>
            key === "createdAt" || key === "lastUpdated"
              ? formatTimestamp(item[key])
              : key === "pending"
              ? item[key] ? "Yes" : "No"
              : item[key] || "N/A"
          )
        );
      }

      autoTable(doc, {
        head: [headers.map((header) => header.replace(/([A-Z])/g, " $1").trim())],
        body: data,
        startY,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        styles: { fontSize: 10, cellPadding: 4 },
      });
    }

    doc.save(`${activeTab}_report_${new Date().toISOString().split("T")[0]}.pdf`);
    setIsReportModalOpen(false);
    toast.success("Report generated successfully!");
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

      {/* Tabs, Search Bar, and Report Button Container */}
      <div className="flex justify-between items-center mb-6">
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
              setActiveTab("ownerTransactions");
              setSelectedMovieId("");
            }}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "ownerTransactions"
                ? theme === "light"
                  ? "text-blue-600"
                  : "text-blue-400"
                : theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Owner Transactions
            {activeTab === "ownerTransactions" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("userTransactions");
              setSelectedMovieId("");
            }}
            className={`px-6 py-3 text-sm font-medium relative ${
              activeTab === "userTransactions"
                ? theme === "light"
                  ? "text-blue-600"
                  : "text-blue-400"
                : theme === "light"
                ? "text-gray-500 hover:text-gray-700"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            User Transactions
            {activeTab === "userTransactions" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-4">
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
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full p-2 outline-none bg-transparent text-sm ${
                theme === "light" ? "placeholder-gray-400 text-gray-800" : "placeholder-gray-500 text-white"
              }`}
            />
          </div>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              theme === "light"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-green-500 text-white hover:bg-green-600"
            } transition-colors`}
          >
            <Download size={16} className="mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Movies Grouping Selector */}
      {activeTab === "movies" && (
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
            Group Movies by
          </label>
          <select
            value={movieGroupPeriod}
            onChange={(e) => setMovieGroupPeriod(e.target.value)}
            className={`w-48 p-2 rounded-md border text-sm ${
              theme === "light" ? "border-gray-300 bg-white text-gray-800" : "border-gray-600 bg-gray-700 text-white"
            }`}
          >
            <option value="all">All</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      )}

      {/* Report Configuration Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"} w-96`}>
            <h2 className={`text-xl font-semibold mb-4 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
              Configure {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report
            </h2>
            {(activeTab === "ticketHistory" || activeTab === "movies" || activeTab === "userTransactions") && (
              <div className="mb-4">
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"} mb-2`}>
                  Group By
                </label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className={`w-full p-2 rounded border text-sm ${
                    theme === "light" ? "border-gray-300 bg-white text-gray-800" : "border-gray-600 bg-gray-700 text-white"
                  }`}
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            )}
            <div className="space-y-2">
              {Object.keys(reportFields[activeTab]).map((key) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportFields[activeTab][key]}
                    onChange={() => handleFieldToggle(key)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className={`text-sm ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  theme === "light"
                    ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                } transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={generateReport}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  theme === "light"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                } transition-colors`}
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {isTransactionModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTransactionModalOpen(false);
          }}
        >
          <div className={`p-6 rounded-xl shadow-2xl ${theme === "light" ? "bg-white" : "bg-gray-800"} w-full max-w-4xl max-h-[80vh] overflow-y-auto relative`}>
            <button
              onClick={() => setIsTransactionModalOpen(false)}
              className={`absolute top-4 right-4 p-2 rounded-full ${theme === "light" ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-600 hover:bg-gray-700"} transition-colors`}
            >
              <X size={20} className={theme === "light" ? "text-gray-600" : "text-gray-200"} />
            </button>
            <h2 className={`text-2xl font-semibold mb-6 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
              Transaction Details
            </h2>
            {transactionLoading ? (
              <div className="flex justify-center items-center h-64">
                <PuffLoader color="#3B82F6" size={60} />
              </div>
            ) : transactionDetails.length === 0 ? (
              <div className={`p-6 text-center ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                No transactions found for this email.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupTransactionDetailsByPeriod(transactionDetails, "day")).map(([periodKey, items]) => (
                  <div key={periodKey}>
                    <h3 className={`text-lg font-medium mb-4 ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}>{periodKey}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((transaction) => (
                        <div
                          key={transaction.id}
                          className={`p-6 rounded-xl shadow-md transition-transform transform hover:scale-105 ${
                            theme === "light" ? "bg-gray-50 border border-gray-200" : "bg-gray-700 border border-gray-600"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Account Name</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.account_name || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Account Number</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.account_number || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Amount</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.amount != null ? transaction.amount : "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Bank Code</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.bank_code || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Currency</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.currency || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Date</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{formatTimestamp(transaction.date)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Mobile Money</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.isMobileMoney ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Payment Method</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.payment_method || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Reference</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.reference || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Type</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.type || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-sm font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>User Email</span>
                              <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{transaction.userEmail || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Back Button for Ticket History */}
      {activeTab === "ticketHistory" && (
        <div className="mb-4">
          <button
            onClick={handleBackToMovies}
            className={`px-4 py-2 rounded text-sm font-medium ${
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

      {/* Table for Movies, Ticket History, Owner Transactions, or User Transactions */}
      {!loading && (
        <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-lg shadow overflow-hidden`}>
          {(activeTab === "movies" && filteredMovies.length === 0) ||
          (activeTab === "ticketHistory" && filteredTicketHistory.length === 0) ||
          (activeTab === "ownerTransactions" && filteredWithdrawals.length === 0) ||
          (activeTab === "userTransactions" && filteredUserTransactions.length === 0) ? (
            <div className={`p-6 text-center ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
              No {activeTab} found.
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
                        Purchase Date (Ethiopian)
                      </th>
                    </>
                  ) : activeTab === "ownerTransactions" ? (
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
                        Pending
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Actions
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Amount
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Payment Method
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Phone Number
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Status
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Timestamp
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        Type
                      </th>
                      <th
                        className={`px-8 py-4 text-left text-sm font-medium ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                      >
                        User Email
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(activeTab === "movies"
                  ? Object.entries(groupMoviesByPeriod(filteredMovies, movieGroupPeriod))
                  : activeTab === "ticketHistory"
                  ? filteredTicketHistory
                  : activeTab === "ownerTransactions"
                  ? filteredWithdrawals
                  : Object.entries(groupUserTransactionsByPeriod(filteredUserTransactions, movieGroupPeriod))
                ).map((entry, index) => {
                  if (activeTab === "movies") {
                    const [periodKey, items] = entry;
                    return (
                      <React.Fragment key={`period-${index}`}>
                        <tr>
                          <td
                            colSpan="6"
                            className={`px-6 py-2 text-sm font-semibold ${
                              theme === "light" ? "text-gray-900" : "text-white"
                            } ${theme === "light" ? "bg-gray-100" : "bg-gray-600"} border ${
                              theme === "light" ? "border-gray-200" : "border-gray-600"
                            }`}
                          >
                            {periodKey}
                          </td>
                        </tr>
                        {items.map((item) => (
                          <tr key={item.id}>
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
                              {item.soldTickets || 0}
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
                                onClick={() => handleDetailClick(item.movieId)}
                                className={`px-4 py-2 rounded text-sm font-semibold ${
                                  theme === "light"
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-blue-500 text-white hover:bg-blue-600"
                                } transition-colors`}
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  } else if (activeTab === "ticketHistory") {
                    const item = entry;
                    return (
                      <tr key={item.id}>
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
                          } border ${theme === "light" ? "light" : "-gray"}-600`}
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
                          {item.purchaseDateEthiopian || "N/A"}
                        </td>
                      </tr>
                    );
                  } else if (activeTab === "ownerTransactions") {
                    const item = entry;
                    return (
                      <tr key={item.id}>
                        <td
                          className={`px-8 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {formatTimestamp(item.createdAt)}
                        </td>
                        <td
                          className={`px-8 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {formatTimestamp(item.lastUpdated)}
                        </td>
                        <td
                          className={`px-8 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.movieEmail || "N/A"}
                        </td>
                        <td
                          className={`px-8 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.totalAmount != null ? item.totalAmount : "N/A"}
                        </td>
                        <td
                          className={`px-8 py-4 text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          {item.pending ? "Yes" : "No"}
                        </td>
                        <td
                          className={`px-8 py-4 text-sm flex space-x-2 ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                        >
                          <button
                            onClick={() => handlePendingAction(item.id, item.pending)}
                            className={`p-2 rounded-sm ${
                              item.pending === true
                                ? theme === "light"
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-red-500 hover:bg-red-600"
                                : theme === "light"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-blue-500 hover:bg-blue-600"
                            } transition-colors`}
                            title={item.pending ? "Remove Pending" : "Add Pending"}
                          >
                            <Plus size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => handleTransactionDetailClick(item.movieEmail)}
                            className={`p-2 rounded-sm ${
                              theme === "light"
                                ? "bg-gray-600 hover:bg-gray-700"
                                : "bg-gray-500 hover:bg-gray-600"
                            } transition-colors`}
                            title="View Transaction Details"
                          >
                            <Eye size={16} className="text-white" />
                          </button>
                        </td>
                      </tr>
                    );
                  } else {
                    const [periodKey, items] = entry;
                    return (
                      <React.Fragment key={`period-${index}`}>
                        <tr>
                          <td
                            colSpan="7"
                            className={`px-6 py-2 text-sm font-semibold ${
                              theme === "light" ? "text-gray-900" : "text-white"
                            } ${theme === "light" ? "bg-gray-100" : "bg-gray-600"} border ${
                              theme === "light" ? "border-gray-200" : "border-gray-600"
                            }`}
                          >
                            {periodKey}
                          </td>
                        </tr>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td
                              className={`px-8 py-4 text-sm ${
                                theme === "light" ? "text-gray-900" : "text-white"
                              } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                            >
                              {item.amount != null ? item.amount : "N/A"}
                            </td>
                            <td
                              className={`px-8 py-4 text-sm ${
                                theme === "light" ? "text-gray-900" : "text-white"
                              } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                            >
                              {item.paymentMethod || "N/A"}
                            </td>
                            <td
                              className={`px-8 py-4 text-sm ${
                                theme === "light" ? "text-gray-900" : "text-white"
                              } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                            >
                              {item.phoneNumber || "N/A"}
                            </td>
                            <td
                              className={`px-8 py-4 text-sm ${
                                theme === "light" ? "text-gray-900" : "text-white"
                              } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                            >
                              {item.status || "N/A"}
                            </td>
                            <td
                              className={`px-8 py-4 text-sm ${
                                theme === "light" ? "text-gray-900" : "text-white"
                              } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                            >
                              {formatTimestamp(item.timestamp)}
                            </td>
                            <td
                              className={`px-8 py-4 text-sm ${
                                theme === "light" ? "text-gray-900" : "text-white"
                              } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                            >
                              {item.type || "N/A"}
                            </td>
                            <td
                              className={`px-8 py-4 text-sm ${
                                theme === "light" ? "text-gray-900" : "text-white"
                              } border ${theme === "light" ? "border-gray-200" : "border-gray-600"}`}
                            >
                              {item.userEmail || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  }
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}