// "use client";
// import { useState } from "react";
// import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebaseconfig";

// const PhoneAuth = () => {
//   const [phone, setPhone] = useState("");
//   const [otp, setOtp] = useState("");
//   const [confirmationResult, setConfirmationResult] = useState(null);
//   const [user, setUser] = useState(null);
//   const [error, setError] = useState("");

//   // Initialize Recaptcha
//   const setupRecaptcha = () => {
//     if (!window.recaptchaVerifier) {
//       window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
//         size: "invisible",
//         callback: (response) => {
//           console.log("Recaptcha solved!");
//         },
//       });
//     }
//   };

//   // Send OTP
//   const sendOtp = async () => {
//     setError("");
//     if (phone.length < 10) {
//       setError("Enter a valid phone number");
//       return;
//     }

//     try {
//       setupRecaptcha();
//       const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
//       setConfirmationResult(confirmation);
//     } catch (err) {
//       setError("Error sending OTP: " + err.message);
//     }
//   };

//   // Verify OTP
//   const verifyOtp = async () => {
//     setError("");
//     if (otp.length !== 6) {
//       setError("Enter a valid 6-digit OTP");
//       return;
//     }

//     try {
//       const result = await confirmationResult.confirm(otp);
//       setUser(result.user);
//     } catch (err) {
//       setError("Incorrect OTP. Try again.");
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
//       <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-96">
//         <h2 className="text-2xl font-bold mb-4">Phone Authentication</h2>

//         {!user ? (
//           <>
//             {!confirmationResult ? (
//               <>
//                 <input
//                   type="text"
//                   placeholder="Enter Phone Number"
//                   value={phone}
//                   onChange={(e) => setPhone(e.target.value)}
//                   className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
//                 />
//                 <div id="recaptcha-container"></div>
//                 <button
//                   onClick={sendOtp}
//                   className="w-full bg-blue-500 hover:bg-blue-700 p-2 rounded text-white"
//                 >
//                   Send OTP
//                 </button>
//               </>
//             ) : (
//               <>
//                 <input
//                   type="text"
//                   placeholder="Enter OTP"
//                   value={otp}
//                   onChange={(e) => setOtp(e.target.value)}
//                   className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
//                 />
//                 <button
//                   onClick={verifyOtp}
//                   className="w-full bg-green-500 hover:bg-green-700 p-2 rounded text-white"
//                 >
//                   Verify OTP
//                 </button>
//               </>
//             )}
//             {error && <p className="text-red-400 mt-2">{error}</p>}
//           </>
//         ) : (
//           <div>
//             <h3 className="text-green-400">✅ Authentication Successful</h3>
//             <p>Welcome, {user.phoneNumber}!</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default PhoneAuth;
