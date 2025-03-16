// "use client";
// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { auth, db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "../../firebaseconfig"; // Ensure correct path
// import { ArrowLeft, Send, Paperclip } from "lucide-react";
// import { PacmanLoader } from "react-spinners"; // For an attractive loading spinner

// export default function Messages() {
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [file, setFile] = useState(null); // For file upload
//   const [isLoading, setIsLoading] = useState(true); // Loading state
//   const [userEmail, setUserEmail] = useState(null); // Store user email
//   const [userRole, setUserRole] = useState(null); // Store user role
//   const [isAuthenticated, setIsAuthenticated] = useState(false); // Authentication state
//   const messagesEndRef = useRef(null);
//   const router = useRouter();

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const response = await fetch("/api/validate", {
//           method: "GET",
//           credentials: "include",
//         });

//         if (!response.ok) throw new Error("Unauthorized");

//         const data = await response.json();
//         if (data.email && data.role) {
//           setUserEmail(data.email);
//           setUserRole(data.role);
//           setIsAuthenticated(true);
//           if (data.role !== "owner") {
//             router.replace("/login");
//             return;
//           }
//         } else {
//           throw new Error("No email or role found");
//         }
//       } catch (error) {
//         console.error("Authentication error:", error);
//         router.replace("/login");
//       } finally {
//         setIsLoading(false); // Corrected here
//       }
//     };

//     fetchUser();
//   }, [router]);

//   // Fetch messages from Firestore
//   useEffect(() => {
//     if (!userEmail) return;

//     const q = query(
//       collection(db, "messages"),
//       where("ownerEmail", "==", userEmail),
//       orderBy("timestamp", "asc")
//     );

//     const unsubscribe = onSnapshot(q, (querySnapshot) => {
//       const messagesData = querySnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       }));
//       setMessages(messagesData);
//       scrollToBottom(); // Scroll to the bottom when new messages are fetched
//     });

//     return () => unsubscribe(); // Cleanup the listener
//   }, [userEmail]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   const sendMessage = async () => {
//     if (newMessage.trim() === "" && !file) return;

//     const newMessageObj = {
//       ownerEmail: userEmail,
//       text: newMessage,
//       sender: "owner",
//       from: auth.currentUser?.displayName || userEmail,
//       show: true,
//       timestamp: new Date(),
//       status: "sending", // Set initial status as "sending"
//     };

//     setMessages((prevMessages) => [...prevMessages, newMessageObj]); // Add new message to the state
//     setNewMessage(""); // Clear the input field
//     setFile(null); // Reset file input
//     scrollToBottom(); // Scroll to the bottom of the messages

//     try {
//       // Send the message to Firestore
//       const docRef = await addDoc(collection(db, "messages"), {
//         ownerEmail: userEmail,
//         text: newMessage,
//         sender: "owner",
//         from: auth.currentUser?.displayName || userEmail,
//         show: false,
//         timestamp: serverTimestamp(),
//         status: "sending", // Set status as "sending"
//       });

//       // Update the message status to "delivered" after sending it
//       setMessages((prevMessages) =>
//         prevMessages.map((msg) =>
//           msg.text === newMessageObj.text && msg.status === "sending"
//             ? { ...msg, id: docRef.id, status: "delivered" }
//             : msg
//         )
//       );
//     } catch (error) {
//       console.error("Error sending message:", error);
//       // Revert the message status to "failed" if there's an error
//       setMessages((prevMessages) =>
//         prevMessages.map((msg) =>
//           msg.text === newMessageObj.text && msg.status === "sending"
//             ? { ...msg, status: "failed" }
//             : msg
//         )
//       );
//     }
//   };

//   // Handle file change
//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files[0];
//     if (selectedFile) {
//       setFile(selectedFile);
//     }
//   };

//   // Show loading spinner while validating user
//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gradient-to-r from-indigo-100 via-purple-200 to-pink-100 dark:bg-gray-900">
//         <PacmanLoader color="#6D28D9" size={30} /> {/* Attractive loading spinner */}
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-screen bg-gradient-to-r from-indigo-100 via-purple-200 to-pink-100 dark:bg-gray-900 dark:text-white">
//       {/* Header */}
//       <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md">
//         <button onClick={() => router.push("/dashboard")} className="text-white">
//           <ArrowLeft size={24} />
//         </button>
//         <h2 className="text-xl font-semibold">Messages</h2>
//       </div>

//       {/* Chat Messages Grid */}
//       <div className="flex-grow p-4 overflow-y-auto space-y-4">
//         <div className="grid gap-4">
//           {messages.length > 0 ? (
//             messages.map((msg) => (
//               <div
//                 key={msg.id}
//                 className={`grid ${msg.sender === "owner" ? "justify-self-end" : "justify-self-start"}`}
//               >
//                 <div
//                   className={`max-w-lg p-4 rounded-lg ${msg.sender === "owner" ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white" : "bg-gray-300 text-black"} shadow-lg`}
//                 >
//                   {/* Message Text */}
//                   <p className="text-lg">{msg.text}</p>

//                   {/* Message Status */}
//                   {msg.sender === "owner" && (
//                     <p className="text-xs mt-1 text-right">
//                       {msg.status === "sending"
//                         ? "Sending..."
//                         : msg.status === "delivered"
//                         ? "Delivered"
//                         : "Failed"}
//                     </p>
//                   )}
//                 </div>
//               </div>
//             ))
//           ) : (
//             <p className="text-center text-gray-500">No messages yet.</p>
//           )}
//         </div>
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input Field */}
//       <div className="p-4 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-300 dark:bg-gray-800 flex items-center shadow-md space-x-3 rounded-lg">
//         {/* File Upload */}
//         <label htmlFor="file-upload" className="cursor-pointer">
//           <Paperclip size={20} className="text-gray-500 hover:text-gray-700 dark:text-gray-300" />
//           <input
//             id="file-upload"
//             type="file"
//             className="hidden"
//             onChange={handleFileChange}
//           />
//         </label>

//         {/* Text Input */}
//         <input
//           type="text"
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//           placeholder="Type a message..."
//           className="flex-grow p-3 border rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />

//         {/* Send Button */}
//         <button
//           onClick={sendMessage}
//           className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2"
//         >
//           <Send size={20} />
//           <span>Send</span>
//         </button>
//       </div>
//     </div>
//   );
// }