"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../firebaseconfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function VideoUploadForm() {
    const [formData, setFormData] = useState({
        title: "",
        category: "",
        description: "",
        duration: "", // HH:MM format from time picker
        mainCast: "",
        cinemaName: "",
        cinemaLocation: "",
        availableSite: "",
        ticketPrice: "",
        screeningDate: "",
        poster: "",
        movieID: "",
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const router = useRouter();
    const [userEmail, setUserEmail] = useState(null);
    const [userRole, setUserRole] = useState(null); // Add role state

    // Fetch user email, role, and validate authentication
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
                    setUserEmail(data.email); // Set user email
                    setUserRole(data.role); // Set user role

                    // Redirect if the user is not an owner
                    if (data.role !== "owner") {
                        router.replace("/login"); // Redirect to unauthorized page
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

    // Generate 8-character unique movie ID
    const generateMovieID = () => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return Array.from({ length: 8 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join("");
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Title is required.";
        if (!formData.category.trim()) newErrors.category = "Category is required.";
        if (!formData.duration.trim()) newErrors.duration = "Duration is required.";
        if (!formData.mainCast.trim()) newErrors.mainCast = "Main cast is required.";
        if (!formData.cinemaName.trim()) newErrors.cinemaName = "Cinema name is required.";
        if (!formData.cinemaLocation.trim()) newErrors.cinemaLocation = "Cinema location is required.";
        if (!formData.availableSite.trim()) newErrors.availableSite = "Available site is required.";
        if (!formData.ticketPrice) newErrors.ticketPrice = "Ticket price is required.";
        if (!formData.screeningDate) newErrors.screeningDate = "Screening date is required.";
        if (!formData.poster) newErrors.poster = "Poster image is required.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

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
                duration: formData.duration + ":00", // Append ":00" to ensure HH:MM:SS format
                mainCast: formData.mainCast,
                cinemaName: formData.cinemaName,
                cinemaLocation: formData.cinemaLocation,
                availableSite: formData.availableSite,
                ticketPrice: Number(formData.ticketPrice),
                screeningDate: Timestamp.fromDate(new Date(formData.screeningDate)),
                uploadingDate: Timestamp.now(), // Automatically set current date
                poster: formData.poster,
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
                    <InputField name="ticketPrice" label="Ticket Price" type="number" onChange={handleChange} error={errors.ticketPrice} />
                    <InputField name="screeningDate" label="Screening Date" type="date" onChange={handleChange} error={errors.screeningDate} />
                    <div>
                        <label className="block text-gray-700 dark:text-white">Poster (Image Only)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 p-2 border rounded w-full dark:bg-gray-700" />
                        {errors.poster && <p className="text-red-500 text-sm">{errors.poster}</p>}
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
            <input type={type} name={name} onChange={onChange} className="mt-1 p-2 border rounded w-full dark:bg-gray-700" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
    );
}