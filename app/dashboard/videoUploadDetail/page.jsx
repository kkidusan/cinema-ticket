"use client";

import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { db } from "../../lib/firebase-client";
import { collection, addDoc, Timestamp, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { toGregorian, toEthiopian } from "ethiopian-date";
import { PuffLoader, ClipLoader } from "react-spinners";
import { ThemeContext } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PlusIcon,
  ArrowUpOnSquareIcon,
  XCircleIcon,
  ChevronDownIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CryptoJS from "crypto-js";

// Secret key for encryption (in production, store this securely, e.g., in environment variables)
const ENCRYPTION_KEY = "my-secret-key-123456";

// Predefined movie categories
const movieCategories = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Musical",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western",
];

// Ethiopian months for formatting
const ethMonths = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

// JSDoc for Seat (replacing TypeScript interface for JSX compatibility)
/**
 * @typedef {Object} Seat
 * @property {string} id - The unique identifier for the seat
 * @property {number} number - The seat number
 * @property {number} row - The row number
 * @property {number} col - The column number
 * @property {number} [x] - Optional x-coordinate
 * @property {number} [y] - Optional y-coordinate
 * @property {boolean} reserved - Whether the seat is reserved
 */

// Memoized initial form data
const getInitialFormData = () => ({
  title: "",
  category: "",
  description: "",
  duration: "",
  mainCast: [],
  cinemaName: "",
  cinemaLocation: "",
  availableSite: "",
  ticketPrice: "",
  screeningDate: "",
  poster: "",
  promotionVideo: "",
  movieID: "",
  seats: [], // Array of Seat objects
});

// Tooltip Component
function Tooltip({ children, text, theme }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute z-30 top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap ${
              theme === "light"
                ? "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-900"
                : "bg-gradient-to-r from-gray-700 to-indigo-700 text-white"
            } border ${theme === "light" ? "border-indigo-200" : "border-indigo-800"}`}
            style={{ minWidth: "120px", textAlign: "center" }}
            role="tooltip"
          >
            {text}
            <div
              className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
                theme === "light" ? "bg-indigo-100" : "bg-gray-700"
              } border-t border-l ${
                theme === "light" ? "border-indigo-200" : "border-indigo-800"
              }`}
            ></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// EthiopianDatePicker Component
