"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, collection, query, where, getDocs } from "../../../firebaseconfig";
import { motion } from "framer-motion";
import { PuffLoader } from "react-spinners"; // Import PuffLoader

export default function VideoDetail({ params }) {
  const router = useRouter();
  const { id } = params;

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null); // Add role state

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

  useEffect(() => {
    if (id && userRole === "owner") {
      fetchVideoDetails(id);
    }
  }, [id, userRole]);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#36D7B7" size={100} /> {/* Loading spinner */}
          <motion.p
            className="mt-4 text-2xl font-bold text-gray-700 dark:text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Loading video details...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#FF6B6B" size={100} /> {/* Red spinner for "not found" state */}
          <motion.p
            className="mt-4 text-2xl font-bold text-gray-700 dark:text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12">
      {/* Fixed card width */}
      <motion.div
        className="bg-white dark:bg-gray-900 shadow-lg rounded-xl p-6 text-center w-[600px]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{video.title}</h2>
        
        {/* Video Player with Fixed Width and Aspect Ratio */}
        <div className="w-full aspect-video mb-4"> {/* Maintain 16:9 aspect ratio */}
          <video 
            src={video.promotionVideo} 
            controls 
            controlsList="nodownload" // Disable download option
            className="w-full h-full rounded-md"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-4">{video.description}</p>

        <div className="text-left text-gray-600 dark:text-gray-300 mb-4">
          <p><strong>Category:</strong> {video.category}</p>
          <p><strong>Duration:</strong> {video.duration} mins</p>
          <p><strong>Cinema Name:</strong> {video.cinemaName}</p>
          <p><strong>Cinema Location:</strong> {video.cinemaLocation}</p>
          <p><strong>Available Site:</strong> {video.availableSite}</p>
          <p><strong>Ticket Price:</strong> ${video.ticketPrice}</p>
        </div>

        {/* Buttons in Flex Row */}
        <div className="flex flex-row gap-4 mt-4">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push(`/updateMovie/${id}`)}
            className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
          >
            Update Data
          </button>
        </div>
      </motion.div>
    </div>
  );
}