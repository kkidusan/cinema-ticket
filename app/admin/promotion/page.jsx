"use client";

import { useState, useCallback } from "react";
import { db } from "../../lib/firebase-client"; // Adjust path to your Firebase config
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function PromotionImageUpload() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "", // Base64 string for the image
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();

  // Handle input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  // Convert image to base64
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Please upload a valid image." }));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, image: reader.result }));
      setErrors((prev) => ({ ...prev, image: "" }));
    };
    reader.onerror = () => {
      setErrors((prev) => ({ ...prev, image: "Failed to process image." }));
    };
  }, []);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Title is required.";
    if (!formData.description.trim()) newErrors.description = "Description is required.";
    if (!formData.image) newErrors.image = "Image is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);

      if (!validateForm()) {
        setLoading(false);
        return;
      }

      try {
        await addDoc(collection(db, "promotions"), {
          title: formData.title,
          description: formData.description,
          image: formData.image,
          createdAt: Timestamp.now(),
        });

        router.push("/success"); // Redirect to a success page
      } catch (error) {
        console.error("Error uploading promotion:", error);
        setErrors({ submit: "Failed to upload promotion. Please try again." });
      } finally {
        setLoading(false);
      }
    },
    [formData, router, validateForm]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg"
        noValidate
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
          Upload Promotion Image
        </h2>

        <div className="space-y-6">
          {/* Title Field */}
          <div>
            <label htmlFor="title" className="block text-gray-700 dark:text-white text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 p-2 border rounded w-full dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter promotion title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="description"
              className="block text-gray-700 dark:text-white text-sm font-medium"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-1 p-2 border rounded w-full dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Enter promotion description"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Image Upload Field */}
          <div>
            <label
              htmlFor="image"
              className="block text-gray-700 dark:text-white text-sm font-medium"
            >
              Promotion Image
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 p-2 border rounded w-full dark:bg-gray-700 dark:text-white"
            />
            {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
          </div>
        </div>

        {/* Submission Error */}
        {errors.submit && <p className="text-red-500 text-sm mt-4">{errors.submit}</p>}

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Uploading..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}