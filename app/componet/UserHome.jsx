// // pages/signup.js

// "use client";
// import { useState } from "react";
// import { auth } from "../firebaseconfig";
// import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPhoneNumber } from "firebase/auth";

// const Signup = () => {
//     const [email, setEmail] = useState("");
//     const [phone, setPhone] = useState("");
//     const [isEmail, setIsEmail] = useState(true);
//     const [verificationCode, setVerificationCode] = useState("");
//     const [location, setLocation] = useState("");
//     const [firstName, setFirstName] = useState("");
//     const [lastName, setLastName] = useState("");
//     const [age, setAge] = useState("");
//     const [error, setError] = useState("");

//     const handleSignup = async (e) => {
//         e.preventDefault();
//         try {
//             if (isEmail) {
//                 const userCredential = await createUserWithEmailAndPassword(auth, email, "yourPassword");
//                 await sendEmailVerification(userCredential.user);
//                 alert("Verification email sent!");
//             } else {
//                 const appVerifier = window.recaptchaVerifier; // Ensure reCAPTCHA is set up
//                 const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
//                 window.confirmationResult = confirmationResult;
//                 alert("Verification code sent to your phone!");
//             }
//         } catch (error) {
//             console.error("Error during signup:", error); // Log the error for debugging
//             setError(error.message);
//         }
//     };

//     const handleVerify = async (e) => {
//         e.preventDefault();
//         try {
//             const result = await window.confirmationResult.confirm(verificationCode);
//             alert("Phone number verified!");
//         } catch (error) {
//             setError("Invalid verification code.");
//         }
//     };

//     const handleRegister = async (e) => {
//         e.preventDefault();
//         // Validate and register user details
//         // Check if user already exists in your database
//         // If not, save user details to your database
//     };

//     return (
//         <div className="flex items-center justify-center min-h-screen bg-gray-100">
//             <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
//                 <h1 className="text-2xl font-bold mb-6 text-center">Signup</h1>
//                 <form onSubmit={handleSignup} className="mb-4">
//                     <input
//                         type="text"
//                         placeholder="Email"
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         className="w-full p-2 mb-4 border border-gray-300 rounded"
//                     />
//                     <input
//                         type="text"
//                         placeholder="Phone"
//                         value={phone}
//                         onChange={(e) => setPhone(e.target.value)}
//                         className="w-full p-2 mb-4 border border-gray-300 rounded"
//                     />
//                     <select
//                         onChange={(e) => setIsEmail(e.target.value === "email")}
//                         className="w-full p-2 mb-4 border border-gray-300 rounded"
//                     >
//                         <option value="email">Email</option>
//                         <option value="phone">Phone</option>
//                     </select>
//                     <button
//                         type="submit"
//                         className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
//                     >
//                         Send Verification
//                     </button>
//                 </form>

//                 {isEmail ? (
//                     <div className="mb-4">
//                         <h2 className="text-lg font-semibold mb-2">Verify Email</h2>
//                         <button
//                             onClick={handleVerify}
//                             className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition duration-200"
//                         >
//                             Verify Email
//                         </button>
//                     </div>
//                 ) : (
//                     <div className="mb-4">
//                         <h2 className="text-lg font-semibold mb-2">Verify Phone</h2>
//                         <input
//                             type="text"
//                             placeholder="Verification Code"
//                             value={verificationCode}
//                             onChange={(e) => setVerificationCode(e.target.value)}
//                             className="w-full p-2 mb-4 border border-gray-300 rounded"
//                         />
//                         <button
//                             onClick={handleVerify}
//                             className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition duration-200"
//                         >
//                             Verify Phone
//                         </button>
//                     </div>
//                 )}

//                 <form onSubmit={handleRegister} className="mb-4">
//                     <input
//                         type="text"
//                         placeholder="Location"
//                         value={location}
//                         onChange={(e) => setLocation(e.target.value)}
//                         className="w-full p-2 mb-4 border border-gray-300 rounded"
//                     />
//                     <input
//                         type="text"
//                         placeholder="First Name"
//                         value={firstName}
//                         onChange={(e) => setFirstName(e.target.value)}
//                         className="w-full p-2 mb-4 border border-gray-300 rounded"
//                     />
//                     <input
//                         type="text"
//                         placeholder="Last Name"
//                         value={lastName}
//                         onChange={(e) => setLastName(e.target.value)}
//                         className="w-full p-2 mb-4 border border-gray-300 rounded"
//                     />
//                     <input
//                         type="number"
//                         placeholder="Age"
//                         value={age}
//                         onChange={(e) => setAge(e.target.value)}
//                         className="w-full p-2 mb-4 border border-gray-300 rounded"
//                     />
//                     <button
//                         type="submit"
//                         className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
//                     >
//                         Register
//                     </button>
//                 </form>

//                 {error && <p className="text-red-500 text-center">{error}</p>}
//             </div>
//         </div>
//     );
// };

// export default Signup;