function EthiopianDatePicker({ name, value, onChange, error, theme }) {
  const getCurrentEthiopianDate = () => {
    const today = new Date();
    const [ethYear, ethMonth, ethDay] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );
    return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(
      ethDay
    ).padStart(2, "0")}`;
  };

  const initialDate = value ? value.split("T")[0] : getCurrentEthiopianDate();
  const initialTime = value ? value.split("T")[1] || "00:00" : "00:00";

  const [ethiopianDate, setEthiopianDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    if (value) {
      const [datePart, timePart] = value.split("T");
      setEthiopianDate(datePart);
      setTime(timePart || "00:00");
    } else {
      const currentEthiopianDate = getCurrentEthiopianDate();
      setEthiopianDate(currentEthiopianDate);
      setTime("00:00");
    }
  }, [value]);

  const handleDateChange = (e) => {
    const { value } = e.target;
    setEthiopianDate(value);
    onChange({ target: { name, value: `${value}T${time}` } });
  };

  const handleTimeChange = (e) => {
    const { value } = e.target;
    setTime(value);
    if (ethiopianDate) {
      onChange({ target: { name, value: `${ethiopianDate}T${value}` } });
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="date"
          value={ethiopianDate}
          onChange={handleDateChange}
          className={`mt-1 block w-1/2 px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
            error
              ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
              : theme === "light"
              ? "border border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
              : "border border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
          } ${theme === "light" ? "bg-white" : "bg-gray-600"} transition-all duration-200`}
        />
        <input
          type="time"
          value={time}
          onChange={handleTimeChange}
          className={`mt-1 block w-1/2 px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
            error
              ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
              : theme === "light"
              ? "border border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
              : "border border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
          } ${theme === "light" ? "bg-white" : "bg-gray-600"} transition-all duration-200`}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Function to format date in Ethiopian Calendar
const formatEthiopianDate = (dateString) => {
  const [datePart, timePart] = dateString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [gregYear, gregMonth, gregDay] = toGregorian(year, month, day);
  const date = new Date(gregYear, gregMonth - 1, gregDay);
  const [ethYear, ethMonth, ethDay] = toEthiopian(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );

  const [hours, minutes] = timePart.split(":");
  const hourNum = parseInt(hours);
  const isPM = hourNum >= 12;
  const hour12 = hourNum % 12 || 12;
  const time = `${hour12.toString().padStart(2, "0")}:${minutes} ${isPM ? "PM" : "AM"}`;

  return `${ethDay} ${ethMonths[ethMonth - 1]} ${ethYear}, ${time}`;
};

// Encryption and Decryption Functions
const encryptData = (data) => {
  try {
    const dataToEncrypt = JSON.parse(JSON.stringify(data));
    const dataString = JSON.stringify(dataToEncrypt);
    console.debug("Data to encrypt:", dataString);
    const encrypted = CryptoJS.AES.encrypt(dataString, ENCRYPTION_KEY).toString();
    console.debug("Encrypted data:", encrypted);
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
};

const decryptData = (encryptedData) => {
  try {
    if (!encryptedData || typeof encryptedData !== "string") {
      console.warn("Invalid encrypted data:", encryptedData);
      return null;
    }
    console.debug("Encrypted data to decrypt:", encryptedData);
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) {
      console.warn("Decrypted string is empty");
      return null;
    }
    console.debug("Decrypted string:", decryptedString);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Decryption error:", error.message);
    return null;
  }
};

// Define steps outside the component to avoid redefinition
const steps = [
  {
    title: "Basic Info",
    fields: [
      { name: "title", label: "Movie Title", type: "text" },
      { name: "category", label: "Category", type: "select" },
      { name: "duration", label: "Duration (HH:MM:SS)*", type: "time" },
    ],
  },
  {
    title: "Cast & Venue",
    fields: [
      { name: "mainCast", label: "Main Cast", type: "custom-cast" },
      { name: "cinemaName", label: "Cinema Name", type: "text" },
      { name: "cinemaLocation", label: "Cinema Location", type: "text" },
    ],
  },
  {
    title: "Ticket Info",
    fields: [
      { name: "availableSite", label: `Available Site`, type: "number" },
      { name: "ticketPrice", label: "Ticket Price (ETB)", type: "number" },
      { name: "screeningDate", label: "Screening Date", type: "custom" },
    ],
  },
  {
    title: "Media",
    fields: [
      { name: "description", label: "Description", type: "textarea" },
      {
        name: "poster",
        label: "Poster (Image Only)",
        type: "file",
        accept: "image/*",
      },
      {
        name: "promotionVideo",
        label: "Promotion Video (Video Only)",
        type: "file",
        accept: "video/*",
      },
    ],
  },
];

export default function VideoUploadForm() {
  const initialFormData = useMemo(getInitialFormData, []);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [castImageUploading, setCastImageUploading] = useState({});
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [ownerDetails, setOwnerDetails] = useState({ firstName: "", lastName: "" });
  const { theme } = useContext(ThemeContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSeats, setTotalSeats] = useState(null);
  const [seatArrangement, setSeatArrangement] = useState(null);
  const totalSteps = 4;
  const [touched, setTouched] = useState({
    poster: false,
    promotionVideo: false,
    mainCast: false,
  });
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPending, setIsPending] = useState(null);

  const generateMovieID = useCallback(() => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 8 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join("");
  }, []);

  const handleDesignSeats = useCallback(() => {
    try {
      const encryptedData = encryptData(formData);
      if (encryptedData) {
        localStorage.setItem("videoUploadFormData", encryptedData);
      } else {
        throw new Error("Failed to encrypt form data");
      }
      router.push("/dashboard/designseat?from=videoUploadDetail");
    } catch (error) {
      toast.error("Failed to save form data. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    }
  }, [formData, router, theme]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "category") setIsCategoryOpen(false);
    if (name === "availableSite" && totalSeats !== null && totalSeats > 0) {
      const numValue = Number(value);
      if (!Number.isInteger(numValue) || numValue <= 0) {
        setErrors((prev) => ({
          ...prev,
          availableSite: "Available site must be a positive integer",
        }));
      } else if (numValue > totalSeats) {
        setErrors((prev) => ({
          ...prev,
          availableSite: `Available site cannot exceed total seats (${totalSeats})`,
        }));
      } else if (seatArrangement && totalSeats !== null) {
        const reservedSeatsCount = seatArrangement.filter(seat => seat.reserved).length;
        const availableSeats = totalSeats - reservedSeatsCount;
        if (numValue > availableSeats) {
          setErrors((prev) => ({
            ...prev,
            availableSite: `Available site cannot exceed available seats (${availableSeats}) after reserving ${reservedSeatsCount} seats`,
          }));
        }
      }
    }
  }, [totalSeats, seatArrangement]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageUploading(true);
    setTouched((prev) => ({ ...prev, poster: true }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData((prev) => ({
          ...prev,
          poster: data.secure_url,
          movieID: generateMovieID(),
        }));
        setErrors((prev) => ({ ...prev, poster: "" }));
      } else {
        throw new Error("Image upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload poster.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    } finally {
      setImageUploading(false);
    }
  }, [theme, generateMovieID]);

  const handleVideoUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setTouched((prev) => ({ ...prev, promotionVideo: true }));
    setVideoUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData((prev) => ({
          ...prev,
          promotionVideo: data.secure_url,
        }));
        setErrors((prev) => ({ ...prev, promotionVideo: "" }));
      } else {
        throw new Error("Video upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload video.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    } finally {
      setVideoUploading(false);
    }
  }, [theme]);

  const handleCastChange = useCallback((index, field, value) => {
    setFormData((prev) => {
      const newCast = [...prev.mainCast];
      newCast[index] = { ...newCast[index], [field]: value };
      return { ...prev, mainCast: newCast };
    });
    setErrors((prev) => ({ ...prev, mainCast: "" }));
    setTouched((prev) => ({ ...prev, mainCast: true }));
  }, []);

  const handleCastImage = useCallback(async (index, file) => {
    if (!file) return;

    setCastImageUploading((prev) => ({ ...prev, [index]: true }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        handleCastChange(index, "image", data.secure_url);
      } else {
        throw new Error("Cast image upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload cast image.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    } finally {
      setCastImageUploading((prev) => ({ ...prev, [index]: false }));
    }
  }, [handleCastChange, theme]);

  const addCastMember = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      mainCast: [...prev.mainCast, { name: "", image: "" }],
    }));
    setTouched((prev) => ({ ...prev, mainCast: true }));
  }, []);

  const removeCastMember = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      mainCast: prev.mainCast.filter((_, i) => i !== index),
    }));
  }, []);

  const validateStep = useCallback((step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = "Title is required";
        if (!formData.category.trim()) newErrors.category = "Category is required";
        if (!formData.duration.trim()) {
          newErrors.duration = "Duration is required";
        } else if (!/^\d{2}:\d{2}:\d{2}$/.test(formData.duration)) {
          newErrors.duration = "Duration must be in HH:MM:SS format";
        }
        break;
      case 2:
        if (!formData.mainCast.length) {
          newErrors.mainCast = "At least one cast member is required";
        } else if (
          formData.mainCast.some(
            (cast) => !cast.name.trim() || !cast.image
          )
        ) {
          newErrors.mainCast = "Each cast member must have a name and an image";
        }
        if (!formData.cinemaName.trim())
          newErrors.cinemaName = "Cinema name is required";
        if (!formData.cinemaLocation.trim())
          newErrors.cinemaLocation = "Cinema location is required";
        break;
      case 3:
        if (
          !formData.availableSite ||
          !Number.isInteger(Number(formData.availableSite)) ||
          Number(formData.availableSite) <= 0
        ) {
          newErrors.availableSite = "Available site must be a positive integer";
        } else if (totalSeats === 0 || totalSeats === null || !seatArrangement) {
          newErrors.availableSite = (
            <>
              No valid seat arrangement found.{" "}
              <a
                onClick={handleDesignSeats}
                className={`text-sm font-medium cursor-pointer ${
                  theme === "light"
                    ? "text-indigo-600 hover:text-indigo-800"
                    : "text-indigo-400 hover:text-indigo-300"
                } underline transition-colors`}
              >
                Make Seat Arrangement
              </a>
            </>
          );
        } else if (totalSeats !== null && Number(formData.availableSite) > totalSeats) {
          newErrors.availableSite = `Available site cannot exceed total seats (${totalSeats})`;
        } else if (seatArrangement && totalSeats !== null) {
          const reservedSeatsCount = seatArrangement.filter(seat => seat.reserved).length;
          const availableSeats = totalSeats - reservedSeatsCount;
          if (Number(formData.availableSite) > availableSeats) {
            newErrors.availableSite = `Available site cannot exceed available seats (${availableSeats}) after reserving ${reservedSeatsCount} seats`;
          }
        }
        if (
          !formData.ticketPrice ||
          !Number.isInteger(Number(formData.ticketPrice)) ||
          Number(formData.ticketPrice) <= 0
        ) {
          newErrors.ticketPrice = "Ticket price must be a positive whole number";
        }
        if (!formData.screeningDate) {
          newErrors.screeningDate = "Screening date is required";
        } else {
          const [datePart] = formData.screeningDate.split("T");
          const [year, month, day] = datePart.split("-").map(Number);
          const [gregYear, gregMonth, gregDay] = toGregorian(year, month, day);
          const screeningDate = new Date(gregYear, gregMonth - 1, gregDay);
          const today = new Date();
          const minDate = new Date(today);
          minDate.setDate(today.getDate() + 1);
          minDate.setHours(0, 0, 0, 0);

          if (screeningDate < minDate) {
            newErrors.screeningDate = "Screening date must be at least one day in the future";
          }
        }
        if (!formData.seats || formData.seats.length === 0) {
          newErrors.availableSite = (
            <>
              No seat arrangement found.{" "}
              <a
                onClick={handleDesignSeats}
                className={`text-sm font-medium cursor-pointer ${
                  theme === "light"
                    ? "text-indigo-600 hover:text-indigo-800"
                    : "text-indigo-400 hover:text-indigo-300"
                } underline transition-colors`}
              >
                Make Seat Arrangement
              </a>
            </>
          );
        }
        break;
      case 4:
        if (!formData.description.trim())
          newErrors.description = "Description is required";
        if (!formData.poster && touched.poster)
          newErrors.poster = "Poster image is required";
        if (!formData.promotionVideo && touched.promotionVideo)
          newErrors.promotionVideo = "Promotion video is required";
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, touched, totalSeats, seatArrangement, theme, handleDesignSeats]);

  const handleNext = useCallback(() => {
    if (currentStep === 4) {
      setTouched({
        poster: true,
        promotionVideo: true,
        mainCast: true,
      });
    }

    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);

    setTouched({
      poster: true,
      promotionVideo: true,
      mainCast: true,
    });

    if (!validateStep(currentStep)) {
      setLoading(false);
      return;
    }

    try {
      const formattedScreeningDate = formData.screeningDate
        ? formatEthiopianDate(formData.screeningDate)
        : "";

      await addDoc(collection(db, "Movies"), {
        email: userEmail,
        firstName: ownerDetails.firstName,
        lastName: ownerDetails.lastName,
        title: formData.title,
        category: formData.category,
        description: formData.description || "",
        duration: formData.duration,
        mainCast: formData.mainCast,
        cinemaName: formData.cinemaName,
        cinemaLocation: formData.cinemaLocation,
        availableSite: Number(formData.availableSite),
        ticketPrice: Number(formData.ticketPrice),
        screeningDate: formattedScreeningDate,
        uploadingDate: Timestamp.now(),
        poster: formData.poster,
        promotionVideo: formData.promotionVideo,
        movieID: formData.movieID,
        seats: formData.seats,
        createdAt: Timestamp.now(),
        isEthiopianDate: true,
      });

      localStorage.removeItem("videoUploadFormData");
      setFormData(initialFormData);

      toast.success("Movie uploaded successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to upload movie. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: theme === "light" ? "light" : "dark",
      });
    } finally {
      setLoading(false);
    }
  }, [formData, userEmail, ownerDetails, currentStep, validateStep, router, theme, initialFormData]);

  useEffect(() => {
    const from = searchParams.get("from");
    const encryptedFormData = localStorage.getItem("videoUploadFormData");

    if (encryptedFormData && (from === "designseat" || from === "videoUploadDetail")) {
      const decryptedData = decryptData(encryptedFormData);
      if (decryptedData) {
        setFormData((prev) => {
          const newData = {
            ...prev,
            ...decryptedData,
            mainCast: Array.isArray(decryptedData.mainCast) ? decryptedData.mainCast : [],
            seats: Array.isArray(decryptedData.seats) ? decryptedData.seats : [],
          };
          if (JSON.stringify(prev) !== JSON.stringify(newData)) {
            return newData;
          }
          return prev;
        });
        if (from === "designseat") {
          setCurrentStep((prev) => (prev !== 3 ? 3 : prev));
        }
      } else {
        localStorage.removeItem("videoUploadFormData");
        setFormData(initialFormData);
        toast.error("Failed to restore form data. Starting fresh.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: theme === "light" ? "light" : "dark",
        });
      }
    } else {
      localStorage.removeItem("videoUploadFormData");
      setFormData((prev) => (JSON.stringify(prev) !== JSON.stringify(initialFormData) ? initialFormData : prev));
    }
    setLoading(false);
  }, [searchParams, theme, initialFormData]);

  useEffect(() => {
    let unsubscribeSeatArrangements = null;
    let unsubscribePending = null;

    const fetchUserAndOwner = async () => {
      try {
        setLoading(true);
        setAuthLoading(true);

        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Unauthorized access. Please log in.";
          toast.error(errorMessage, {
            position: "top-right",
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
        if (data.email && data.role) {
          setUserEmail(data.email);
          setUserRole(data.role);
          setAuthLoading(false);

          if (data.role !== "owner") {
            toast.error("User is not an owner.", {
              position: "top-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === "light" ? "light" : "dark",
            });
            throw new Error("User is not an owner.");
          }

          const ownerQuery = query(
            collection(db, "owner"),
            where("email", "==", data.email)
          );
          const ownerSnapshot = await getDocs(ownerQuery);
          if (!ownerSnapshot.empty) {
            const ownerData = ownerSnapshot.docs[0].data();
            setOwnerDetails({
              firstName: ownerData.firstName || "",
              lastName: ownerData.lastName || "",
            });
            setIsPending(ownerData.pending === true);
          } else {
            toast.error("Owner details not found.", {
              position: "top-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: theme === "light" ? "light" : "dark",
            });
            throw new Error("Owner details not found");
          }

          unsubscribePending = onSnapshot(
            ownerQuery,
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
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: theme === "light" ? "light" : "dark",
              });
            }
          );

          if (isPending === false) {
            const arrangementsQuery = query(
              collection(db, "seatArrangements"),
              where("userEmail", "==", data.email)
            );

            unsubscribeSeatArrangements = onSnapshot(arrangementsQuery, (snapshot) => {
              if (!snapshot.empty) {
                const arrangementsData = snapshot.docs[0].data();
                const totalSeatsValue = Number.isInteger(arrangementsData.totalSeats) ? arrangementsData.totalSeats : 0;
                const seats = Array.isArray(arrangementsData.seats) ? arrangementsData.seats : [];
                setTotalSeats(totalSeatsValue);
                setSeatArrangement(seats);
                setFormData((prev) => {
                  const newData = {
                    ...prev,
                    availableSite: totalSeatsValue.toString(),
                    seats: seats,
                  };
                  if (JSON.stringify(prev) !== JSON.stringify(newData)) {
                    return newData;
                  }
                  return prev;
                });
                setErrors((prev) => ({
                  ...prev,
                  availableSite: totalSeatsValue > 0 ? "" : (
                    <>
                      No valid seat arrangement found.{" "
                      }<a
                        onClick={handleDesignSeats}
                        className={`text-sm font-medium cursor-pointer ${
                          theme === "light"
                            ? "text-indigo-600 hover:text-indigo-800"
                            : "text-indigo-400 hover:text-indigo-300"
                        } underline transition-colors`}
                      >
                        Make Seat Arrangement
                      </a>
                    </>
                  ),
                }));
              } else {
                setTotalSeats(0);
                setSeatArrangement(null);
                setFormData((prev) => ({
                  ...prev,
                  seats: [],
                  availableSite: "",
                }));
                setErrors((prev) => ({
                  ...prev,
                  availableSite: (
                    <>
                      No seat arrangement found.{" "
                      }<a
                        onClick={handleDesignSeats}
                        className={`text-sm font-medium cursor-pointer ${
                          theme === "light"
                            ? "text-indigo-600 hover:text-indigo-800"
                            : "text-indigo-400 hover:text-indigo-300"
                        } underline transition-colors`}
                      >
                        Make Seat Arrangement
                      </a>
                    </>
                  ),
                }));
              }
            }, (error) => {
              toast.error("Failed to fetch seat arrangement.", {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: theme === "light" ? "light" : "dark",
              });
              setTotalSeats(0);
              setSeatArrangement(null);
              setFormData((prev) => ({
                ...prev,
                seats: [],
                availableSite: "",
              }));
              setErrors((prev) => ({
                ...prev,
                availableSite: (
                  <>
                    Failed to load seat arrangement.{" "
                    }<a
                      onClick={handleDesignSeats}
                      className={`text-sm font-medium cursor-pointer ${
                        theme === "light"
                          ? "text-indigo-600 hover:text-indigo-800"
                          : "text-indigo-400 hover:text-indigo-300"
                      } underline transition-colors`}
                    >
                      Make Seat Arrangement
                    </a>
                  </>
                ),
              }));
            });
          }
        } else {
          toast.error("No email or role found.", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: theme === "light" ? "light" : "dark",
          });
          throw new Error("No email or role found");
        }
      } catch (error) {
        setTimeout(() => {
          router.replace("/login");
        }, 3500);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndOwner();

    return () => {
      if (unsubscribeSeatArrangements) {
        unsubscribeSeatArrangements();
      }
      if (unsubscribePending) {
        unsubscribePending();
      }
    };
  }, [router, theme, isPending]);

  if (authLoading || userRole !== "owner") {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
        }`}
      >
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
            Loading video upload form...
          </motion.p>
        </motion.div>
        <ToastContainer
          position="top-right"
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

  const reservedSeatsCount = seatArrangement ? seatArrangement.filter(seat => seat.reserved).length : 0;
  const availableSeats = totalSeats !== null && totalSeats > 0 ? totalSeats - reservedSeatsCount : null;

  const dynamicSteps = steps.map((step, index) =>
    index === 2
      ? {
          ...step,
          fields: step.fields.map((field) =>
            field.name === "availableSite"
              ? { ...field, label: `Available Site (Max: ${availableSeats !== null ? availableSeats : "N/A"})` }
              : field
          ),
        }
      : step
  );

  return (
    <div className={`min-h-screen flex flex-col ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
      <ToastContainer
        position="top-right"
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
        <div
          className={`min-h-screen flex items-center justify-center ${
            theme === "light"
              ? "bg-gradient-to-br from-indigo-50 to-purple-50"
              : "bg-gradient-to-br from-gray-900 to-indigo-900"
          } p-4 sm:p-6 transition-all duration-300 ${
            isCategoryOpen ? "backdrop-blur-sm" : ""
          }`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 300 }}
            whileHover={{ scale: 1.02 }}
            className={`w-full max-w-4xl ${
              theme === "light"
                ? "bg-gradient-to-br from-blue-50 to-purple-50"
                : "bg-gradient-to-br from-gray-800 to-gray-900"
            } p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl`}
          >
            <div
              className={`${
                theme === "light" ? "bg-indigo-50" : "bg-indigo-900"
              } rounded-t-2xl p-4 mb-6 border-b ${
                theme === "light" ? "border-indigo-100" : "border-indigo-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <motion.button
                  onClick={() => router.back()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    theme === "light"
                      ? "text-indigo-700 hover:bg-indigo-100"
                      : "text-indigo-300 hover:bg-indigo-800"
                  } transition-colors`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span className="text-lg font-medium">Back</span>
                </motion.button>

                <div className="flex items-center gap-4">
                  {dynamicSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          currentStep > index + 1
                            ? "bg-green-500"
                            : currentStep === index + 1
                            ? "bg-indigo-600"
                            : theme === "light"
                            ? "bg-indigo-200"
                            : "bg-indigo-700"
                        } text-white transition-colors`}
                      >
                        {currentStep > index + 1 ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={`hidden md:inline ${
                          currentStep === index + 1 ? "font-semibold" : ""
                        } ${
                          theme === "light" ? "text-indigo-700" : "text-indigo-300"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2
                className={`text-3xl font-bold ${
                  theme === "light" ? "text-indigo-900" : "text-white"
                }`}
              >
                {dynamicSteps[currentStep - 1].title}
              </h2>
              <p
                className={`mt-1 ${
                  theme === "light" ? "text-indigo-600" : "text-indigo-400"
                }`}
              >
                Step {currentStep} of {totalSteps}
              </p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="space-y-6">
                {totalSeats > 0 && seatArrangement && currentStep === 3 && (
                  <div
                    className={`mb-6 p-6 rounded-xl ${
                      theme === "light"
                        ? "bg-gradient-to-r from-green-50 to-teal-50"
                        : "bg-gradient-to-r from-green-900 to-teal-900"
                    } border ${
                      theme === "light" ? "border-green-200" : "border-green-700"
                    } shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}
                    onClick={handleDesignSeats}
                  >
                    <div className="flex items-center gap-4">
                      <TableCellsIcon
                        className={`h-8 w-8 ${
                          theme === "light" ? "text-green-600" : "text-green-300"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-base font-semibold ${
                            theme === "light" ? "text-green-700" : "text-green-300"
                          }`}
                        >
                          Seat arrangement found ({totalSeats} seats)
                        </p>
                        <p
                          className={`text-sm ${
                            theme === "light" ? "text-green-600" : "text-green-400"
                          }`}
                        >
                          Click to modify the seat arrangement.
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        className={`ml-auto px-4 py-2 rounded-lg ${
                          theme === "light"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-green-700 text-white hover:bg-green-800"
                        } flex items-center gap-2 transition-colors shadow-md`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <TableCellsIcon className="h-5 w-5" />
                        Modify Seats
                      </motion.button>
                    </div>
                  </div>
                )}
                {dynamicSteps[currentStep - 1].fields.map((field, index) => (
                  <div key={index}>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        theme === "light" ? "text-indigo-700" : "text-indigo-300"
                      }`}
                    >
                      {field.label}
                      <span className="text-red-500">*</span>
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        className={`mt-1 block w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                          errors[field.name]
                            ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                            : theme === "light"
                            ? "border border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                            : "border border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
                        } ${theme === "light" ? "bg-white" : "bg-gray-700"} transition-all duration-200`}
                        rows={4}
                        autoComplete="off"
                      />
                    ) : field.type === "file" ? (
                      <div
                        className={`mt-1 flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg transition-colors ${
                          errors[field.name] && touched[field.name]
                            ? "border-red-500 bg-red-50/50"
                            : theme === "light"
                            ? "border-indigo-200 bg-indigo-50 hover:border-indigo-300"
                            : "border-indigo-700 bg-gray-700 hover:border-indigo-600"
                        }`}
                      >
                        <div className="text-center">
                          {field.name === "promotionVideo" && videoUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <ClipLoader color="#6366f1" size={40} />
                              <p
                                className={`text-sm font-medium ${
                                  theme === "light" ? "text-indigo-600" : "text-indigo-400"
                                }`}
                              >
                                Uploading video...
                              </p>
                            </div>
                          ) : field.name === "poster" && imageUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <ClipLoader color="#6366f1" size={40} />
                              <p
                                className={`text-sm font-medium ${
                                  theme === "light" ? "text-indigo-600" : "text-indigo-400"
                                }`}
                              >
                                Uploading poster...
                              </p>
                            </div>
                          ) : (
                            <>
                              <p
                                className={`mb-3 ${
                                  errors[field.name] && touched[field.name]
                                    ? "text-red-500 font-medium"
                                    : theme === "light"
                                    ? "text-indigo-600"
                                    : "text-indigo-400"
                                }`}
                              >
                                {formData[field.name]
                                  ? "File selected"
                                  : errors[field.name] && touched[field.name]
                                  ? `Please upload ${
                                      field.accept.includes("image")
                                        ? "an image"
                                        : "a video"
                                    }`
                                  : `Click to upload ${
                                      field.accept.includes("image")
                                        ? "an image"
                                        : "a video"
                                    }`}
                              </p>
                              <input
                                type="file"
                                name={field.name}
                                accept={field.accept}
                                onChange={
                                  field.name === "poster"
                                    ? handleFileChange
                                    : handleVideoUpload
                                }
                                className="hidden"
                                id={field.name}
                                disabled={
                                  (field.name === "promotionVideo" && videoUploading) ||
                                  (field.name === "poster" && imageUploading)
                                }
                              />
                              <label
                                htmlFor={field.name}
                                className={`inline-flex items-center px-5 py-2 rounded-lg cursor-pointer transition-colors ${
                                  errors[field.name] && touched[field.name]
                                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600"
                                    : theme === "light"
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : "bg-indigo-700 text-white hover:bg-indigo-800"
                                } ${
                                  (field.name === "promotionVideo" && videoUploading) ||
                                  (field.name === "poster" && imageUploading)
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                {formData[field.name] ? "Change File" : "Choose File"}
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    ) : field.type === "custom" ? (
                      <EthiopianDatePicker
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        error={errors[field.name]}
                        theme={theme}
                      />
                    ) : field.type === "custom-cast" ? (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {formData.mainCast.map((cast, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              className={`flex items-center gap-4 p-4 rounded-xl ${
                                theme === "light" ? "bg-indigo-50" : "bg-gray-700"
                              } shadow-md hover:shadow-lg transition-all duration-200`}
                            >
                              {cast.image && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 border-indigo-200"
                                >
                                  <img
                                    src={cast.image}
                                    alt="Cast preview"
                                    className="w-full h-full object-cover"
                                  />
                                </motion.div>
                              )}
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={cast.name}
                                  onChange={(e) =>
                                    handleCastChange(idx, "name", e.target.value)
                                  }
                                  placeholder="Cast member name"
                                  className={`w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                                    errors.mainCast && !cast.name.trim()
                                      ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                                      : theme === "light"
                                      ? "border border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                                      : "border border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
                                  } ${
                                    theme === "light" ? "bg-white" : "bg-gray-600"
                                  } transition-all duration-200`}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Tooltip text="Upload Cast Image" theme={theme}>
                                  <div className="relative">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleCastImage(idx, e.target.files[0])
                                      }
                                      className="hidden"
                                      id={`cast-image-${idx}`}
                                      disabled={castImageUploading[idx]}
                                    />
                                    <motion.label
                                      htmlFor={`cast-image-${idx}`}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className={`cursor-pointer ${
                                        castImageUploading[idx]
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      aria-label="Upload cast image"
                                    >
                                      {castImageUploading[idx] ? (
                                        <ClipLoader color="#6366f1" size={20} />
                                      ) : (
                                        <ArrowUpOnSquareIcon
                                          className="h-10 w-10 p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                        />
                                      )}
                                    </motion.label>
                                  </div>
                                </Tooltip>
                                <Tooltip text="Remove Cast Member" theme={theme}>
                                  <motion.button
                                    type="button"
                                    onClick={() => removeCastMember(idx)}
                                    className="p-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    aria-label="Remove cast member"
                                  >
                                    <XCircleIcon className="h-5 w-5" />
                                  </motion.button>
                                </Tooltip>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <motion.button
                          type="button"
                          onClick={addCastMember}
                          className={`flex items-center gap-2 px-5 py-3 rounded-lg ${
                            theme === "light"
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                              : "bg-gradient-to-r from-indigo-700 to-purple-700 text-white hover:from-indigo-800 hover:to-purple-800"
                          } transition-all shadow-md`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <PlusIcon className="h-5 w-5" />
                          Add Cast Member
                        </motion.button>
                      </div>
                    ) : field.type === "select" ? (
                      <div className="relative">
                        <motion.button
                          type="button"
                          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                            errors[field.name]
                              ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                              : theme === "light"
                              ? "border border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                              : "border border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
                          } ${theme === "light" ? "bg-white" : "bg-gray-600"} transition-all duration-200`}
                          whileHover={{ scale: 1.02 }}
                        >
                          <span
                            className={`${
                              formData[field.name] ? "" : "text-gray-500"
                            }`}
                          >
                            {formData[field.name] || "Select a category"}
                          </span>
                          <ChevronDownIcon
                            className={`h-5 w-5 ${
                              theme === "light"
                                ? "text-indigo-500"
                                : "text-indigo-400"
                            }`}
                          />
                        </motion.button>
                        <AnimatePresence>
                          {isCategoryOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={`absolute z-20 w-full mt-2 rounded-lg shadow-xl ${
                                theme === "light" ? "bg-white" : "bg-gray-700"
                              } max-h-60 overflow-y-auto`}
                            >
                              {movieCategories.map((category) => (
                                <motion.div
                                  key={category}
                                  whileHover={{ scale: 1.02 }}
                                  className={`px-4 py-3 cursor-pointer transition-colors ${
                                    formData[field.name] === category
                                      ? theme === "light"
                                        ? "bg-indigo-100 text-indigo-900"
                                        : "bg-indigo-600 text-white"
                                      : theme === "light"
                                      ? "hover:bg-indigo-50"
                                      : "hover:bg-indigo-700"
                                  }`}
                                  onClick={() =>
                                    handleChange({
                                      target: { name: field.name, value: category },
                                    })
                                  }
                                >
                                  {category}
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : field.name === "duration" ? (
                      <input
                        type="time"
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        step="1"
                        className={`mt-1 block w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                          errors[field.name]
                            ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                            : theme === "light"
                            ? "border border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                            : "border border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
                        } ${theme === "light" ? "bg-white" : "bg-gray-600"} transition-all duration-200`}
                        autoComplete="off"
                      />
                    ) : (
                      <div>
                        <input
                          type={field.type}
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleChange}
                          className={`mt-1 block w-full px-4 py-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                            errors[field.name]
                              ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500"
                            : theme === "light"
                            ? "border border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                            : "border border-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
                          } ${theme === "light" ? "bg-white" : "bg-gray-600"} transition-all duration-200`}
                          step={field.type === "number" ? "1" : undefined}
                          autoComplete="off"
                        />
                        {field.name === "availableSite" && totalSeats > 0 && seatArrangement ? (
                          <a
                            onClick={handleDesignSeats}
                            className={`mt-2 inline-block text-sm font-medium cursor-pointer ${
                              theme === "light"
                                ? "text-indigo-600 hover:text-indigo-800"
                                : "text-indigo-400 hover:text-indigo-300"
                            } underline transition-colors`}
                          >
                            Modify Seat Arrangement
                          </a>
                        ) : field.name === "availableSite" && (
                          <a
                            onClick={handleDesignSeats}
                            className={`mt-2 inline-block text-sm font-medium cursor-pointer ${
                              theme === "light"
                                ? "text-indigo-600 hover:text-indigo-800"
                                : "text-indigo-400 hover:text-indigo-300"
                            } underline transition-colors`}
                          >
                            Make Seat Arrangement
                          </a>
                        )}
                      </div>
                    )}
                    {errors[field.name] &&
                      field.type !== "file" &&
                      field.type !== "custom-cast" &&
                      field.type !== "select" && (
                        <p className="mt-2 text-sm text-red-500">
                          {errors[field.name]}
                        </p>
                      )}
                    {errors[field.name] && field.type === "file" && touched[field.name] && (
                      <p className="mt-2 text-sm text-red-500">
                        {errors[field.name]}
                      </p>
                    )}
                    {errors.mainCast &&
                      field.type === "custom-cast" &&
                      touched.mainCast && (
                        <p className="mt-2 text-sm text-red-500">
                          {errors.mainCast}
                        </p>
                      )}
                    {errors[field.name] && field.type === "select" && (
                      <p className="mt-2 text-sm text-red-500">
                        {errors[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <motion.button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg ${
                    theme === "light"
                      ? "text-indigo-700 hover:bg-indigo-100"
                      : "text-indigo-300 hover:bg-indigo-800"
                  } transition-colors disabled:opacity-50`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Previous
                </motion.button>

                {currentStep < totalSteps ? (
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Next
                    <ArrowRightIcon className="h-5 w-5" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="submit"
                    disabled={loading || videoUploading || imageUploading || Object.values(castImageUploading).some((v) => v)}
                    className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-indigo-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-indigo-600 transition-all disabled:opacity-70`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Submit Movie"
                    )}
                  </motion.button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}