"use client";

import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { db } from "../../firebaseconfig";
import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp, onSnapshot } from "firebase/firestore";
import { PuffLoader } from "react-spinners";
import { Armchair, Save, Download, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Types
interface Seat {
  id: string;
  number: number;
  row: number;
  col: number;
  x?: number;
  y?: number;
  reserved: boolean;
}

interface Arrangement {
  id?: string;
  totalSeats: number;
  layoutType: "rows" | "grid" | "custom";
  seats: Seat[];
  createdAt: string | Timestamp;
  userEmail: string;
  rows?: number;
  cols?: number;
  reservedSeatsCount?: number;
}

interface Errors {
  [key: string]: string | undefined;
  general?: string;
}

interface GenerateSeatsResult {
  seats: Seat[];
  rows: number;
  cols: number;
}

export default function CinemaSeatArrangement() {
  const [totalSeats, setTotalSeats] = useState<number>(0);
  const [layoutType, setLayoutType] = useState<"rows" | "grid" | "custom">("custom");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [rows, setRows] = useState<number>(0);
  const [cols, setCols] = useState<number>(0);
  const [inputRows, setInputRows] = useState<number>(0);
  const [inputCols, setInputCols] = useState<number>(0);
  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [savedArrangement, setSavedArrangement] = useState<Arrangement | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const theme = context?.theme || "light";

  // Authentication
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate?role=owner", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Unauthorized access. Please log in.";
          toast.error(errorMessage, {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error(errorMessage);
        }
        const data = await response.json();
        if (data.email && data.role === "owner") {
          setIsAuthenticated(true);
          setUserEmail(data.email);
          setUserRole(data.role);
        } else {
          toast.error("User is not an owner.", {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error("User is not an owner or email is missing");
        }
      } catch (error) {
        setTimeout(() => {
          router.replace("/login");
        }, 3500);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    fetchUser();
  }, [router, theme]);

  // Real-time listener for user pending status
  useEffect(() => {
    if (!isAuthenticated || !userEmail) return;
    const q = query(collection(db, "owner"), where("email", "==", userEmail));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          setIsPending(userDoc.pending === true);
        } else {
          setIsPending(false);
        }
      },
      (error) => {
        toast.error("Failed to fetch pending status.", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
      }
    );
    return () => unsubscribe();
  }, [isAuthenticated, userEmail, theme]);

  // Load arrangement
  const loadArrangement = useCallback((arrangement: Arrangement) => {
    const normalizedSeats = arrangement.seats.map(seat => ({
      ...seat,
      reserved: seat.reserved ?? false,
    }));
    setTotalSeats(arrangement.totalSeats);
    setLayoutType(arrangement.layoutType);
    setSeats(normalizedSeats);
    setInputRows(arrangement.rows || 0);
    setInputCols(arrangement.cols || 0);
    setRows(Math.max(...normalizedSeats.map((s) => s.row)) + 1 || 0);
    setCols(Math.max(...normalizedSeats.map((s) => s.col)) + 1 || 0);
    toast.success("Arrangement loaded successfully!", {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: theme === "light" ? "light" : "dark",
    });
  }, [theme]);

  // Fetch arrangements
  const fetchArrangements = useCallback(async () => {
    if (!userEmail) {
      toast.warn("No user email available to fetch arrangements.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      return;
    }
    try {
      const q = query(collection(db, "seatArrangements"), where("userEmail", "==", userEmail));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setSavedArrangement(null);
        setSeats([]);
        setTotalSeats(0);
        setLayoutType("custom");
        setInputRows(0);
        setInputCols(0);
        setRows(0);
        setCols(0);
      } else {
        const arrangement = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data(),
        } as Arrangement;
        // Ensure seats have reserved property
        arrangement.seats = arrangement.seats.map(seat => ({
          ...seat,
          reserved: seat.reserved ?? false,
        }));
        // Verify reservedSeatsCount
        const calculatedReservedCount = arrangement.seats.filter(seat => seat.reserved).length;
        arrangement.reservedSeatsCount = arrangement.reservedSeatsCount ?? calculatedReservedCount;
        setSavedArrangement(arrangement);
        // Automatically load the fetched arrangement
        loadArrangement(arrangement);
      }
    } catch (error: any) {
      console.error("Error fetching arrangements:", error);
      toast.error("Failed to load saved arrangement.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    }
  }, [userEmail, theme, loadArrangement]); // Added loadArrangement to dependency array

  useEffect(() => {
    if (isAuthenticated && userEmail && isPending === false) {
      fetchArrangements();
    }
  }, [isAuthenticated, userEmail, isPending, fetchArrangements]);

  // Generate seats
  const generateSeats = useMemo(() => {
    return (totalSeats: number, layoutType: "rows" | "grid" | "custom", rows: number, cols: number): GenerateSeatsResult => {
      if (totalSeats <= 0) return { seats: [], rows: 0, cols: 0 };

      let newRows = rows;
      let newCols = cols;
      const newSeats: Seat[] = [];
      let seatNumber = 1;

      if (layoutType === "rows" || layoutType === "grid") {
        if (rows <= 0 || cols <= 0) {
          newCols = Math.ceil(Math.sqrt(totalSeats));
          newRows = Math.ceil(totalSeats / newCols);
        } else {
          newRows = rows;
          newCols = cols;
        }
        const maxSeats = newRows * newCols;
        if (totalSeats > maxSeats) {
          setErrors((prev) => ({
            ...prev,
            totalSeats: `Total seats cannot exceed ${maxSeats} for ${rows} rows and ${cols} columns.`,
          }));
          return { seats: [], rows: newRows, cols: newCols };
        }
        for (let i = 0; i < newRows; i++) {
          for (let j = 0; j < newCols && newSeats.length < totalSeats; j++) {
            newSeats.push({ id: `${i}-${j}`, number: seatNumber++, row: i, col: j, reserved: false });
          }
        }
      } else if (layoutType === "custom") {
        newCols = Math.min(totalSeats, 10);
        newRows = Math.ceil(totalSeats / newCols);
        for (let i = 0; i < newRows; i++) {
          for (let j = 0; j < (i === newRows - 1 ? totalSeats % newCols || newCols : newCols); j++) {
            newSeats.push({
              id: `custom-${i}-${j}`,
              number: seatNumber++,
              row: i,
              col: j,
              x: j * 80,
              y: i * 80 + 80,
              reserved: false,
            });
          }
        }
      }

      return { seats: newSeats, rows: newRows, cols: newCols };
    };
  }, []);

  useEffect(() => {
    const { seats, rows, cols } = generateSeats(totalSeats, layoutType, inputRows, inputCols);
    setSeats(seats);
    setRows(rows);
    setCols(cols);
  }, [totalSeats, layoutType, inputRows, inputCols, generateSeats]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Errors = {};
    if (totalSeats <= 0) newErrors.totalSeats = "Total seats must be greater than 0.";
    if (totalSeats > 500) newErrors.totalSeats = "Total seats cannot exceed 500.";
    if (!layoutType) newErrors.layoutType = "Please select a layout type.";
    if ((layoutType === "rows" || layoutType === "grid") && inputRows <= 0)
      newErrors.rows = "Rows must be greater than 0.";
    if ((layoutType === "rows" || layoutType === "grid") && inputCols <= 0)
      newErrors.cols = "Columns must be greater than 0.";
    if (!userEmail) newErrors.general = "User email not available.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [totalSeats, layoutType, inputRows, inputCols, userEmail]);

  // Collision detection for seats
  const isCollidingWithOtherSeats = useCallback((seatId: string, newX: number, newY: number) => {
    const seatSize = 60;
    for (const otherSeat of seats) {
      if (otherSeat.id === seatId) continue;
      const otherX = otherSeat.x || 0;
      const otherY = otherSeat.y || 0;
      if (
        newX < otherX + seatSize &&
        newX + seatSize > otherX &&
        newY < otherY + seatSize &&
        newY + seatSize > otherY
      ) {
        return true;
      }
    }
    return false;
  }, [seats]);

  // Update reserved seats count in database
  const updateReservedSeatsCount = useCallback(async (updatedSeats: Seat[]) => {
    if (!userEmail || !savedArrangement?.id) return;
    
    try {
      const reservedCount = updatedSeats.filter(seat => seat.reserved).length;
      const docRef = doc(db, "seatArrangements", savedArrangement.id);
      await updateDoc(docRef, {
        seats: updatedSeats,
        reservedSeatsCount: reservedCount,
      });
      setSavedArrangement(prev => prev ? { ...prev, seats: updatedSeats, reservedSeatsCount: reservedCount } : null);
    } catch (error: any) {
      toast.error("Failed to update reserved seats.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    }
  }, [userEmail, savedArrangement, theme]);

  // Handle seat reservation
  const handleSeatClick = useCallback(async (seatId: string) => {
    const updatedSeats = seats.map(seat =>
      seat.id === seatId ? { ...seat, reserved: !seat.reserved } : seat
    );
    setSeats(updatedSeats);
    
    // Update database with new reserved status
    if (savedArrangement) {
      await updateReservedSeatsCount(updatedSeats);
    }
  }, [seats, savedArrangement, updateReservedSeatsCount]);

  // Drag-and-drop handlers
  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    if (layoutType !== "custom") return;
    setDraggingId(id);
    e.preventDefault();
  }, [layoutType]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId || layoutType !== "custom" || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const gridSize = 80;
      let newX = e.clientX - containerRect.left - 30;
      let newY = e.clientY - containerRect.top - 30;
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
      newX = Math.max(0, Math.min(newX, containerRect.width - 60));
      newY = Math.max(0, Math.min(newY, containerRef.current.scrollHeight - 60));

      if (!isCollidingWithOtherSeats(draggingId, newX, newY)) {
        setSeats((prevSeats) =>
          prevSeats.map((seat) =>
            seat.id === draggingId ? { ...seat, x: newX, y: newY } : seat
          )
        );
      }
    },
    [draggingId, layoutType, isCollidingWithOtherSeats]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((id: string, e: React.KeyboardEvent) => {
    if (layoutType !== "custom" || !containerRef.current) return;
    const gridSize = 80;
    setSeats((prevSeats) =>
      prevSeats.map((seat) => {
        if (seat.id !== id) return seat;
        let newX = seat.x || 0;
        let newY = seat.y || 0;
        if (e.key === "ArrowUp") newY -= gridSize;
        if (e.key === "ArrowDown") newY += gridSize;
        if (e.key === "ArrowLeft") newX -= gridSize;
        if (e.key === "ArrowRight") newX += gridSize;
        const containerRect = containerRef.current!.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, containerRect.width - 60));
        newY = Math.max(0, Math.min(newY, containerRef.current.scrollHeight - 60));
        if (!isCollidingWithOtherSeats(id, newX, newY)) {
          return { ...seat, x: newX, y: newY };
        }
        return seat;
      })
    );
  }, [layoutType, isCollidingWithOtherSeats]);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, handleMouseMove, handleMouseUp]);

  // Save arrangement
  const saveArrangement = useCallback(async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const reservedCount = seats.filter(seat => seat.reserved).length;
      const arrangement: Arrangement = {
        totalSeats,
        layoutType,
        seats,
        createdAt: Timestamp.now(),
        userEmail,
        rows: inputRows,
        cols: inputCols,
        reservedSeatsCount: reservedCount,
      };

      const q = query(collection(db, "seatArrangements"), where("userEmail", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const existingData = querySnapshot.docs[0].data();
        arrangement.createdAt = existingData.createdAt || Timestamp.now();
        const docRef = doc(db, "seatArrangements", docId);
        await updateDoc(docRef, arrangement);
        setSavedArrangement({ id: docId, ...arrangement });
        toast.success("Arrangement updated successfully!", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
      } else {
        const docRef = await addDoc(collection(db, "seatArrangements"), arrangement);
        setSavedArrangement({ id: docRef.id, ...arrangement });
        toast.success("Arrangement saved successfully!", {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
      }

      const from = searchParams.get("from");
      if (from === "videoUploadDetail") {
        const savedFormData = localStorage.getItem("videoUploadFormData");
        if (savedFormData) {
          localStorage.setItem("videoUploadFormData", savedFormData);
        }
        router.push("/dashboard/videoUploadDetail?from=designseat");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast.error("Failed to save arrangement.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, totalSeats, layoutType, seats, userEmail, inputRows, inputCols, searchParams, router, theme]);

  // Export to JSON
  const exportToJson = useCallback(() => {
    const reservedCount = seats.filter(seat => seat.reserved).length;
    const data = { totalSeats, layoutType, seats, rows: inputRows, cols: inputCols, reservedSeatsCount: reservedCount };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seat_arrangement.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [totalSeats, layoutType, seats, inputRows, inputCols]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "totalSeats") {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        setTotalSeats(0);
        setErrors((prev) => ({ ...prev, totalSeats: "Please enter a valid number." }));
      } else {
        setTotalSeats(numValue);
        setErrors((prev) => ({ ...prev, totalSeats: undefined }));
      }
    } else if (name === "layoutType") {
      setLayoutType(value as "rows" | "grid" | "custom");
      setErrors((prev) => ({ ...prev, layoutType: undefined }));
      if (value === "custom") {
        setInputRows(0);
        setInputCols(0);
      }
    } else if (name === "rows") {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        setInputRows(0);
        setErrors((prev) => ({ ...prev, rows: "Please enter a valid number." }));
      } else {
        setInputRows(numValue);
        setErrors((prev) => ({ ...prev, rows: undefined }));
      }
    } else if (name === "cols") {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        setInputCols(0);
        setErrors((prev) => ({ ...prev, cols: "Please enter a valid number." }));
      } else {
        setInputCols(numValue);
        setErrors((prev) => ({ ...prev, cols: undefined }));
      }
    }
  }, []);

  // Reset custom layout
  const resetLayout = useCallback(() => {
    const { seats, rows, cols } = generateSeats(totalSeats, "custom", inputRows, inputCols);
    setSeats(seats);
    setRows(rows);
    setCols(cols);
    toast.info("Layout reset to default.", {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: theme === "light" ? "light" : "dark",
    });
  }, [totalSeats, inputRows, inputCols, generateSeats, theme]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    const from = searchParams.get("from");
    if (from === "videoUploadDetail") {
      const savedFormData = localStorage.getItem("videoUploadFormData");
      if (savedFormData) {
        localStorage.setItem("videoUploadFormData", savedFormData);
      }
      router.push("/dashboard/videoUploadDetail?from=designseat");
    } else {
      router.push("/dashboard");
    }
  }, [searchParams, router]);

  // Loading or authentication failure state
  if (isLoadingAuth || !isAuthenticated || userRole !== "owner") {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color={theme === "light" ? "#3b82f6" : "#FFFFFF"} size={100} />
          <motion.p
            className={`mt-4 text-2xl font-bold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Loading seat arrangement...
          </motion.p>
        </motion.div>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={theme === "light" ? "light" : "dark"}
        />
      </div>
    );
  }

  // Conditional rendering based on pending status
  return (
    <div className={`min-h-screen flex flex-col ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme === "light" ? "light" : "dark"}
      />
      {isPending === null ? (
        <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PuffLoader color={theme === "light" ? "#3b82f6" : "#FFFFFF"} size={100} />
            <motion.p
              className={`mt-4 text-2xl font-bold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Checking status...
            </motion.p>
          </motion.div>
        </div>
      ) : isPending === true ? (
        <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
          <motion.div
            className="text-center px-4"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.h1
              className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Request Pending
            </motion.h1>
            <motion.p
              className={`mt-4 text-lg sm:text-xl ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              Your request is being processed. Please wait a few days.
            </motion.p>
            <motion.div
              className="mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 border-4 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p className={`mt-4 ${theme === "light" ? "text-gray-600" : "text-gray-400"} text-sm sm:text-base`}>
                We appreciate your patience!
              </p>
            </motion.div>
          </motion.div>
        </div>
      ) : (
        <div className={`min-h-screen p-4 sm:p-6 ${theme === "light" ? "bg-gradient-to-br from-indigo-50 to-purple-50" : "bg-gradient-to-br from-gray-900 to-indigo-900"} flex items-center justify-center`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className={`w-full max-w-5xl ${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-2xl shadow-2xl p-6 sm:p-8`}
          >
            <h1 className={`text-3xl font-bold mb-6 ${theme === "light" ? "text-indigo-900" : "text-white"}`}>
              Cinema Seat Arrangement
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === "light" ? "text-indigo-700" : "text-indigo-300"}`}>
                  Total Seats
                </label>
                <input
                  type="number"
                  name="totalSeats"
                  value={totalSeats}
                  onChange={handleInputChange}
                  min="0"
                  max="500"
                  className={`w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.totalSeats
                      ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : theme === "light"
                      ? "border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                      : "border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700"
                  }`}
                />
                {errors.totalSeats && <p className="mt-2 text-sm text-red-500">{errors.totalSeats}</p>}
              </div>

              <div>
                <label className={`block text-sa font-medium mb-2 ${theme === "light" ? "text-indigo-700" : "text-indigo-300"}`}>
                  Layout Type
                </label>
                <select
                  name="layoutType"
                  value={layoutType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.layoutType
                      ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : theme === "light"
                      ? "border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                      : "border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700"
                  }`}
                >
                  <option value="custom">Custom</option>
                  <option value="rows">Rows</option>
                  <option value="grid">Grid</option>
                </select>
                {errors.layoutType && <p className="mt-2 text-sm text-red-500">{errors.layoutType}</p>}
              </div>

              {(layoutType === "rows" || layoutType === "grid") && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === "light" ? "text-indigo-700" : "text-indigo-300"}`}>
                      Rows
                    </label>
                    <input
                      type="number"
                      name="rows"
                      value={inputRows}
                      onChange={handleInputChange}
                      min="0"
                      className={`w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                        errors.rows
                          ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                          : theme === "light"
                          ? "border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                          : "border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700"
                      }`}
                    />
                    {errors.rows && <p className="mt-2 text-sm text-red-500">{errors.rows}</p>}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === "light" ? "text-indigo-700" : "text-indigo-300"}`}>
                      Columns
                    </label>
                    <input
                      type="number"
                      name="cols"
                      value={inputCols}
                      onChange={handleInputChange}
                      min="0"
                      className={`w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                        errors.cols
                          ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                          : theme === "light"
                          ? "border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                          : "border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700"
                      }`}
                    />
                    {errors.cols && <p className="mt-2 text-sm text-red-500">{errors.cols}</p>}
                  </div>
                </>
              )}

              <div className="flex items-end gap-4 md:col-span-3">
                <motion.button
                  onClick={saveArrangement}
                  disabled={isLoading}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-md transition-colors ${
                    isLoading
                      ? "bg-indigo-400 cursor-not-allowed"
                      : theme === "light"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                      : "bg-gradient-to-r from-indigo-700 to-purple-700 text-white hover:from-indigo-800 hover:to-purple-800"
                  }`}
                  whileHover={{ scale: isLoading ? 1 : 1.05 }}
                  whileTap={{ scale: isLoading ? 1 : 0.95 }}
                >
                  {isLoading ? (
                    <>
                      <PuffLoader className="h-5 w-5 animate-spin" size={20} color="#FFFFFF" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={exportToJson}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-md transition-colors ${
                    theme === "light"
                      ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800"
                      : "bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-800 hover:to-gray-900"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download className="h-5 w-5" />
                  Export
                </motion.button>
              </div>
            </div>

            {errors.general && <p className="mb-4 text-sm text-red-500">{errors.general}</p>}

            <div className="flex flex-col md:flex-row gap-6">
              <div
                ref={containerRef}
                className={`relative flex-1 border-2 rounded-lg overflow-auto ${
                  theme === "light" ? "bg-gray-50 border-gray-300" : "bg-gray-700 border-gray-600"
                }`}
                style={{
                  minHeight: `${rows * 80 + 160}px`,
                  background:
                    layoutType === "custom"
                      ? theme === "light"
                        ? "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect x=\"0\" y=\"0\" width=\"80\" height=\"80\" fill=\"none\" stroke=\"%23E5E7EB\" stroke-width=\"1\"/%3E%3C/svg%3E')"
                        : "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect x=\"0\" y=\"0\" width=\"80\" height=\"80\" fill=\"none\" stroke=\"%232D3748\" stroke-width=\"1\"/%3E%3C/svg%3E')"
                      : "none",
                }}
              >
                {layoutType === "custom" ? (
                  seats.map((seat) => (
                    <motion.div
                      key={seat.id}
                      className={`absolute flex items-center justify-center w-[60px] h-[60px] rounded-lg shadow-md cursor-move ${
                        seat.reserved
                          ? theme === "light"
                            ? "bg-gradient-to-r from-red-400 to-red-500 text-white"
                            : "bg-gradient-to-r from-red-600 to-red-700 text-white"
                          : theme === "light"
                          ? "bg-gradient-to-r from-blue-400 to-blue-500 text-white"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                      }`}
                      style={{ left: seat.x, top: seat.y }}
                      onMouseDown={(e) => handleMouseDown(seat.id, e)}
                      onClick={() => handleSeatClick(seat.id)}
                      onKeyDown={(e) => handleKeyDown(seat.id, e)}
                      tabIndex={0}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Armchair className="h-5 w-5 mr-1" />
                      {seat.number}
                    </motion.div>
                  ))
                ) : (
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {Array.from({ length: rows }).map((_, row) =>
                      Array.from({ length: cols }).map((_, col) => {
                        const seat = seats.find((s) => s.row === row && s.col === col);
                        return (
                          <motion.div
                            key={`${row}-${col}`}
                            className={`w-[60px] h-[60px] flex flex-col items-center justify-start ${
                              seat ? "" : "bg-transparent"
                            }`}
                            aria-label={seat ? `Seat ${seat.number}` : "Empty space"}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            {seat && (
                              <motion.div
                                className={`w-[60px] h-[60px] rounded-lg flex items-center justify-center ${
                                  seat.reserved
                                    ? theme === "light"
                                      ? "bg-gradient-to-r from-red-400 to-red-500 text-white"
                                      : "bg-gradient-to-r from-red-600 to-red-700 text-white"
                                    : theme === "light"
                                      ? "bg-gradient-to-r from-blue-400 to-blue-500 text-white"
                                      : "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                                } shadow-md`}
                                onClick={() => handleSeatClick(seat.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Armchair className="h-5 w-5 mr-1" />
                                {seat.number}
                              </motion.div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {layoutType === "custom" && (
                <div className="md:w-1/4 flex flex-col gap-4">
                  <h2 className={`text-lg font-semibold ${theme === "light" ? "text-indigo-900" : "text-white"}`}>
                    Seat Controls
                  </h2>
                  <motion.button
                    onClick={resetLayout}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg shadow-md transition-colors ${
                      theme === "light"
                        ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700"
                        : "bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-800 hover:to-gray-900"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RotateCcw className="h-5 w-5" />
                    Reset Layout
                  </motion.button>
                  <p className={`text-sm ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`}>
                    Click and drag seats to reposition. Use arrow keys to move seats.
                  </p>
                </div>
              )}
            </div>

            {savedArrangement && (
              <motion.div
                className={`mt-6 p-6 rounded-lg ${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-md`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <h3 className={`text-xl font-semibold ${theme === "light" ? "text-indigo-900" : "text-white"} mb-4`}>
                  Your Saved Arrangement
                </h3>
                <div className={`p-4 rounded-lg ${theme === "light" ? "bg-gray-50" : "bg-gray-700"} flex justify-between items-center`}>
                  <div>
                    <p className={`font-medium ${theme === "light" ? "text-indigo-900" : "text-white"}`}>
                      {savedArrangement.totalSeats} Seats ({savedArrangement.layoutType})
                    </p>
                    <p className={`text-sm ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`}>
                      Reserved Seats: {savedArrangement.reservedSeatsCount || 0}
                    </p>
                    {savedArrangement.rows && savedArrangement.cols && (
                      <p className={`text-sm ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`}>
                        Layout: {savedArrangement.rows} Rows x {savedArrangement.cols} Columns
                      </p>
                    )}
                    <p className={`text-sm ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`}>
                      Created:{" "}
                      {savedArrangement.createdAt instanceof Timestamp
                        ? savedArrangement.createdAt.toDate().toLocaleString()
                        : new Date(savedArrangement.createdAt).toLocaleString()}
                    </p>
                    <p className={`text-sm ${theme === "light" ? "text-indigo-600" : "text-indigo-400"}`}>
                      By: {savedArrangement.userEmail}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => loadArrangement(savedArrangement)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg shadow-md transition-colors ${
                      theme === "light"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                        : "bg-gradient-to-r from-indigo-700 to-purple-700 text-white hover:from-indigo-800 hover:to-purple-800"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="h-5 w-5" />
                    Load
                  </motion.button>
                </div>
              </motion.div>
            )}

            <motion.button
              onClick={handleBack}
              className={`mt-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-md transition-colors ${
                theme === "light"
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800"
                  : "bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-800 hover:to-gray-900"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back to Dashboard
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
}