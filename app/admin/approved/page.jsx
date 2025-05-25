"use client";
import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase-client";
import { collection, query, where, onSnapshot, updateDoc, doc, setDoc, getDocs } from "firebase/firestore";
import Image from "next/image";
import { motion } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext"; // Import ThemeContext

export default function AboutPage() {
  const { theme } = useContext(ThemeContext); // Use ThemeContext
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [openCertificate, setOpenCertificate] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentOwner, setCurrentOwner] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [ownerToApprove, setOwnerToApprove] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", isSuccess: false });
  const router = useRouter();

  // Function to show toast message and hide it after 3 seconds
  const showToast = (message, isSuccess) => {
    setToast({ show: true, message, isSuccess });

    // Hide the toast after 3 seconds
    setTimeout(() => {
      setToast({ show: false, message: "", isSuccess: false });
    }, 3000);
  };

  // Fetch user authentication details
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
          setUserEmail(data.email);
          setUserRole(data.role);

          if (data.role !== "admin") {
            router.replace("/login");
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

  // Fetch pending owners from Firestore in real-time
  useEffect(() => {
    if (userEmail && userRole === "admin") {
      const ownersRef = collection(db, "owner");
      const q = query(ownersRef, where("approved", "==", false));

      // Set up a real-time listener
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ownersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPendingOwners(ownersData);
      });

      // Clean up the listener when the component unmounts
      return () => unsubscribe();
    }
  }, [userEmail, userRole]);

  // Approve Owner Function
  const handleApproveOwner = async (ownerId, ownerEmail) => {
    try {
      const ownerDocRef = doc(db, "owner", ownerId);
      await updateDoc(ownerDocRef, { approved: true });

      setPendingOwners((prevOwners) =>
        prevOwners.filter((owner) => owner.email !== ownerEmail)
      );

      showToast("Owner approved successfully!", true); // Show success toast
    } catch (error) {
      console.error("Error approving owner:", error);
      showToast("Failed to approve owner.", false); // Show error toast
    } finally {
      setShowConfirmation(false);
      setOwnerToApprove(null);
    }
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (message.trim() === "") return;

    try {
      const newMessage = {
        ownerEmail: currentOwner.email,
        text: message,
        sender: "admin",
        timestamp: new Date(),
        show: false,
      };

      await setDoc(doc(db, "messages", `${currentOwner.email}_${Date.now()}`), newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Fetch messages for the current owner
  const fetchMessages = async () => {
    if (!currentOwner) return;
    try {
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, where("ownerEmail", "==", currentOwner.email));
      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map((doc) => doc.data());
      setMessages(messagesData);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    if (currentOwner) {
      fetchMessages();
    }
  }, [currentOwner]);

  // Function to render Base64 Trade Certificate
  const renderTradeCertificate = (certificateData) => {
    const handleDoubleClick = () => {
      setCertificateData(certificateData);
      setIsFullScreen(true);
      setOpenCertificate(null); // Close any open certificate
    };

    if (certificateData.includes("data:image")) {
      return (
        <Image
          src={certificateData}
          alt="Trade Certificate"
          width={400}
          height={400}
          className="rounded-md shadow-md cursor-pointer"
          onDoubleClick={handleDoubleClick}
        />
      );
    } else if (certificateData.includes("data:application/pdf") || certificateData.includes("data:application/msword")) {
      // Directly open PDF or Word files in full-screen mode
      handleDoubleClick();
      return null; // No preview for PDF or Word files
    } else {
      return <p className="text-gray-500">Invalid or unsupported Trade Certificate format.</p>;
    }
  };

  // Show loader while loading
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
        <div className="wave-loader">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (or redirect to login)
  if (!userEmail || userRole !== "admin") {
    return null;
  }

  return (
    <div className={`flex flex-col min-h-screen ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
      {/* Pending Approvals Section */}
      <div className="container mx-auto p-6">
        <h2 className={`text-xl font-semibold mb-4 ${theme === "light" ? "text-gray-900" : "text-white"}`}>Pending Approvals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingOwners.length > 0 ? (
            pendingOwners.map((owner) => (
              <motion.div
                key={owner.id}
                className={`bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow transform hover:scale-105`}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <h3 className={`text-lg font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                  {owner.firstName} {owner.lastName}
                </h3>
                <p className={`text-gray-600 ${theme === "light" ? "text-gray-600" : "text-white"}`}>{owner.email}</p>
                <p className={`text-gray-600 ${theme === "light" ? "text-gray-600" : "text-white"}`}>{owner.location}</p>
                <p className={`text-gray-600 ${theme === "light" ? "text-gray-600" : "text-white"}`}>{owner.phoneNumber}</p>

                {/* Button to open the certificate */}
                {owner.tradeCertificate && (
                  <div className="mt-4">
                    <button
                      onClick={() => setOpenCertificate(owner.id)}
                      className={`bg-transparent border-2 ${theme === "light" ? "border-[#a21caf] text-black" : "border-[#a21caf] text-white"} px-4 py-2 rounded-md transition-all hover:bg-[#a21caf]`}
                    >
                      Read Certificate
                    </button>
                  </div>
                )}

                {/* Conditional rendering of the certificate */}
                {openCertificate === owner.id && (
                  <div className="mt-4">
                    {renderTradeCertificate(owner.tradeCertificate)}
                  </div>
                )}

                {/* Flex container for Approve and New Chat buttons */}
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => {
                      setOwnerToApprove(owner);
                      setShowConfirmation(true);
                    }}
                    className={`bg-transparent border-2 ${theme === "light" ? "border-[#a21caf] text-black" : "border-[#a21caf] text-white"} px-4 py-2 rounded-md transition-all hover:bg-[#a21caf]`}
                  >
                    Approve
                  </button>

                  {/* New Chat Button */}
                  <button
                    onClick={() => {
                      setIsChatOpen(true);
                      setCurrentOwner(owner);
                    }}
                    className={`bg-transparent border-2 ${theme === "light" ? "border-[#a21caf] text-black" : "border-[#a21caf] text-white"} px-4 py-2 rounded-md transition-all hover:bg-[#a21caf]`}
                  >
                    New Chat
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <p className={`text-gray-500 ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>No pending approvals.</p>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className={`text-xl font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Confirm Approval</h3>
            <p className={`mt-4 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
              Are you sure you want to approve {ownerToApprove.firstName} {ownerToApprove.lastName}?
            </p>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => handleApproveOwner(ownerToApprove.id, ownerToApprove.email)}
                className={`bg-transparent border-2 ${theme === "light" ? "border-[#a21caf] text-black" : "border-[#a21caf] text-white"} px-4 py-2 rounded-md transition-all hover:bg-[#86efac]`}
              >
                Yes, Approve
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  showToast("Approval canceled.", false);
                }}
                className={`bg-transparent border-2 ${theme === "light" ? "border-[#a21caf] text-black" : "border-[#a21caf] text-white"} px-4 py-2 rounded-md transition-all hover:bg-[#86efac]`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chatting Card */}
      {isChatOpen && currentOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Chat with {currentOwner.firstName}</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-2 ${msg.sender === "admin" ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg ${
                      msg.sender === "admin"
                        ? "bg-[#ef86e6] text-white"
                        : "bg-gray-200 text-black"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleSendMessage}
                className="bg-[#86efac] text-white px-4 py-2 rounded-lg hover:bg-[#4ade80] transition-all"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Modal for Certificates */}
      {isFullScreen && certificateData && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50">
          {certificateData.includes("data:image") ? (
            <Image
              src={certificateData}
              alt="Trade Certificate"
              width={800}
              height={800}
              className="rounded-md"
            />
          ) : (
            <iframe
              src={certificateData}
              width="80%"
              height="80%"
              className="border-2 rounded-md"
              title="Trade Certificate PDF"
            />
          )}
          <button
            onClick={() => {
              setIsFullScreen(false);
              setCertificateData(null);
            }}
            className="absolute top-4 right-4 text-white text-2xl"
          >
            &times;
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-md text-white ${
          toast.isSuccess ? "bg-green-500" : "bg-red-500"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}