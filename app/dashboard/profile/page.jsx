"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, collection, query, where, getDocs } from "../../firebaseconfig"; // Firebase Firestore
import { User } from "lucide-react"; // User icon for profile

export default function Profile() {
  const [userEmail, setUserEmail] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async (email) => {
      try {
        const q = query(collection(db, "owner"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setOwnerData(querySnapshot.docs[0].data());
        }
      } catch (error) {
        console.error("Error fetching owner data:", error);
      }
    };

    const user = auth.currentUser;
    if (!user) {
      router.push("/login");
    } else {
      setUserEmail(user.email);
      fetchData(user.email);
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

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
            <p className="text-gray-600 text-center mt-4">Loading owner data...</p>
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
