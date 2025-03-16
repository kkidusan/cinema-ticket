"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebaseconfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toGregorian, toEthiopian } from "ethiopian-date";
import { PuffLoader } from "react-spinners";

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

    const [loading, setLoading] = useState(true); // Start with loading true
    const [authLoading, setAuthLoading] = useState(true); // Separate state for auth loading
    const [errors, setErrors] = useState({});
    const router = useRouter();
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState(""); // Add state for user role

    // Fetch the current user's email, role, and validate authentication
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
                    setAuthLoading(false); // Stop auth loading once authenticated

                    // Redirect if the user is not an owner
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

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    // Convert image to base64
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
        };
    };

    // Handle video upload to Cloudinary
    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

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
            }
        } catch (error) {
            console.error("Error uploading video:", error);
        }
    };

    // Generate 8-character unique movie ID
    const generateMovieID = () => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return Array.from({ length: 8 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join("");
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Validate ticketPrice is an integer
        if (!formData.ticketPrice || !Number.isInteger(Number(formData.ticketPrice))) {
            newErrors.ticketPrice = "Ticket price must be a whole number.";
        }

        // Validate screeningDate is provided
        if (!formData.screeningDate) {
            newErrors.screeningDate = "Screening date is required.";
        }

        // Other validations
        if (!formData.title.trim()) newErrors.title = "Title is required.";
        if (!formData.category.trim()) newErrors.category = "Category is required.";
        if (!formData.duration.trim()) newErrors.duration = "Duration is required.";
        if (!formData.mainCast.trim()) newErrors.mainCast = "Main cast is required.";
        if (!formData.cinemaName.trim()) newErrors.cinemaName = "Cinema name is required.";
        if (!formData.cinemaLocation.trim()) newErrors.cinemaLocation = "Cinema location is required.";
        if (!formData.availableSite.trim()) newErrors.availableSite = "Available site is required.";
        if (!formData.poster) newErrors.poster = "Poster image is required.";
        if (!formData.description.trim()) newErrors.description = "Description is required.";
        if (!formData.promotionVideo) newErrors.promotionVideo = "Promotion video is required.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!validateForm()) {
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
                screeningDate: Timestamp.fromDate(new Date(formData.screeningDate)),
                uploadingDate: Timestamp.now(),
                poster: formData.poster,
                promotionVideo: formData.promotionVideo,
                movieID: formData.movieID,
                createdAt: Timestamp.now(),
            });

            alert("Movie uploaded successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error uploading movie:", error);
            alert("Failed to upload movie.");
        }
        setLoading(false);
    };

    // Show loading spinner while authenticating
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <PuffLoader color="#36D7B7" size={100} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-2xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
            >
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Upload Movie Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField name="title" label="Movie Title" onChange={handleChange} error={errors.title} />
                    <InputField name="category" label="Category" onChange={handleChange} error={errors.category} />
                    <InputField name="duration" label="Duration (HH:MM)" type="time" onChange={handleChange} error={errors.duration} />
                    <InputField name="mainCast" label="Main Cast" onChange={handleChange} error={errors.mainCast} />
                    <InputField name="cinemaName" label="Cinema Name" onChange={handleChange} error={errors.cinemaName} />
                    <InputField name="cinemaLocation" label="Cinema Location" onChange={handleChange} error={errors.cinemaLocation} />
                    <InputField name="availableSite" label="Available Site" onChange={handleChange} error={errors.availableSite} />
                    <InputField name="ticketPrice" label="Ticket Price" type="number" step="1" onChange={handleChange} error={errors.ticketPrice} />
                    <EthiopianDatePicker
                        name="screeningDate"
                        label="Screening Date (Ethiopian Calendar)"
                        onChange={handleChange}
                        error={errors.screeningDate}
                    />
                    <InputField name="description" label="Description" type="textarea" onChange={handleChange} error={errors.description} />
                    <div>
                        <label className="block text-gray-700 dark:text-white">Poster (Image Only)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 p-2 border rounded w-full dark:bg-gray-700" />
                        {errors.poster && <p className="text-red-500 text-sm">{errors.poster}</p>}
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-white">Promotion Video (Video Only)</label>
                        <input type="file" accept="video/*" onChange={handleVideoUpload} className="mt-1 p-2 border rounded w-full dark:bg-gray-700" />
                        {errors.promotionVideo && <p className="text-red-500 text-sm">{errors.promotionVideo}</p>}
                    </div>
                </div>
                <div className="mt-6">
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-500">
                        {loading ? "Uploading..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function InputField({ name, label, type = "text", onChange, error }) {
    return (
        <div>
            <label className="block text-gray-700 dark:text-white">{label}</label>
            {type === "textarea" ? (
                <textarea
                    name={name}
                    onChange={onChange}
                    className="mt-1 p-2 border rounded w-full dark:bg-gray-700"
                    rows={4}
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    onChange={onChange}
                    className="mt-1 p-2 border rounded w-full dark:bg-gray-700"
                    step={type === "number" ? "1" : undefined}
                />
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
    );
}

function EthiopianDatePicker({ name, label, onChange, error }) {
    const [selectedDate, setSelectedDate] = useState("");
    const [time, setTime] = useState("");

    // Get current Ethiopian date
    const getCurrentEthiopianDate = () => {
        const today = new Date();
        const [ethYear, ethMonth, ethDay] = toEthiopian(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
        );
        return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(ethDay).padStart(2, "0")}`;
    };

    // Initialize with current Ethiopian date
    useEffect(() => {
        const currentEthiopianDate = getCurrentEthiopianDate();
        setSelectedDate(currentEthiopianDate);

        // Convert Ethiopian date to Gregorian date
        const [ethYear, ethMonth, ethDay] = currentEthiopianDate.split("-");
        const [gregYear, gregMonth, gregDay] = toGregorian(Number(ethYear), Number(ethMonth), Number(ethDay));

        // Construct a valid Date object
        const gregorianDate = new Date(gregYear, gregMonth - 1, gregDay);
        const screeningDate = gregorianDate.toISOString().split("T")[0] + "T00:00";
        onChange({ target: { name, value: screeningDate } });
    }, []);

    const handleDateChange = (e) => {
        const { value } = e.target;
        setSelectedDate(value);

        // Convert Ethiopian date to Gregorian date
        const [ethYear, ethMonth, ethDay] = value.split("-");
        const [gregYear, gregMonth, gregDay] = toGregorian(Number(ethYear), Number(ethMonth), Number(ethDay));

        // Construct a valid Date object
        const gregorianDate = new Date(gregYear, gregMonth - 1, gregDay);
        const screeningDate = gregorianDate.toISOString().split("T")[0] + `T${time}`;
        onChange({ target: { name, value: screeningDate } });
    };

    const handleTimeChange = (e) => {
        const { value } = e.target;
        setTime(value);

        // Combine Ethiopian date and time into a single string for the form
        if (selectedDate) {
            const [ethYear, ethMonth, ethDay] = selectedDate.split("-");
            const [gregYear, gregMonth, gregDay] = toGregorian(Number(ethYear), Number(ethMonth), Number(ethDay));

            // Construct a valid Date object
            const gregorianDate = new Date(gregYear, gregMonth - 1, gregDay);
            const screeningDate = gregorianDate.toISOString().split("T")[0] + `T${value}`;
            onChange({ target: { name, value: screeningDate } });
        }
    };

    return (
        <div>
            <label className="block text-gray-700 dark:text-white">{label}</label>
            <div className="flex gap-2">
                <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="mt-1 p-2 border rounded w-1/2 dark:bg-gray-700"
                />
                <input
                    type="time"
                    name="time"
                    placeholder="Time"
                    value={time}
                    onChange={handleTimeChange}
                    className="mt-1 p-2 border rounded w-1/2 dark:bg-gray-700"
                />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
    );
}