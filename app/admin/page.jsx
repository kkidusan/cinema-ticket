"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../firebaseconfig"; // Firebase Auth
export default function Admin() {
  const [userEmail, setUserEmail] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if the user is authenticated
    const user = auth.currentUser;

    if (!user) {
      // Redirect to login page if user is not logged in
      router.push("/login");
    } else {
      // Set user email if authenticated
      setUserEmail(user.email);
    }
  }, [router]);


 
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800">About</h2>
        <p className="text-gray-600 mt-4">User: {userEmail ? userEmail : "Loading..."}</p>
      </div>
    </div>
  );
}
