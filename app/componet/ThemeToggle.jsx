"use client";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";  // Import Lucide icons

export default function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-300"
    >
      {theme === "light" ? (
        <Sun className="h-8 w-8 text-black" />  // Sun icon is now black in light mode
      ) : (
        <Moon className="h-8 w-8 text-white" />  // Moon icon remains white in dark mode
      )}
    </button>
  );
}
