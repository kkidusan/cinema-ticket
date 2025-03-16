"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebaseconfig"; // Firebase Firestore
import { collection, query, where, getDocs } from "firebase/firestore"; // Firebase Firestore methods
import { User } from "lucide-react"; // User icon for profile
import { PuffLoader } from "react-spinners"; // Import PuffLoader
import { motion } from "framer-motion"; // Import motion from framer-motion

export default function Profile() {
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null); // Add role state
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state
  const router = useRouter();

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
            router.replace("/unauthorized"); // Redirect to unauthorized page
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

  // Fetch owner data from Firestore when userEmail changes
  useEffect(() => {
    if (userEmail && userRole === "owner") {
      const fetchOwnerData = async () => {
        try {
          const q = query(collection(db, "owner"), where("email", "==", userEmail));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const ownerDoc = querySnapshot.docs[0].data(); // Get the first document
            setOwnerData(ownerDoc); // Set owner data
          } else {
            console.log("No owner found with email:", userEmail);
          }
        } catch (error) {
          console.error("Error fetching owner data:", error);
        } finally {
          setLoading(false); // Set loading to false after fetching
        }
      };

      fetchOwnerData();
    }
  }, [userEmail, userRole]); // Run this effect when userEmail or userRole changes

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Loading Spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color="#36D7B7" size={100} /> {/* Replace with PuffLoader */}
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-indigo-200 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-500">
              <User size={72} className="text-indigo-500 w-full h-full p-2" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">My Account</h2>

          {/* Displaying Owner Data */}
          {ownerData ? (
            <div className="text-left space-y-3">
              <p className="text-gray-700">
                <span className="font-semibold">Name:</span> {ownerData.firstName} {ownerData.lastName}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Email:</span> {ownerData.email}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Phone:</span> {ownerData.phoneNumber}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Address:</span> {ownerData.location}
              </p>
            </div>
          ) : (
            <p className="text-gray-600 text-center mt-4">No owner data found.</p>
          )}

          {/* Buttons */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => router.push("/dashboard/profile/edit")}
              className="w-full px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-all"
            >
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}