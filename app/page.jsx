"use client";

import { useState, useEffect, useContext } from "react";
import { Sun, Moon, LogIn, ArrowRightCircle, Menu, X, Phone, Ticket, Calendar, Clock, CreditCard, Film, DollarSign, Smartphone, Users, Mail, Send, Instagram, Facebook } from "lucide-react";
import Link from "next/link";
import { TypeAnimation } from "react-type-animation";
import { ThemeContext } from "./context/ThemeContext";
import Footer from "./componet/Footer";
import { db } from "./firebaseconfig";
import { collection, onSnapshot } from "firebase/firestore";

export default function PortfolioPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [ownerCount, setOwnerCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [soldTicketsCount, setSoldTicketsCount] = useState(0); // New state for sold tickets
  const [showContactCard, setShowContactCard] = useState(false);
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme, toggleTheme } = context;

  useEffect(() => {
    // Fetch App User Count
    const appUsersRef = collection(db, "appuser");
    const unsubscribeAppUsers = onSnapshot(appUsersRef, (snapshot) => {
      setUserCount(snapshot.size);
    });

    // Fetch Owner Count
    const ownersRef = collection(db, "owner");
    const unsubscribeOwners = onSnapshot(ownersRef, (snapshot) => {
      setOwnerCount(snapshot.size);
    });

    // Fetch Transaction Count
    const transactionsRef = collection(db, "transactions");
    const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
      setTransactionCount(snapshot.size);
    });

    // Fetch Sold Tickets Count
    const paymentHistoryRef = collection(db, "paymentHistory");
    const unsubscribePaymentHistory = onSnapshot(paymentHistoryRef, (snapshot) => {
      setSoldTicketsCount(snapshot.size);
    });

    return () => {
      unsubscribeAppUsers();
      unsubscribeOwners();
      unsubscribeTransactions();
      unsubscribePaymentHistory();
    };
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
      } text-gray-900 dark:text-white relative`}
    >
      {/* Header */}
      <header
        className={`fixed top-0 left-0 w-full z-50 p-4 shadow-md ${
          theme === "light"
            ? "bg-gradient-to-r from-blue-100 to-purple-600"
            : "bg-gradient-to-r from-gray-800 to-gray-900"
        } flex justify-between items-center`}
      >
        <h1 className="text-2xl font-bold text-blue-600 drop-shadow-md">
          <TypeAnimation
            sequence={["Ethio Cinema", 2000, "Ticketing", 2000, "System", 2000]}
            speed={50}
            repeat={Infinity}
          />
        </h1>
        <button
          className="md:hidden p-2 rounded-lg text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <button
              className={`flex items-center gap-2 px-4 py-2 ${
                theme === "light"
                  ? "bg-yellow-400 hover:bg-yellow-500"
                  : "bg-yellow-500 hover:bg-yellow-600"
              } text-gray-900 font-semibold rounded-lg transition-all shadow-md`}
            >
              <LogIn className="w-5 h-5" /> Login
            </button>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-white hover:bg-gray-200/50 transition-all"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className={`md:hidden flex flex-col items-center ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-100 to-purple-100"
              : "bg-gradient-to-br from-gray-700 to-gray-800"
          } py-4 space-y-4 mt-16 max-h-[400px] overflow-y-auto`}
        >
          <Link href="/login">
            <button
              className={`flex items-center gap-2 px-4 py-2 ${
                theme === "light"
                  ? "bg-yellow-400 hover:bg-yellow-500"
                  : "bg-yellow-500 hover:bg-yellow-600"
              } text-gray-900 font-semibold rounded-lg transition-all shadow-md`}
            >
              <LogIn className="w-5 h-5" /> Login
            </button>
          </Link>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${
              theme === "light" ? "text-zinc-700" : "text-zinc-300"
            } hover:bg-gray-200/50 transition-all`}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Contact Card */}
      {showContactCard && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div
            className={`p-8 rounded-xl shadow-2xl max-w-md w-full relative ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-100 to-purple-100"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            }`}
          >
            <button
              onClick={() => setShowContactCard(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
            <h2
              className={`text-2xl font-bold text-center mb-6 ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              }`}
            >
              Contact Us
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className={`w-6 h-6 ${theme === "light" ? "text-yellow-500" : "text-yellow-400"}`} />
                <p className={theme === "light" ? "text-zinc-700" : "text-zinc-300"}>
                  Phone: +251-123-456-789
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Mail className={`w-6 h-6 ${theme === "light" ? "text-yellow-500" : "text-yellow-400"}`} />
                <p className={theme === "light" ? "text-zinc-700" : "text-zinc-300"}>
                  Email: support@ethiocinema.com
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Send className={`w-6 h-6 ${theme === "light" ? "text-yellow-500" : "text-yellow-400"}`} />
                <p className={theme === "light" ? "text-zinc-700" : "text-zinc-300"}>
                  Telegram: @EthioCinema
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Instagram className={`w-6 h-6 ${theme === "light" ? "text-yellow-500" : "text-yellow-400"}`} />
                <p className={theme === "light" ? "text-zinc-700" : "text-zinc-300"}>
                  Instagram: @EthioCinemaOfficial
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Facebook className={`w-6 h-6 ${theme === "light" ? "text-yellow-500" : "text-yellow-400"}`} />
                <p className={theme === "light" ? "text-zinc-700" : "text-zinc-300"}>
                  Facebook: EthioCinema
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowContactCard(false)}
              className={`mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all text-lg shadow-md`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main
        className={`flex-grow p-6 pt-20 grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${
          theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"
        } relative z-0`}
      >
        <div
          className={`p-6 rounded-xl shadow-lg text-center flex flex-col items-center ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-100 to-purple-100"
              : "bg-gradient-to-br from-gray-700 to-gray-800"
          }`}
        >
          <h2 className="text-4xl font-semibold">Owner Registration</h2>
          <p
            className={`mt-4 ${
              theme === "light" ? "text-zinc-700" : "text-zinc-300"
            } max-w-lg`}
          >
            To register as an owner, provide essential information such as your cinema's name, personal details, email, and phone number. Ensure the form is filled out completely and accurately. Once submitted, the details will be stored in the platform’s database. After successful registration, you’ll receive a confirmation and gain access to the owner’s dashboard.
          </p>
          <div className="mt-6 flex gap-4">
            <Link href="/signup">
              <button
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all text-lg shadow-md`}
              >
                Apply Now <ArrowRightCircle className="w-5 h-5" />
              </button>
            </Link>
            <button
              onClick={() => setShowContactCard(true)}
              className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all text-lg shadow-md`}
            >
              Contact Us <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <img
            src="/all.webp"
            alt="Cinema Experience"
            className="rounded-lg shadow-md max-w-full h-auto"
            style={{ maxWidth: "800px", height: "350px" }}
          />
        </div>
      </main>

      {/* Services Section */}
      <section className="p-6">
        <h2
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "light" ? "text-zinc-800" : "text-zinc-100"
          }`}
        >
          Our Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[
            { icon: <Ticket />, title: "Easy Ticket Booking", description: "Book tickets quickly and hassle-free." },
            { icon: <Calendar />, title: "Event Scheduling", description: "Plan and schedule movie events with ease." },
            { icon: <Clock />, title: "Real-Time Updates", description: "Get instant updates on showtimes and availability." },
            { icon: <CreditCard />, title: "Secure Payments", description: "Fast and secure online payment options." },
            { icon: <Film />, title: "Wide Movie Selection", description: "Choose from a vast collection of movies." },
          ].map((service, index) => (
            <div
              key={index}
              className={`p-6 rounded-xl shadow-lg text-center transition-all duration-300 ${
                theme === "light"
                  ? "bg-gradient-to-br from-blue-100 to-purple-100"
                  : "bg-gradient-to-br from-gray-700 to-gray-800"
              }`}
            >
              <div
                className={`mb-4 text-4xl flex justify-center ${
                  theme === "light" ? "text-blue-500" : "text-yellow-400"
                }`}
              >
                {service.icon}
              </div>
              <h3
                className={`text-xl font-semibold ${
                  theme === "light" ? "text-zinc-800" : "text-zinc-100"
                }`}
              >
                {service.title}
              </h3>
              <p
                className={`text-sm mt-2 ${
                  theme === "light" ? "text-zinc-700" : "text-zinc-300"
                }`}
              >
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Smart Payment Options */}
      <section className="p-6">
        <h2
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "light" ? "text-zinc-800" : "text-zinc-100"
          }`}
        >
          The Smart Choice for Online Payments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Chapa Payment Card */}
          <div
            className={`p-6 rounded-xl shadow-lg text-center transition-all duration-300 ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-100 to-purple-100"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            }`}
          >
            <div
              className={`mb-6 text-6xl flex justify-center ${
                theme === "light" ? "text-yellow-500" : "text-yellow-400"
              }`}
            >
              <DollarSign className="w-16 h-16" />
            </div>
            <h3
              className={`text-xl font-semibold ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              }`}
            >
              Chapa
            </h3>
            <p
              className={`text-sm mt-2 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Chapa is a fast, reliable, and secure payment gateway that allows users to easily pay for services online with Ethiopian card networks.
            </p>
          </div>
          {/* Telebirr Payment Card */}
          <div
            className={`p-6 rounded-xl shadow-lg text-center transition-all duration-300 ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-100 to-purple-100"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            }`}
          >
            <div
              className={`mb-6 text-6xl flex justify-center ${
                theme === "light" ? "text-yellow-500" : "text-yellow-400"
              }`}
            >
              <Smartphone className="w-16 h-16" />
            </div>
            <h3
              className={`text-xl font-semibold ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              }`}
            >
              Telebirr
            </h3>
            <p
              className={`text-sm mt-2 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Telebirr is Ethiopia's mobile payment system, allowing users to make payments using their mobile phones seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Key Statistics Section */}
      <section className="p-6">
        <h2
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "light" ? "text-zinc-800" : "text-zinc-100"
          }`}
        >
          Key Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Registered Users */}
          <div
            className={`p-6 rounded-xl shadow-lg text-center transition-all duration-300 ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-100 to-purple-100"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            }`}
          >
            <div
              className={`mb-6 text-6xl flex justify-center ${
                theme === "light" ? "text-yellow-500" : "text-yellow-400"
              }`}
            >
              <Users className="w-16 h-16" />
            </div>
            <h3
              className={`text-xl font-semibold ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              }`}
            >
              {userCount}+ Registered Users
            </h3>
            <p
              className={`text-sm mt-2 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Total number of registered users on the platform.
            </p>
          </div>
          {/* Registered Owners */}
          <div
            className={`p-6 rounded-xl shadow-lg text-center transition-all duration-300 ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-100 to-purple-100"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            }`}
          >
            <div
              className={`mb-6 text-6xl flex justify-center ${
                theme === "light" ? "text-yellow-500" : "text-yellow-400"
              }`}
            >
              <Users className="w-16 h-16" />
            </div>
            <h3
              className={`text-xl font-semibold ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              }`}
            >
              {ownerCount}+ Registered Owners
            </h3>
            <p
              className={`text-sm mt-2 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Total number of cinema owners registered on the platform.
            </p>
          </div>
          {/* Number of Transactions */}
          <div
            className={`p-6 rounded-xl shadow-lg text-center transition-all duration-300 ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-100 to-purple-100"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            }`}
          >
            <div
              className={`mb-6 text-6xl flex justify-center ${
                theme === "light" ? "text-yellow-500" : "text-yellow-400"
              }`}
            >
              <CreditCard className="w-16 h-16" />
            </div>
            <h3
              className={`text-xl font-semibold ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              }`}
            >
              {transactionCount}+ Transactions
            </h3>
            <p
              className={`text-sm mt-2 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Total number of successful transactions.
            </p>
          </div>
          {/* Sold Tickets */}
          <div
            className={`p-6 rounded-xl shadow-lg text-center transition-all duration-300 ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-100 to-purple-100"
                : "bg-gradient-to-br from-gray-700 to-gray-800"
            }`}
          >
            <div
              className={`mb-6 text-6xl flex justify-center ${
                theme === "light" ? "text-yellow-500" : "text-yellow-400"
              }`}
            >
              <Ticket className="w-16 h-16" />
            </div>
            <h3
              className={`text-xl font-semibold ${
                theme === "light" ? "text-zinc-800" : "text-zinc-100"
              }`}
            >
              {soldTicketsCount}+ Sold Tickets
            </h3>
            <p
              className={`text-sm mt-2 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Total number of tickets sold on the platform.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}