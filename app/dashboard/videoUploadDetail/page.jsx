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
        duration: "",
        mainCast: "",
        cinemaName: "",
        cinemaLocation: "",
        availableSite: "",
        ticketPrice: "",
        screeningDate: "",
        uploadingDate: "",
        poster: "",
        movieID: "", // New field for auto-generated ID
    });

    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [userEmail, setUserEmail] = useState(null);

    useEffect(() => {
        // Check if the user is authenticated
        const user = auth.currentUser;

        if (!user) {
            router.push("/login");
        } else {
            setUserEmail(user.email);
        }
    }, [router]);

    // Handle text input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Convert image to base64 string
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            setFormData((prev) => ({
                ...prev,
                poster: reader.result, // Store as base64
                movieID: generateMovieID(), // Generate 8-character unique ID
            }));
        };
    };

    // Function to generate 8-character unique movie ID
    const generateMovieID = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.poster) {
            alert("Please upload a poster image.");
            setLoading(false);
            return;
        }

        try {
            await addDoc(collection(db, "Movies"), {
                email: userEmail,
                title: formData.title,
                category: formData.category,
                description: formData.description || "",
                duration: formData.duration,
                mainCast: formData.mainCast,
                cinemaName: formData.cinemaName,
                cinemaLocation: formData.cinemaLocation,
                availableSite: formData.availableSite,
                ticketPrice: Number(formData.ticketPrice),
                screeningDate: Timestamp.fromDate(new Date(formData.screeningDate)), // Convert date
                uploadingDate: Timestamp.fromDate(new Date(formData.uploadingDate)), // Convert date
                poster: formData.poster, // Store as Base64 string
                movieID: formData.movieID, // Store auto-generated unique ID
                createdAt: Timestamp.now(), // Store current time
            });

            alert("Movie uploaded successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error uploading movie:", error);
            alert("Failed to upload movie. Check console for details.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-2xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
            >
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                    Upload Movie Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField name="title" label="Movie Title" required onChange={handleChange} />
                    <InputField name="category" label="Category" required onChange={handleChange} />
                    <InputField name="duration" label="Duration (mins)" required onChange={handleChange} />
                    <InputField name="mainCast" label="Main Cast" required onChange={handleChange} />
                    <InputField name="cinemaName" label="Cinema Name" required onChange={handleChange} />
                    <InputField name="cinemaLocation" label="Cinema Location" required onChange={handleChange} />
                    <InputField name="availableSite" label="Available Site" required onChange={handleChange} />
                    <InputField name="ticketPrice" label="Ticket Price" type="number" required onChange={handleChange} />
                    <InputField name="screeningDate" label="Screening Date" type="date" required onChange={handleChange} />
                    <InputField name="uploadingDate" label="Uploading Date" type="date" required onChange={handleChange} />
                    <div>
                        <label className="block text-gray-700 dark:text-white">Poster (Image Only)</label>
                        <input
                            type="file"
                            accept="image/*"
                            required
                            onChange={handleFileChange}
                            className="mt-1 p-2 border rounded w-full dark:bg-gray-700"
                        />
                    </div>
                </div>
                <div className="mt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-500"
                    >
                        {loading ? "Uploading..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function InputField({ name, label, type = "text", required, onChange }) {
    return (
        <div>
            <label className="block text-gray-700 dark:text-white">{label}</label>
            <input
                type={type}
                name={name}
                required={required}
                onChange={onChange}
                className="mt-1 p-2 border rounded w-full dark:bg-gray-700"
            />
        </div>
    );
}
