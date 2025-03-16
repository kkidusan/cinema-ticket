"use client";

import { useState } from "react";
import { db } from "../../firebaseconfig"; // Adjust the path to your Firebase config
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function PromotionImageUpload() {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        image: "", // Base64 or URL of the image
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const router = useRouter();

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
                image: reader.result, // Store the base64 image
            }));
        };
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) newErrors.title = "Title is required.";
        if (!formData.description.trim()) newErrors.description = "Description is required.";
        if (!formData.image) newErrors.image = "Image is required.";

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
            // Add the promotion data to Firestore
            await addDoc(collection(db, "promotion"), {
                title: formData.title,
                description: formData.description,
                image: formData.image, // Store the base64 image
                createdAt: Timestamp.now(),
            });

            alert("Promotion image uploaded successfully!");
        } catch (error) {
            console.error("Error uploading promotion:", error);
            alert("Failed to upload promotion.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-2xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
            >
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Upload Promotion Image</h2>
                <div className="grid grid-cols-1 gap-4">
                    {/* Title Field */}
                    <div>
                        <label className="block text-gray-700 dark:text-white">Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="mt-1 p-2 border rounded w-full dark:bg-gray-700"
                        />
                        {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
                    </div>

                    {/* Description Field */}
                    <div>
                        <label className="block text-gray-700 dark:text-white">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="mt-1 p-2 border rounded w-full dark:bg-gray-700"
                            rows={4}
                        />
                        {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                    </div>

                    {/* Image Upload Field */}
                    <div>
                        <label className="block text-gray-700 dark:text-white">Promotion Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="mt-1 p-2 border rounded w-full dark:bg-gray-700"
                        />
                        {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
                    </div>
                </div>

                {/* Submit Button */}
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