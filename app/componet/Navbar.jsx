"use client";

import Link from "next/link";
import { Moon, Sun, Home, Info, User, Briefcase, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for saved theme on component mount
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", !isDark ? "dark" : "light");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-slate-950/80">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
        {/* Back Arrow */}
        <button
          onClick={() => router.back()}
          className="mr-4 rounded-full p-2 transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5 text-foreground dark:text-foreground" />
        </button>

        {/* Logo */}
        <div className="mr-auto font-bold text-xl">
          <Link href="/" className="flex items-center gap-2">
            Portfolio
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className="relative group">
            <Home className="h-5 w-5 text-foreground dark:text-foreground" />
            <span className="absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-semibold opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
              Home
            </span>
          </Link>

          <Link href="/about" className="relative group">
            <Info className="h-5 w-5 text-foreground dark:text-foreground" />
            <span className="absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-semibold opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
              About
            </span>
          </Link>

          <Link href="/profile" className="relative group">
            <User className="h-5 w-5 text-foreground dark:text-foreground" />
            <span className="absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-semibold opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
              Profile
            </span>
          </Link>

          <Link href="/portfolio" className="relative group">
            <Briefcase className="h-5 w-5 text-foreground dark:text-foreground" />
            <span className="absolute bottom-full left-1/ArrowLeft2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-semibold opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
              Portfolio
            </span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden relative group"
          aria-label="Toggle mobile menu"
        >
          <svg
            className="h-6 w-6 text-foreground dark:text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-semibold opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
            Menu
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="ml-4 rounded-full p-2 transition-colors hover:bg-accent"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-foreground dark:text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground dark:text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`absolute top-full left-0 right-0 bg-background dark:bg-slate-950 shadow-lg transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? "block" : "hidden"
        }`}
      >
        <ul className="divide-y divide-border">
          <li>
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-3 hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className="flex items-center gap-2 px-6 py-3 hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-6 py-3 hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              Profile
            </Link>
          </li>
          <li>
            <Link
              href="/portfolio"
              className="flex items-center gap-2 px-6 py-3 hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              Portfolio
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}