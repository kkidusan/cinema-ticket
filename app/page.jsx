"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, LogIn, ArrowRightCircle, Menu, X } from "lucide-react";
import Link from "next/link";
import { TypeAnimation } from "react-type-animation";
import Footer from "./componet/Footer";
import Home from "./ownercinemacomponent/Navgationbar";
import Card from "./componet/Card";

export default function PortfolioPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Initialize theme from localStorage or system preference
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

  // Update theme when darkMode state changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="p-4 shadow-md bg-gradient-to-r from-blue-500 to-purple-600 dark:from-gray-900 dark:to-gray-800 flex justify-between items-center">
        {/* Portfolio Name with Animation */}
        <h1 className="text-2xl font-bold text-white drop-shadow-md">
          <TypeAnimation
            sequence={[
              "Ethio Cinema", 2000,
              "Ticketing", 2000,
              "System", 2000
            ]}
            speed={50}
            repeat={Infinity}
          />
        </h1>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-all shadow-md">
              <LogIn className="w-5 h-5" />
              Login
            </button>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors duration-300 shadow-md ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden flex flex-col items-center bg-gray-100 dark:bg-gray-800 py-4 space-y-4">
          <Link href="/login">
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-all shadow-md">
              <LogIn className="w-5 h-5" />
              Login
            </button>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors duration-300 shadow-md ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow p-6 flex flex-col items-center text-center">
        <h2 className="text-3xl font-semibold">Welcome to My Cinema ticketing System</h2>
        <p className="mt-2 text-gray-700 dark:text-gray-300 max-w-lg">
          This System work with any where accessable and essey interface !
        </p>

        {/* Apply Now Button */}
        <Link href="/apply">
          <button className="mt-6 flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all text-lg shadow-md">
            Apply Now <ArrowRightCircle className="w-5 h-5" />
          </button>
        </Link>
      </main>
      <Card />
      <Footer />
      {/* Footer */}
      <footer className="p-4 shadow-md bg-gray-100 dark:bg-gray-800 text-center">
      </footer>
    </div>
  );
}
