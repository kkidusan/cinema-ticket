"use client";

import { useEffect, useContext, useRef } from "react";
import { ThemeContext, ThemeProvider } from "./context/ThemeContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

type RootLayoutProps = {
  children: React.ReactNode;
};

// NetworkStatus component to handle network detection and toasts
function NetworkStatus() {
  const { theme } = useContext(ThemeContext);
  const offlineToastId = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      // Dismiss the offline toast if it exists
      if (offlineToastId.current) {
        toast.dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }
      // Show online success toast
      toast.success("You are now online!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    };

    const handleOffline = () => {
      // Only show offline toast if not already shown
      if (!offlineToastId.current) {
        offlineToastId.current = toast.error("You are offline. Please check your internet connection.", {
          position: "top-right",
          autoClose: false, // Persist until online
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
      }
    };

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      // Dismiss offline toast on unmount
      if (offlineToastId.current) {
        toast.dismiss(offlineToastId.current);
      }
    };
  }, [theme]);

  return null; // This component only handles side effects, no UI
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>Cinema User</title>
        <meta name="description" content="A cinema management application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="transition-colors duration-300 bg-white dark:bg-gray-900 text-black dark:text-white">
        <ThemeProvider>
          <NetworkStatus />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}