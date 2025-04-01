"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebaseconfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toGregorian, toEthiopian } from "ethiopian-date";
import { PuffLoader } from "react-spinners";
import { ThemeContext } from "../../context/ThemeContext";
import { useContext } from "react";
import { motion } from "framer-motion";
import { FaArrowLeft, FaArrowRight, FaCheck } from "react-icons/fa";

export default function VideoUploadForm() {
    const [formData, setFormData] = useState({
        title: "",
        category: "",
        description: "",
        duration: "",
        mainCast: "",
        cinemaName: "",
        cinemaLocation: "",
        availableSite: "",
        ticketPrice: "",
        screeningDate: "",
        poster: "",
        promotionVideo: "",
        movieID: "",
    });

    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const router = useRouter();
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState("");
    const { theme } = useContext(ThemeContext);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;
    const [touched, setTouched] = useState({
        poster: false,
        promotionVideo: false
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch("/api/validate", {
                    method: "GET",
                    credentials: "include",
                });

                if (!response.ok) throw new Error("Unauthorized");

                const data = await response.json();
                if (data.email && data.role) {
                    setUserEmail(data.email);
                    setUserRole(data.role);
                    setAuthLoading(false);

                    if (data.role !== "owner") {
                        router.replace("/login");
                        return;
                    }
                } else {
                    throw new Error("No email or role found");
                }
            } catch (error) {
                console.error("Authentication error:", error);
                router.replace("/login");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            setFormData((prev) => ({
                ...prev,
                poster: reader.result,
                movieID: generateMovieID(),
            }));
            setErrors((prev) => ({ ...prev, poster: "" }));
            setTouched((prev) => ({ ...prev, poster: true }));
        };
    };

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setTouched((prev) => ({ ...prev, promotionVideo: true }));

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
            }
        } catch (error) {
            console.error("Error uploading video:", error);
            setErrors((prev) => ({ ...prev, promotionVideo: "Failed to upload video" }));
        }
    };

    const generateMovieID = () => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return Array.from({ length: 8 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join("");
    };

    const validateStep = (step) => {
        const newErrors = {};

        switch (step) {
            case 1:
                if (!formData.title.trim()) newErrors.title = "Title is required";
                if (!formData.category.trim()) newErrors.category = "Category is required";
                if (!formData.duration.trim()) newErrors.duration = "Duration is required";
                break;
            case 2:
                if (!formData.mainCast.trim()) newErrors.mainCast = "Main cast is required";
                if (!formData.cinemaName.trim()) newErrors.cinemaName = "Cinema name is required";
                if (!formData.cinemaLocation.trim()) newErrors.cinemaLocation = "Cinema location is required";
                break;
            case 3:
                if (!formData.availableSite.trim()) newErrors.availableSite = "Available site is required";
                if (!formData.ticketPrice || !Number.isInteger(Number(formData.ticketPrice))) {
                    newErrors.ticketPrice = "Ticket price must be a whole number";
                }
                if (!formData.screeningDate) newErrors.screeningDate = "Screening date is required";
                break;
            case 4:
                if (!formData.description.trim()) newErrors.description = "Description is required";
                if (!formData.poster && touched.poster) newErrors.poster = "Poster image is required";
                if (!formData.promotionVideo && touched.promotionVideo) newErrors.promotionVideo = "Promotion video is required";
                break;
            default:
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (currentStep === 4) {
            setTouched({
                poster: true,
                promotionVideo: true
            });
        }
        
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => prev - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        setTouched({
            poster: true,
            promotionVideo: true
        });

        if (!validateStep(currentStep)) {
            setLoading(false);
            return;
        }

        try {
            await addDoc(collection(db, "Movies"), {
                email: userEmail,
                title: formData.title,
                category: formData.category,
                description: formData.description || "",
                duration: formData.duration + ":00",
                mainCast: formData.mainCast,
                cinemaName: formData.cinemaName,
                cinemaLocation: formData.cinemaLocation,
                availableSite: formData.availableSite,
                ticketPrice: Number(formData.ticketPrice),
                screeningDate: formData.screeningDate,
                uploadingDate: Timestamp.now(),
                poster: formData.poster,
                promotionVideo: formData.promotionVideo,
                movieID: formData.movieID,
                createdAt: Timestamp.now(),
                isEthiopianDate: true,
            });

            alert("Movie uploaded successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error uploading movie:", error);
            alert("Failed to upload movie.");
        }
        setLoading(false);
    };

    if (authLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
                <PuffLoader color="#3b82f6" size={100} />
            </div>
        );
    }

    const steps = [
        {
            title: "Basic Info",
            fields: [
                { name: "title", label: "Movie Title", type: "text" },
                { name: "category", label: "Category", type: "text" },
                { name: "duration", label: "Duration (HH:MM)", type: "time" },
            ]
        },
        {
            title: "Cast & Venue",
            fields: [
                { name: "mainCast", label: "Main Cast (comma separated)", type: "text" },
                { name: "cinemaName", label: "Cinema Name", type: "text" },
                { name: "cinemaLocation", label: "Cinema Location", type: "text" },
            ]
        },
        {
            title: "Ticket Info",
            fields: [
                { name: "availableSite", label: "Available Site", type: "text" },
                { name: "ticketPrice", label: "Ticket Price (ETB)", type: "number" },
                { name: "screeningDate", label: "Screening Date", type: "custom" },
            ]
        },
        {
            title: "Media",
            fields: [
                { name: "description", label: "Description", type: "textarea" },
                { name: "poster", label: "Poster (Image Only)", type: "file", accept: "image/*" },
                { name: "promotionVideo", label: "Promotion Video (Video Only)", type: "file", accept: "video/*" },
            ]
        }
    ];

    return (
        <div className={`min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
            {/* Navigation Header with zinc-100 gradient */}
            <div className={`${theme === "light" ? "bg-gradient-to-br from-zinc-100 to-zinc-200" : "bg-gradient-to-br from-gray-800 to-gray-900"} border-b ${theme === "light" ? "border-zinc-200" : "border-zinc-700"}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => router.back()}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === "light" ? "text-purple-700 hover:bg-purple-100" : "text-purple-300 hover:bg-purple-800"} transition-colors`}
                        >
                            <FaArrowLeft className="h-5 w-5" />
                            <span className="text-lg font-medium">Back</span>
                        </button>

                        <div className="flex items-center gap-4">
                            {steps.map((step, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep > index + 1 ? "bg-green-500" : currentStep === index + 1 ? "bg-purple-600" : theme === "light" ? "bg-purple-200" : "bg-purple-800"} text-white`}>
                                        {currentStep > index + 1 ? <FaCheck size={14} /> : index + 1}
                                    </div>
                                    <span className={`hidden md:inline ${currentStep === index + 1 ? "font-semibold" : ""} ${theme === "light" ? "text-purple-700" : "text-purple-300"}`}>
                                        {step.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content (with animations) */}
            <div className="flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`w-full max-w-4xl ${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"} p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <div className="mb-6">
                        <h2 className={`text-2xl font-bold ${theme === "light" ? "text-zinc-800" : "text-white"}`}>
                            {steps[currentStep - 1].title}
                        </h2>
                        <p className={`mt-1 ${theme === "light" ? "text-zinc-500" : "text-zinc-400"}`}>
                            Step {currentStep} of {totalSteps}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} autoComplete="off">
                        <div className="space-y-5">
                            {steps[currentStep - 1].fields.map((field, index) => (
                                <div key={index}>
                                    <label className={`block text-sm font-medium mb-1 ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}>
                                        {field.label}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    {field.type === "textarea" ? (
                                        <textarea
                                            name={field.name}
                                            value={formData[field.name]}
                                            onChange={handleChange}
                                            className={`mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                                                errors[field.name] 
                                                    ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500" 
                                                    : theme === "light" 
                                                        ? "border border-zinc-300 focus:border-blue-500 focus:ring-blue-500" 
                                                        : "border border-zinc-600 focus:border-blue-500 focus:ring-blue-500"
                                            } ${theme === "light" ? "bg-white" : "bg-zinc-700"}`}
                                            rows={4}
                                            autoComplete="off"
                                        />
                                    ) : field.type === "file" ? (
                                        <div className={`mt-1 flex flex-col items-center justify-center w-full px-3 py-6 border-2 border-dashed rounded-md transition-colors ${
                                            (errors[field.name] && touched[field.name]) 
                                                ? "border-red-500 bg-red-50/50" 
                                                : theme === "light" 
                                                    ? "border-zinc-300 bg-zinc-50 hover:border-zinc-400" 
                                                    : "border-zinc-600 bg-zinc-800 hover:border-zinc-500"
                                        }`}>
                                            <div className="text-center">
                                                <p className={`mb-2 ${(errors[field.name] && touched[field.name]) ? "text-red-500 font-medium" : theme === "light" ? "text-zinc-500" : "text-zinc-400"}`}>
                                                    {formData[field.name] 
                                                        ? "File selected" 
                                                        : (errors[field.name] && touched[field.name]) 
                                                            ? `Please upload ${field.accept.includes("image") ? "an image" : "a video"}`
                                                            : `Click to upload ${field.accept.includes("image") ? "an image" : "a video"}`
                                                    }
                                                </p>
                                                <input
                                                    type="file"
                                                    name={field.name}
                                                    accept={field.accept}
                                                    onChange={field.name === "poster" ? handleFileChange : handleVideoUpload}
                                                    className="hidden"
                                                    id={field.name}
                                                />
                                                <label 
                                                    htmlFor={field.name}
                                                    className={`inline-flex items-center px-4 py-2 rounded-md cursor-pointer transition-colors ${
                                                        (errors[field.name] && touched[field.name])
                                                            ? "bg-red-500 text-white hover:bg-red-600" 
                                                            : theme === "light" 
                                                                ? "bg-blue-600 text-white hover:bg-blue-700" 
                                                                : "bg-blue-700 text-white hover:bg-blue-800"
                                                    }`}
                                                >
                                                    {formData[field.name] ? "Change File" : "Choose File"}
                                                </label>
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
                                    ) : (
                                        <input
                                            type={field.type}
                                            name={field.name}
                                            value={formData[field.name]}
                                            onChange={handleChange}
                                            className={`mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                                                errors[field.name] 
                                                    ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500" 
                                                    : theme === "light" 
                                                        ? "border border-zinc-300 focus:border-blue-500 focus:ring-blue-500" 
                                                        : "border border-zinc-600 focus:border-blue-500 focus:ring-blue-500"
                                            } ${theme === "light" ? "bg-white" : "bg-zinc-700"}`}
                                            step={field.type === "number" ? "1" : undefined}
                                            autoComplete="off"
                                        />
                                    )}
                                    {errors[field.name] && field.type !== "file" && (
                                        <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>
                                    )}
                                    {errors[field.name] && field.type === "file" && touched[field.name] && (
                                        <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-between">
                            <motion.button
                                type="button"
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 px-6 py-2 rounded-md ${theme === "light" ? "text-zinc-700 hover:bg-zinc-100" : "text-zinc-300 hover:bg-zinc-700"} transition-colors disabled:opacity-50`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FaArrowLeft size={16} />
                                Previous
                            </motion.button>
                            
                            {currentStep < totalSteps ? (
                                <motion.button
                                    type="button"
                                    onClick={handleNext}
                                    className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-md hover:from-blue-700 hover:to-purple-700 transition-all`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Next
                                    <FaArrowRight size={16} />
                                </motion.button>
                            ) : (
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-md hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-70`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        </div>
    );
}

function EthiopianDatePicker({ name, value, onChange, error, theme }) {
    const [ethiopianDate, setEthiopianDate] = useState("");
    const [time, setTime] = useState("");

    const getCurrentEthiopianDate = () => {
        const today = new Date();
        const [ethYear, ethMonth, ethDay] = toEthiopian(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
        );
        return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(ethDay).padStart(2, "0")}`;
    };

    useEffect(() => {
        const currentEthiopianDate = getCurrentEthiopianDate();
        setEthiopianDate(currentEthiopianDate);
        setTime("00:00");
        onChange({ target: { name, value: `${currentEthiopianDate}T00:00` } });
    }, []);

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
                    className={`mt-1 block w-1/2 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                        error 
                            ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500" 
                            : theme === "light" 
                                ? "border border-zinc-300 focus:border-blue-500 focus:ring-blue-500" 
                                : "border border-zinc-600 focus:border-blue-500 focus:ring-blue-500"
                    } ${theme === "light" ? "bg-white" : "bg-zinc-700"}`}
                />
                <input
                    type="time"
                    value={time}
                    onChange={handleTimeChange}
                    className={`mt-1 block w-1/2 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                        error 
                            ? "border-2 border-red-500 focus:border-red-500 focus:ring-red-500" 
                            : theme === "light" 
                                ? "border border-zinc-300 focus:border-blue-500 focus:ring-blue-500" 
                                : "border border-zinc-600 focus:border-blue-500 focus:ring-blue-500"
                    } ${theme === "light" ? "bg-white" : "bg-zinc-700"}`}
                />
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}