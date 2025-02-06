// // pages/home.js

// "use client";
// import { useEffect, useState } from "react";
// import { db } from "../firebaseconfig"; // Ensure this path is correct
// import { doc, getDoc } from "firebase/firestore";

// const Home = () => {
//     const [userData, setUser Data] = useState(null);
//     const [error, setError] = useState("");

//     useEffect(() => {
//         const fetchUser Data = async () => {
//             const phone = localStorage.getItem("userPhone"); // Assuming phone is stored in local storage after login
//             if (phone) {
//                 try {
//                     const userDoc = await getDoc(doc(db, "users", phone));
//                     if (userDoc.exists()) {
//                         setUser Data(userDoc.data());
//                     } else {
//                         setError("User  data not found.");
//                     }
//                 } catch (error) {
//                     console.error("Error fetching user data:", error);
//                     setError("Failed to fetch user data.");
//                 }
//             }
//         };
//         fetchUser Data();
//     }, []);

//     return (
//         <div className="flex items-center justify-center min-h-screen bg-gray-100">
//             <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
//                 <h1 className="text-2xl font-bold mb-6 text-center">User  Information</h1>
//                 {error && <p className="text-red-500">{error}</p>}
//                 {userData ? (
//                     <div>
//                         <p><strong>First Name:</strong> {userData.firstName}</p>
//                         <p><strong>Last Name:</strong> {userData.lastName}</p>
//                         <p><strong>Age:</strong> {userData.age}</p>
//                         <p><strong>Location:</strong> {userData.location}</p>
//                         <p><strong>Phone:</strong> {userData.phone}</p>
//                     </div>
//                 ) : (
//                     <p>Loading user data...</p>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default Home;