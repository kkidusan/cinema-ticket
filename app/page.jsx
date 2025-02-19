"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, LogIn, ArrowRightCircle, Menu, X, Phone, Ticket, Calendar, Clock, CreditCard, Film, DollarSign, Smartphone, Code, Users } from "lucide-react";
import Link from "next/link";
import { TypeAnimation } from "react-type-animation";
import Footer from "./componet/Footer";
import { db } from "./firebaseconfig"; // Import Firestore
import { collection, onSnapshot } from "firebase/firestore"; // Firebase query functions

export default function PortfolioPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // States to manage counts
  const [userCount, setUserCount] = useState(0);
  const [ownerCount, setOwnerCount] = useState(0);

  useEffect(() => {
    // Fetch User Count
    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      setUserCount(snapshot.size); // Real-time count of users
    });

    // Fetch Owner Count
    const ownersRef = collection(db, "owner");
    const unsubscribeOwners = onSnapshot(ownersRef, (snapshot) => {
      setOwnerCount(snapshot.size); // Real-time count of owners
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeUsers();
      unsubscribeOwners();
    };
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
    } else if (!savedTheme) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
      localStorage.setItem("theme", prefersDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 p-4 shadow-md bg-gradient-to-r from-blue-500 to-purple-600 dark:from-gray-900 dark:to-gray-800 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white drop-shadow-md">
          <TypeAnimation
            sequence={["Ethio Cinema", 2000, "Ticketing", 2000, "System", 2000]}
            speed={50}
            repeat={Infinity}
          />
        </h1>
        <button className="md:hidden p-2 rounded-lg text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-all shadow-md">
              <LogIn className="w-5 h-5" /> Login
            </button>
          </Link>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors duration-300 shadow-md ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden flex flex-col items-center bg-gray-100 dark:bg-gray-800 py-4 space-y-4 mt-16 max-h-[400px] overflow-y-auto">
          <Link href="/login">
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-all shadow-md">
              <LogIn className="w-5 h-5" /> Login
            </button>
          </Link>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors duration-300 shadow-md ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          {/* Add other menu items here */}
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-grow p-6 pt-20 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-transparent relative z-0">
        <div className="bg-transparent p-6 rounded-lg shadow-lg text-center flex flex-col items-center">
          <h2 className="text-4xl font-semibold">Owner Registration</h2>
          <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-lg">
          To register as an owner, you need to provide essential information such as your cinema's name, your personal details,
           email, and phone number. Ensure the form is filled out completely and accurately.
            Once submitted, the details will be stored in the platform’s database. After successful registration, yo
          u’ll receive a confirmation and gain access to the owner’s dashboard.
          </p>
          <div className="mt-6 flex gap-4">
            <Link href="/signup">
              <button className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all text-lg shadow-md">
                Apply Now <ArrowRightCircle className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/contact">
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-lg shadow-md">
                Contact Us <Phone className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <img 
            src="/all.webp" 
            alt="Cinema Experience" 
            className="rounded-lg shadow-md max-w-full h-auto"
            style={{ maxWidth: "800px",height: "350px" }} // You can adjust the max-width as needed
          />
        </div>
      </main>

      {/* Gradient Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-50 z-[-1]" />
      
      {/* Services Section */}
      <section className="p-6">
        <h2 className="text-3xl font-bold text-center mb-6">Our Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[{ icon: <Ticket />, title: "Easy Ticket Booking", description: "Book tickets quickly and hassle-free." },
            { icon: <Calendar />, title: "Event Scheduling", description: "Plan and schedule movie events with ease." },
            { icon: <Clock />, title: "Real-Time Updates", description: "Get instant updates on showtimes and availability." },
            { icon: <CreditCard />, title: "Secure Payments", description: "Fast and secure online payment options." },
            { icon: <Film />, title: "Wide Movie Selection", description: "Choose from a vast collection of movies." }].map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-all duration-300">
                <div className="text-blue-500 dark:text-yellow-400 mb-4 text-4xl flex justify-center">{service.icon}</div>
                <h3 className="text-xl font-semibold">{service.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">{service.description}</p>
              </div>
            ))}
        </div>
      </section>

      {/* Smart Payment Options */}
      <section className="p-6">
        <h2 className="text-3xl font-bold text-center mb-6">The Smart Choice for Online Payments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Chapa Payment Card */}
          <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-all duration-300">
            <div className="text-yellow-500 mb-6 text-6xl flex justify-center">
              <DollarSign className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-semibold">Chapa</h3>
            <p className="text-gray-600 mt-2">
              Chapa is a fast, reliable, and secure payment gateway that allows users to easily pay for services online with Ethiopian card networks.
            </p>
          </div>
          {/* Telebirr Payment Card */}
          <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-all duration-300">
            <div className="text-yellow-500 mb-6 text-6xl flex justify-center">
              <Smartphone className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-semibold">Telebirr</h3>
            <p className="text-gray-600 mt-2">
              Telebirr is Ethiopia's mobile payment system, allowing users to make payments using their mobile phones seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Key Statistics Section */}
      <section className="p-6">
        <h2 className="text-3xl font-bold text-center mb-6">Key Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Registered Users */}
          <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-all duration-300">
            <div className="text-yellow-500 mb-6 text-6xl flex justify-center">
              <Users className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-semibold">{userCount}+ Registered Users</h3>
            <p className="text-gray-600 mt-2">Total number of registered users on the platform.</p>
          </div>

          {/* Registered Owners */}
          <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-all duration-300">
            <div className="text-yellow-500 mb-6 text-6xl flex justify-center">
              <Users className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-semibold">{ownerCount}+ Registered Owners</h3>
            <p className="text-gray-600 mt-2">Total number of cinema owners registered on the platform.</p>
          </div>

          {/* Number of Transactions */}
          <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-all duration-300">
            <div className="text-yellow-500 mb-6 text-6xl flex justify-center">
              <CreditCard className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-semibold">100M+ Transactions</h3>
            <p className="text-gray-600 mt-2">Total number of successful transactions.</p>
          </div>
        </div>
      </section>

      {/* Register Now Card Section */}
      <Footer />
    </div>
  );
}
