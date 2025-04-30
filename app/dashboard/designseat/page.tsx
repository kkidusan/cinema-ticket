"use client";
import React from "react";
import { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { db } from "../../firebaseconfig";
import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp } from "firebase/firestore";
import { Loader2, Armchair, Save, Download, Projector, RotateCw, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface Seat {
  id: string;
  number: number;
  row: number;
  col: number;
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
  createdAt: string | Timestamp;
  userEmail: string;
}

interface Errors {
  [key: string]: string | undefined;
  general?: string;
}

export default function CinemaSeatArrangement() {
  const [totalSeats, setTotalSeats] = useState<number>(0);
  const [layoutType, setLayoutType] = useState<"rows" | "grid" | "custom">("custom");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [stage, setStage] = useState<Stage>({ x: 0, y: -80, rotation: 0 });
  const [rows, setRows] = useState<number>(0);
  const [cols, setCols] = useState<number>(0);
  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [savedArrangement, setSavedArrangement] = useState<Arrangement | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
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
          throw new Error(`HTTP error ${response.status}: Failed to validate owner authentication`);
        }
        const data = await response.json();
        if (data.email && data.role === "owner") {
          setIsAuthenticated(true);
          setUserEmail(data.email);
        } else {
          throw new Error("User is not an owner or email is missing");
        }
      } catch (error: any) {
        console.error("Authentication error:", error.message);
        toast.error("Authentication failed. Please log in again.");
        router.replace("/login");
      } finally {
        setIsLoadingAuth(false);
      }
    };
    fetchUser();
  }, [router]);

  // Fetch arrangements
  const fetchArrangements = useCallback(async () => {
    if (!userEmail) {
      console.warn("fetchArrangements: userEmail is empty, skipping query");
      return;
    }
    try {
      const q = query(collection(db, "seatArrangements"), where("userEmail", "==", userEmail));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log(`No arrangement found for userEmail: ${userEmail}`);
        setSavedArrangement(null);
      } else {
        const arrangement = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data(),
        } as Arrangement;
        console.log(`Fetched arrangement for ${userEmail}:`, arrangement);
        setSavedArrangement(arrangement);
      }
    } catch (error: any) {
      console.error("Error fetching arrangement:", error.message);
      toast.error("Failed to load saved arrangement. Please try again.");
      setSavedArrangement(null);
    }
  }, [userEmail]);

  useEffect(() => {
    if (isAuthenticated && userEmail) {
      fetchArrangements();
    }
  }, [isAuthenticated, userEmail, fetchArrangements]);

  // Generate seats
  const generateSeats = useMemo(() => {
    return (totalSeats: number, layoutType: "rows" | "grid" | "custom") => {
      if (totalSeats <= 0) return { seats: [], rows: 0, cols: 0 };

      let newRows = 0;
      let newCols = 0;
      const newSeats: Seat[] = [];
      let seatNumber = 1;

      if (layoutType === "rows") {
        newRows = Math.ceil(totalSeats / 10);
        newCols = Math.min(totalSeats, 10);
        for (let i = 0; i < newRows; i++) {
          for (let j = 0; j < (i === newRows - 1 ? totalSeats % 10 || 10 : 10); j++) {
            newSeats.push({ id: `${i}-${j}`, number: seatNumber++, row: i, col: j });
          }
        }
      } else if (layoutType === "grid") {
        newCols = Math.ceil(Math.sqrt(totalSeats));
        newRows = Math.ceil(totalSeats / newCols);
        for (let i = 0; i < newRows; i++) {
          for (let j = 0; j < newCols && newSeats.length < totalSeats; j++) {
            newSeats.push({ id: `${i}-${j}`, number: seatNumber++, row: i, col: j });
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
            });
          }
        }
      }

      return { seats: newSeats, rows: newRows, cols: newCols };
    };
  }, []);

  useEffect(() => {
    const { seats, rows, cols } = generateSeats(totalSeats, layoutType);
    setSeats(seats);
    setRows(rows);
    setCols(cols);
    setStage(layoutType === "custom" ? { x: 0, y: -80, rotation: 0 } : { x: 0, y: 0, rotation: 0 });
  }, [totalSeats, layoutType, generateSeats]);

  // Validate form
  const validateForm = () => {
    const newErrors: Errors = {};
    if (totalSeats <= 0) newErrors.totalSeats = "Total seats must be greater than 0.";
    if (totalSeats > 500) newErrors.totalSeats = "Total seats cannot exceed 500.";
    if (!layoutType) newErrors.layoutType = "Please select a layout type.";
    if (!userEmail) newErrors.general = "User email not available.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Collision detection
  const isCollidingWithSeats = (stageX: number, stageY: number, stageRotation: number) => {
    const stageWidth = stageRotation === 90 ? 80 : 200;
    const stageHeight = stageRotation === 90 ? 200 : 80;
    const seatSize = 60;

    for (const seat of seats) {
      const seatX = seat.x || 0;
      const seatY = seat.y || 0;

      if (
        stageX < seatX + seatSize &&
        stageX + stageWidth > seatX &&
        stageY < seatY + seatSize &&
        stageY + stageHeight > seatY
      ) {
        return true;
      }
    }
    return false;
  };

  const isCollidingWithOtherSeats = (seatId: string, newX: number, newY: number) => {
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
  };

  // Drag-and-drop handlers
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    if (layoutType !== "custom") return;
    setDraggingId(id);
    e.preventDefault();
  };

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

      if (draggingId === "stage") {
        newX -= 70;
        newY -= 10;
        newX = Math.max(0, Math.min(newX, containerRect.width - (stage.rotation === 90 ? 80 : 200)));
        newY = Math.max(-80, Math.min(newY, containerRef.current.scrollHeight - (stage.rotation === 90 ? 200 : 80)));
        if (!isCollidingWithSeats(newX, newY, stage.rotation)) {
          setStage((prev) => ({ ...prev, x: newX, y: newY }));
        }
      } else {
        const stageX = stage.x;
        const stageY = stage.y;
        const stageWidth = stage.rotation === 90 ? 80 : 200;
        const stageHeight = stage.rotation === 90 ? 200 : 80;
        const seatSize = 60;
        if (
          !(
            newX < stageX + stageWidth &&
            newX + seatSize > stageX &&
            newY < stageY + stageHeight &&
            newY + seatSize > stageY
          ) &&
          !isCollidingWithOtherSeats(draggingId, newX, newY)
        ) {
          setSeats((prevSeats) =>
            prevSeats.map((seat) =>
              seat.id === draggingId ? { ...seat, x: newX, y: newY } : seat
            )
          );
        }
      }
    },
    [draggingId, layoutType, stage, seats]
  );

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  // Rotate stage
  const rotateStage = () => {
    setStage((prev) => ({
      ...prev,
      rotation: prev.rotation === 0 ? 90 : 0,
    }));
  };

  // Keyboard navigation
  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (layoutType !== "custom" || !containerRef.current) return;
    if (id === "stage" && e.key === "r") {
      rotateStage();
      return;
    }
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
        const stageWidth = stage.rotation === 90 ? 80 : 200;
        const stageHeight = stage.rotation === 90 ? 200 : 80;
        if (
          !isCollidingWithOtherSeats(id, newX, newY) &&
          !(
            newX < stage.x + stageWidth &&
            newX + 60 > stage.x &&
            newY < stage.y + stageHeight &&
            newY + 60 > stage.y
          )
        ) {
          return { ...seat, x: newX, y: newY };
        }
        return seat;
      })
    );
  };

  useEffect(() => {
    if (draggingId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, handleMouseMove]);

  // Save arrangement
  const saveArrangement = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const arrangement: Arrangement = {
        totalSeats,
        layoutType,
        seats,
        createdAt: Timestamp.now(),
        userEmail,
        ...(layoutType === "custom" ? { stage } : {}),
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
          position: "top-right",
          autoClose: 3000,
          theme: theme === "light" ? "light" : "dark",
        });
      } else {
        const docRef = await addDoc(collection(db, "seatArrangements"), arrangement);
        setSavedArrangement({ id: docRef.id, ...arrangement });
        toast.success("Arrangement saved successfully!", {
          position: "top-right",
          autoClose: 3000,
          theme: theme === "light" ? "light" : "dark",
        });
      }

      const from = searchParams.get("from");
      if (from === "videoUploadDetail") {
        router.push("/dashboard/videoUploadDetail");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Error saving arrangement:", error.message);
      toast.error("Failed to save arrangement. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Export to JSON
  const exportToJson = () => {
    const data = { totalSeats, layoutType, seats, stage };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seat_arrangement.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "totalSeats") {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        setTotalSeats(0);
        setErrors((prev) => ({ ...prev, totalSeats: "Please enter a valid number." }));
      } else {
        setTotalSeats(numValue);
        setErrors((prev) => ({ ...prev, totalSeats: "" }));
      }
    } else if (name === "layoutType") {
      setLayoutType(value as "rows" | "grid" | "custom");
      setErrors((prev) => ({ ...prev, layoutType: "" }));
    }
  };

  // New Functionality: Reset custom layout
  const resetLayout = () => {
    const { seats, rows, cols } = generateSeats(totalSeats, "custom");
    setSeats(seats);
    setRows(rows);
    setCols(cols);
    setStage({ x: 0, y: -80, rotation: 0 });
    toast.info("Layout reset to default.", {
      position: "top-right",
      autoClose: 3000,
      theme: theme === "light" ? "light" : "dark",
    });
  };

  // New Functionality: Load arrangement
  const loadArrangement = (arrangement: Arrangement) => {
    setTotalSeats(arrangement.totalSeats);
    setLayoutType(arrangement.layoutType);
    setSeats(arrangement.seats);
    setStage(arrangement.stage || { x: 0, y: -80, rotation: 0 });
    setRows(Math.max(...arrangement.seats.map((s) => s.row)) + 1 || 0);
    setCols(Math.max(...arrangement.seats.map((s) => s.col)) + 1 || 0);
    toast.success("Arrangement loaded successfully!", {
      position: "top-right",
      autoClose: 3000,
      theme: theme === "light" ? "light" : "dark",
    });
  };

  // Loading state
  if (isLoadingAuth) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "light"
            ? "bg-gradient-to-br from-indigo-50 to-purple-50"
            : "bg-gradient-to-br from-gray-900 to-indigo-900"
        }`}
      >
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className={`min-h-screen p-4 sm:p-6 ${
        theme === "light"
          ? "bg-gradient-to-br from-indigo-50 to-purple-50"
          : "bg-gradient-to-br from-gray-900 to-indigo-900"
      } flex items-center justify-center`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className={`w-full max-w-5xl ${
          theme === "light" ? "bg-white" : "bg-gray-800"
        } rounded-2xl shadow-2xl p-6 sm:p-8`}
      >
        <h1
          className={`text-3xl font-bold mb-6 ${
            theme === "light" ? "text-indigo-900" : "text-white"
          }`}
        >
          Cinema Seat Arrangement
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "light" ? "text-indigo-700" : "text-indigo-300"
              }`}
            >
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
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "light" ? "text-indigo-700" : "text-indigo-300"
              }`}
            >
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

          <div className="flex items-end gap-4">
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
                  <Loader2 className="h-5 w-5 animate-spin" />
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

        {errors.general && (
          <p className="mb-4 text-sm text-red-500">{errors.general}</p>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          <div
            ref={containerRef}
            className={`relative flex-1 border-2 rounded-lg overflow-auto ${
              theme === "light"
                ? "bg-gray-50 border-gray-300"
                : "bg-gray-700 border-gray-600"
            }`}
            style={{
              minHeight: layoutType === "custom" ? `${rows * 80 + 240}px` : `${rows * 80 + 160}px`,
              background:
                layoutType === "custom"
                  ? theme === "light"
                    ? "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect x=\"0\" y=\"0\" width=\"80\" height=\"80\" fill=\"none\" stroke=\"%23E5E7EB\" stroke-width=\"1\"/%3E%3C/svg%3E')"
                    : "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect x=\"0\" y=\"0\" width=\"80\" height=\"80\" fill=\"none\" stroke=\"%232D3748\" stroke-width=\"1\"/%3E%3C/svg%3E')"
                  : "none",
            }}
          >
            {layoutType === "custom" ? (
              <motion.div
                className={`absolute flex items-center justify-center bg-gradient-to-r ${
                  theme === "light"
                    ? "from-indigo-500 to-purple-500"
                    : "from-indigo-700 to-purple-700"
                } text-white font-semibold rounded-lg shadow-md cursor-move`}
                style={{
                  width: stage.rotation === 90 ? 80 : 200,
                  height: stage.rotation === 90 ? 200 : 80,
                  transform: `translate(${stage.x}px, ${stage.y}px) rotate(${stage.rotation}deg)`,
                }}
                onMouseDown={(e) => handleMouseDown("stage", e)}
                onKeyDown={(e) => handleKeyDown("stage", e)}
                tabIndex={0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Projector className="h-6 w-6 mr-2" />
                Stage
              </motion.div>
            ) : (
              <motion.div
                className={`w-full h-20 mb-4 rounded-lg flex items-center justify-center text-sm font-medium ${
                  theme === "light" ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white" : "bg-gradient-to-r from-gray-900 to-black text-gray-200"
                } shadow-lg`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Projector className="w-6 h-6 mr-2" />
                Cinema Stage / Screen
              </motion.div>
            )}

            {layoutType === "custom" ? (
              seats.map((seat) => (
                <motion.div
                  key={seat.id}
                  className={`absolute flex items-center justify-center w-[60px] h-[60px] rounded-lg shadow-md cursor-move ${
                    theme === "light"
                      ? "bg-gradient-to-r from-blue-400 to-blue-500 text-white"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  }`}
                  style={{ left: seat.x, top: seat.y }}
                  onMouseDown={(e) => handleMouseDown(seat.id, e)}
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
                          <>
                            <motion.div
                              className={`w-[60px] h-[60px] rounded-lg flex items-center justify-center ${
                                theme === "light"
                                  ? "bg-gradient-to-r from-blue-400 to-blue-500 text-white"
                                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                              } shadow-md`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Armchair className="h-5 w-5 mr-1" />
                              {seat.number}
                            </motion.div>
                          </>
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
              <h2
                className={`text-lg font-semibold ${
                  theme === "light" ? "text-indigo-900" : "text-white"
                }`}
              >
                Stage Controls
              </h2>
              <motion.button
                onClick={rotateStage}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg shadow-md transition-colors ${
                  theme === "light"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                    : "bg-gradient-to-r from-indigo-700 to-purple-700 text-white hover:from-indigo-800 hover:to-purple-800"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {stage.rotation === 0 ? (
                  <>
                    <RotateCw className="h-5 w-5" />
                    Rotate Right
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-5 w-5" />
                    Rotate Left
                  </>
                )}
              </motion.button>
              {/* New: Reset Layout Button */}
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
              <p
                className={`text-sm ${
                  theme === "light" ? "text-indigo-600" : "text-indigo-400"
                }`}
              >
                Click and drag seats or stage to reposition. Use arrow keys to move seats, or press 'R' to rotate the stage.
              </p>
            </div>
          )}
        </div>

        {/* New: Saved Arrangement Section */}
        {savedArrangement && (
          <motion.div
            className={`mt-6 p-6 rounded-lg ${
              theme === "light" ? "bg-white" : "bg-gray-800"
            } shadow-md`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <h3
              className={`text-xl font-semibold ${
                theme === "light" ? "text-indigo-900" : "text-white"
              } mb-4`}
            >
              Your Saved Arrangement
            </h3>
            <div
              className={`p-4 rounded-lg ${
                theme === "light" ? "bg-gray-50" : "bg-gray-700"
              } flex justify-between items-center`}
            >
              <div>
                <p
                  className={`font-medium ${
                    theme === "light" ? "text-indigo-900" : "text-white"
                  }`}
                >
                  {savedArrangement.totalSeats} Seats ({savedArrangement.layoutType})
                </p>
                <p
                  className={`text-sm ${
                    theme === "light" ? "text-indigo-600" : "text-indigo-400"
                  }`}
                >
                  Created:{" "}
                  {savedArrangement.createdAt instanceof Timestamp
                    ? savedArrangement.createdAt.toDate().toLocaleString()
                    : new Date(savedArrangement.createdAt).toLocaleString()}
                </p>
                <p
                  className={`text-sm ${
                    theme === "light" ? "text-indigo-600" : "text-indigo-400"
                  }`}
                >
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
          onClick={() => router.push("/dashboard")}
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
  );
}