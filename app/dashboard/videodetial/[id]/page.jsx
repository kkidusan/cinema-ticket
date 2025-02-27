"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, collection, query, where, getDocs } from "../../../firebaseconfig";
import { motion } from "framer-motion";
import { use } from "react"; // Import React.use

export default function VideoDetail({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchVideoDetails(id);
    }
  }, [id]);

  const fetchVideoDetails = async (videoID) => {
    try {
      const q = query(collection(db, "Movies"), where("movieID", "==", videoID));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // If a video with the given ID is found, set the data
        setVideo(querySnapshot.docs[0].data());
      } else {
        console.error("No video found with the given ID!");
      }
    } catch (error) {
      console.error("Error fetching video details:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return <p className="text-center text-gray-500 mt-10">Loading...</p>;
  }

  if (!video) {
    return <p className="text-center text-red-500 mt-10">Video not found!</p>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12">
      <motion.div
        className="bg-white dark:bg-gray-900 shadow-lg rounded-xl p-6 text-center max-w-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{video.title}</h2>
        <img src={video.poster} alt={video.title} className="w-full h-64 object-cover rounded-md mb-4" />
        <p className="text-gray-600 dark:text-gray-300 mb-4">{video.description}</p>

        <div className="text-left text-gray-600 dark:text-gray-300 mb-4">
          <p><strong>Category:</strong> {video.category}</p>
          <p><strong>Duration:</strong> {video.duration} mins</p>
          <p><strong>Cinema Name:</strong> {video.cinemaName}</p>
          <p><strong>Cinema Location:</strong> {video.cinemaLocation}</p>
          <p><strong>Available Site:</strong> {video.availableSite}</p>
          <p><strong>Ticket Price:</strong> ${video.ticketPrice}</p>
        </div>

        <button
          onClick={() => router.back()}
          className="w-full bg-red-500 text-white py-2 rounded-lg mt-2 hover:bg-green-600"
        >
          Go Back
        </button>
        <button
          onClick={() => router.push(`/updateMovie/${id}`)}
          className="w-full bg-red-500 text-white py-2 rounded-lg mt-2 hover:bg-green-600"
        >
          Update Data
        </button>
      </motion.div>
    </div>
  );
}
