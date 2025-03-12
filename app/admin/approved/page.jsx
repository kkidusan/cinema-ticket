"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebaseconfig";
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { Bell, MessageCircle } from "lucide-react"; // Notification icon
import Image from "next/image";

export default function AboutPage() {
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null); // Add role state
  const [pendingOwners, setPendingOwners] = useState([]);
  const [openCertificate, setOpenCertificate] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentOwner, setCurrentOwner] = useState(null); // For keeping track of the owner in chat
  const [message, setMessage] = useState(""); // For the message input
  const [messages, setMessages] = useState([]); // Store the messages for the chat view
  const [loading, setLoading] = useState(true); // Loading state for authentication
  const router = useRouter();

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
          setUserEmail(data.email); // Set user email
          setUserRole(data.role); // Set user role

          // Redirect if the user is not an admin
          if (data.role !== "admin") {
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

  // Fetch pending owners from Firestore
  const fetchPendingOwners = async () => {
    try {
      const ownersRef = collection(db, "owner");
      const q = query(ownersRef, where("approved", "==", false));
      const querySnapshot = await getDocs(q);
      const ownersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingOwners(ownersData);
    } catch (error) {
      console.error("Error fetching pending owners:", error);
    }
  };

  useEffect(() => {
    if (userEmail && userRole === "admin") {
      fetchPendingOwners(); // Fetch data initially

      // Refresh the data every 3 minutes
      const interval = setInterval(() => {
        fetchPendingOwners();
      }, 180000); // 3 minutes
      return () => clearInterval(interval); // Cleanup interval on unmount
    }
  }, [userEmail, userRole]);

  // Approve Owner Function
  const handleApproveOwner = async (ownerId, ownerEmail) => {
    try {
      const ownerDocRef = doc(db, "owner", ownerId);
      await updateDoc(ownerDocRef, {
        approved: true,
      });

      // Update UI after approval
      setPendingOwners((prevOwners) =>
        prevOwners.filter((owner) => owner.email !== ownerEmail)
      );
    } catch (error) {
      console.error("Error approving owner:", error);
    }
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (message.trim() === "") return;

    try {
      // Prepare the message to be sent
      const newMessage = {
        ownerEmail: currentOwner.email, // Store current owner's email
        text: message, // Using 'text' instead of 'message'
        sender: "admin", // Default sender is admin
        timestamp: new Date(),
        show: false, // Default show is false
      };

      // Send message to Firestore collection 'messages'
      await setDoc(doc(db, "messages", `${currentOwner.email}_${Date.now()}`), newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]); // Update the local state with new message
      setMessage(""); // Clear the message input

      // Close the chat after sending the message
      setIsChatOpen(false);
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
      fetchMessages(); // Fetch messages when chat is opened
    }
  }, [currentOwner]);

  // Function to render Base64 Trade Certificate
  const renderTradeCertificate = (certificateData) => {
    if (certificateData.includes("data:image")) {
      return (
        <Image
          src={certificateData}
          alt="Trade Certificate"
          width={400}
          height={400}
          className="rounded-md shadow-md"
        />
      );
    } else if (certificateData.includes("data:application/pdf")) {
      const pdfData = certificateData.replace("data:application/pdf;base64,", "");
      const pdfUrl = `data:application/pdf;base64,${pdfData}`;
      
      return (
        <iframe
          src={pdfUrl}
          width="100%"
          height="600px"
          className="border-2 rounded-md"
        />
      );
    } else {
      return <p className="text-gray-500">Invalid or unsupported Trade Certificate format.</p>;
    }
  };

  // Show loading state while fetching user data
  if (loading) {
    return <p className="text-center text-gray-500 mt-10">Loading...</p>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Pending Approvals Section */}
      <div className="container mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingOwners.length > 0 ? (
            pendingOwners.map((owner) => (
              <div key={owner.id} className="bg-white p-4 shadow-lg rounded-xl">
                <h3 className="text-lg font-bold">
                  {owner.firstName} {owner.lastName}
                </h3>
                <p className="text-gray-600">{owner.email}</p>
                <p className="text-gray-600">{owner.location}</p>
                <p className="text-gray-600">{owner.phoneNumber}</p>

                {/* Button to open the certificate */}
                {owner.tradeCertificate && (
                  <div className="mt-4">
                    <button
                      onClick={() => setOpenCertificate(owner.id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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
                    onClick={() => handleApproveOwner(owner.id, owner.email)}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>

                  {/* New Chat Button */}
                  <button
                    onClick={() => {
                      setIsChatOpen(true);
                      setCurrentOwner(owner); // Set the current owner to start a chat
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    New Chat
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No pending approvals.</p>
          )}
        </div>
      </div>

      {/* Chat Modal or View */}
      {isChatOpen && currentOwner && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-semibold">Chat with {currentOwner.firstName} {currentOwner.lastName}</h3>
            <div className="mt-4">
              {/* Display messages */}
              <div className="h-64 overflow-y-scroll mb-4">
                {messages.map((msg, index) => (
                  <div key={index} className="mb-2">
                    <p className="font-bold">{msg.sender}: </p>
                    <p>{msg.text}</p> {/* Changed 'message' to 'text' */}
                  </div>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows="4"
                className="w-full p-2 border border-gray-300 rounded-md"
              ></textarea>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Send
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}