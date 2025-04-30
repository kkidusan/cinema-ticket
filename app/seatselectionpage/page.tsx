
"use client";

import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { db } from "../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";
import { Loader2, Armchair, Projector } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

// Custom SeatedUser icon component
const SeatedUser = ({ className, strokeWidth }: { className?: string; strokeWidth?: number }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth || 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="6" r="3" />
    <path d="M12 9v4" />
    <path d="M10 13l-2 4" />
    <path d="M14 13l2 4" />
    <path d="M8 13h8v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4z" />
  </svg>
);

// Types
interface Seat {
  id: string;
  number: number;
  row: number;
  col: number;
  state: "available" | "reserved" | "disabled";
  x?: number;
  y?: number;
}

interface Stage {
  x: number;
  y: number;
  rotation: number;
}

interface Arrangement {
  id?: string;
  totalSeats: number;
  layoutType: "rows" | "grid" | "custom";
  seats: Seat[];
  stage?: Stage;
  createdAt: string;
  userEmail: string;
}

interface Errors {
  general?: string;
}

export default function SeatSelectionPage() {
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [errors, setErrors] = useState<Errors>({});
  const context = useContext(ThemeContext);
  const router = useRouter();

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Authentication check
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: Failed to validate authentication`);
        }
        const data = await response.json();
        if (data.email) {
          setIsAuthenticated(true);
        } else {
          throw new Error("User email is missing");
        }
      } catch (error: any) {
        console.error("Authentication error:", error.message);
        toast.error("Authentication failed. Please log in.");
        router.replace("/login");
      } finally {
        setIsLoadingAuth(false);
      }
    };
    fetchUser();
  }, [router]);

  // Fetch arrangements from Firestore
  const fetchArrangements = useCallback(async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, "seatArrangements"));
      const fetchedArrangements: Arrangement[] = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          seats: (doc.data().seats || []).map((seat: any) => ({
            ...seat,
            state: seat.state || "available",
          })),
          stage: doc.data().stage || { x: 0, y: -80, rotation: 0 },
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Arrangement[];
      setArrangements(fetchedArrangements);
      if (fetchedArrangements.length === 0) {
        toast.info("No arrangements found. Create one in the Cinema Seat Arrangement page.");
      }
    } catch (error: any) {
      console.error("Error fetching arrangements:", error.message);
      setErrors({ general: "Failed to load arrangements. Please try again." });
      toast.error("Failed to load arrangements.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchArrangements();
    }
  }, [isAuthenticated, fetchArrangements]);

  // Handle seat selection
  const selectSeat = (seatId: string) => {
    if (selectedSeat === seatId) {
      setSelectedSeat(null);
      toast.info("Seat deselected.");
    } else {
      setSelectedSeat(seatId);
      const seat = arrangements
        .flatMap((arr) => arr.seats)
        .find((s) => s.id === seatId);
      toast.success(`Seat ${seat?.number} selected!`);
    }
  };

  // Calculate grid dimensions
  const getGridDimensions = useCallback((seats: Seat[]) => {
    if (!seats.length) return { rows: 0, cols: 0 };
    const rows = Math.max(...seats.map((s) => s.row)) + 1;
    const cols = Math.max(...seats.map((s) => s.col)) + 1;
    return { rows, cols };
  }, []);

  // Memoize arrangements to prevent unnecessary re-renders
  const memoizedArrangements = useMemo(() => arrangements, [arrangements]);

  // Loading state for authentication
  if (isLoadingAuth) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Loader2 className="animate-spin" color="#4F46E5" size={60} />
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className={`min-h-screen flex items-center justify-center p-6 font-sans ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
      <motion.div
        className={`w-full max-w-7xl rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] overflow-hidden ${
          theme === "light" ? "bg-white" : "bg-gray-800"
        }`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="p-8">
          {/* Back to Dashboard */}
          <motion.button
            onClick={() => router.push("/dashboard")}
            className={`mb-6 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium flex items-center hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Return to dashboard"
          >
            Back to Dashboard
          </motion.button>

          <h2
            className={`text-4xl font-bold text-center ${
              theme === "light" ? "text-gray-800" : "text-gray-100"
            } mb-8 tracking-tight`}
          >
            Select a Seat
          </h2>

          {errors.general && (
            <motion.div
              className={`mb-8 p-4 rounded-lg ${
                theme === "light" ? "bg-red-100 text-red-800" : "bg-red-900 text-red-200"
              } shadow-sm`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {errors.general}
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-indigo-600" size={60} />
            </div>
          ) : memoizedArrangements.length === 0 ? (
            <motion.div
              className="text-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className={`text-lg ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}>
                No arrangements found. Create one in the Cinema Seat Arrangement page.
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-8">
              {memoizedArrangements.map((arrangement) => {
                const { rows, cols } = getGridDimensions(arrangement.seats);
                return (
                  <motion.div
                    key={arrangement.id}
                    className={`p-6 rounded-lg ${
                      theme === "light" ? "bg-gray-50" : "bg-gray-700"
                    } shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3
                      className={`text-2xl font-semibold ${
                        theme === "light" ? "text-gray-800" : "text-gray-100"
                      } mb-4 tracking-tight`}
                    >
                      {arrangement.totalSeats} Seats ({arrangement.layoutType})
                    </h3>
                    <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"} mb-4`}>
                      Created: {new Date(arrangement.createdAt).toLocaleString()} by {arrangement.userEmail}
                    </p>
                    <div
                      className="relative"
                      style={{
                        maxWidth: "100%",
                        overflowX: "auto",
                        minHeight: arrangement.layoutType === "custom" ? `${rows * 80 + 240}px` : "auto",
                        background: "none", // No grid background
                      }}
                    >
                      {/* Stage */}
                      {arrangement.layoutType === "custom" ? (
                        <motion.div
                          className={`absolute w-48 h-20 rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                            theme === "light"
                              ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg hover:bg-gray-900"
                              : "bg-gradient-to-r from-gray-900 to-black text-gray-200 shadow-lg hover:bg-black"
                          }`}
                          style={{
                            left: `${arrangement.stage?.x || 0}px`,
                            top: `${arrangement.stage?.y || 0}px`,
                            transform: `rotate(${arrangement.stage?.rotation || 0}deg)`,
                            width: arrangement.stage?.rotation === 90 ? "80px" : "200px",
                            height: arrangement.stage?.rotation === 90 ? "200px" : "80px",
                          }}
                          aria-label="Cinema Stage / Screen"
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <Projector className="w-6 h-6 mr-2" />
                          Stage / Screen
                        </motion.div>
                      ) : (
                        <motion.div
                          className={`w-full h-20 mb-4 rounded-lg flex items-center justify-center text-sm font-medium ${
                            theme === "light"
                              ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white"
                              : "bg-gradient-to-r from-gray-900 to-black text-gray-200"
                          } shadow-lg`}
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <Projector className="w-6 h-6 mr-2" />
                          Cinema Stage / Screen
                        </motion.div>
                      )}

                      {arrangement.layoutType === "custom" ? (
                        <div className="relative w-full" style={{ height: `${rows * 80 + 160}px` }}>
                          {arrangement.seats.map((seat) => (
                            <motion.button
                              key={seat.id}
                              className={`absolute w-14 h-14 rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all duration-300 ${
                                seat.state === "available"
                                  ? selectedSeat === seat.id
                                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 border-2 border-yellow-400 shadow-xl"
                                    : "bg-gradient-to-br from-green-500 to-green-600 hover:bg-green-700 shadow-md"
                                  : seat.state === "reserved"
                                  ? "bg-gradient-to-br from-red-500 to-red-600 hover:bg-red-600 shadow-md"
                                  : "bg-gradient-to-br from-gray-500 to-gray-600 hover:bg-gray-600 shadow-md"
                              }`}
                              style={{
                                left: `${seat.x || 0}px`,
                                top: `${seat.y || 0}px`,
                              }}
                              onClick={() => seat.state === "available" && selectSeat(seat.id)}
                              onKeyDown={(e) =>
                                seat.state === "available" && (e.key === "Enter" || e.key === " ") && selectSeat(seat.id)
                              }
                              disabled={seat.state !== "available"}
                              tabIndex={seat.state === "available" ? 0 : -1}
                              aria-label={`Seat ${seat.number}, ${seat.state}${
                                selectedSeat === seat.id ? ", selected" : ""
                              }`}
                              whileHover={{
                                scale: seat.state === "available" ? 1.1 : 1,
                                rotate: seat.state === "available" ? 2 : 0,
                              }}
                              whileTap={{ scale: seat.state === "available" ? 0.95 : 1 }}
                              title={`Seat ${seat.number}: ${seat.state}${
                                seat.state === "available" ? ", click to select" : ""
                              }`}
                            >
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              >
                                {selectedSeat === seat.id ? (
                                  <SeatedUser className="w-8 h-8 text-white" strokeWidth={1.5} />
                                ) : (
                                  <Armchair className="w-8 h-8 text-white" strokeWidth={1.5} />
                                )}
                              </motion.div>
                              <span
                                className={`absolute -bottom-6 text-sm font-medium z-10 px-2 py-1 rounded-full ${
                                  theme === "light"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-gray-700 text-gray-200"
                                } shadow-sm`}
                              >
                                {seat.number}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                          {Array.from({ length: rows }).map((_, row) =>
                            Array.from({ length: cols }).map((_, col) => {
                              const seat = arrangement.seats.find((s) => s.row === row && s.col === col);
                              return (
                                <motion.button
                                  key={`${arrangement.id}-${row}-${col}`}
                                  className={`w-14 h-18 flex flex-col items-center justify-start focus:outline-none focus:ring-2 focus:ring-indigo-400/50 ${
                                    seat
                                      ? seat.state === "available"
                                        ? selectedSeat === seat.id
                                          ? "bg-gradient-to-br from-indigo-600 to-indigo-700 border-2 border-yellow-400 shadow-xl"
                                          : "bg-gradient-to-br from-green-500 to-green-600 hover:bg-green-700 shadow-md"
                                        : seat.state === "reserved"
                                        ? "bg-gradient-to-br from-red-500 to-red-600 hover:bg-red-600 shadow-md"
                                        : "bg-gradient-to-br from-gray-500 to-gray-600 hover:bg-gray-600 shadow-md"
                                      : "bg-transparent"
                                  }`}
                                  onClick={() => seat && seat.state === "available" && selectSeat(seat.id)}
                                  onKeyDown={(e) =>
                                    seat &&
                                    seat.state === "available" &&
                                    (e.key === "Enter" || e.key === " ") &&
                                    selectSeat(seat.id)
                                  }
                                  disabled={!seat || seat.state !== "available"}
                                  tabIndex={seat && seat.state === "available" ? 0 : -1}
                                  aria-label={
                                    seat
                                      ? `Seat ${seat.number}, ${seat.state}${
                                          selectedSeat === seat.id ? ", selected" : ""
                                        }`
                                      : "Empty space"
                                  }
                                  whileHover={{
                                    scale: seat && seat.state === "available" ? 1.1 : 1,
                                    rotate: seat && seat.state === "available" ? 2 : 0,
                                  }}
                                  whileTap={{ scale: seat && seat.state === "available" ? 0.95 : 1 }}
                                  title={
                                    seat
                                      ? `Seat ${seat.number}: ${seat.state}${
                                          seat.state === "available" ? ", click to select" : ""
                                        }`
                                      : "Empty space"
                                  }
                                >
                                  {seat && (
                                    <>
                                      <motion.div
                                        className="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-200"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                      >
                                        {selectedSeat === seat.id ? (
                                          <SeatedUser className="w-8 h-8 text-white" strokeWidth={1.5} />
                                        ) : (
                                          <Armchair className="w-8 h-8 text-white" strokeWidth={1.5} />
                                        )}
                                      </motion.div>
                                      <span
                                        className={`text-sm font-medium mt-2 ${
                                          theme === "light" ? "text-gray-800" : "text-gray-200"
                                        }`}
                                      >
                                        {seat.number}
                                      </span>
                                    </>
                                  )}
                                </motion.button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
