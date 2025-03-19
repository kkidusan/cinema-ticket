"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebaseconfig";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  writeBatch,
  doc,
} from "firebase/firestore"; // Modular Firebase SDK imports
import { motion } from "framer-motion";
import { FaSearch, FaPaperPlane } from "react-icons/fa"; // Icons for search and send

export default function ChatApp() {
  const [userEmail, setUserEmail] = useState(null); // Logged-in user's email
  const [userRole, setUserRole] = useState(null); // User role (admin or not)
  const [groupedMessages, setGroupedMessages] = useState({}); // Messages grouped by ownerEmail
  const [selectedEmail, setSelectedEmail] = useState(null); // Selected chat (ownerEmail)
  const [selectedMessages, setSelectedMessages] = useState([]); // Messages for the selected chat
  const [message, setMessage] = useState(""); // Input message state
  const [searchQuery, setSearchQuery] = useState(""); // Search query for filtering chats
  const [newMessageCounts, setNewMessageCounts] = useState({}); // New message counts for each chat
  const [loading, setLoading] = useState(true); // Loading state for authentication
  const messageEndRef = useRef(null); // Ref for auto-scrolling to the bottom of the chat
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
            router.replace("/login"); // Redirect to login page
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

  // Fetch Messages from Firestore and group by ownerEmail
  useEffect(() => {
    if (userRole === "admin") {
      const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

      // Listen for real-time updates
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const grouped = {};
        const newMessageCounts = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.ownerEmail) {
            if (!grouped[data.ownerEmail]) {
              grouped[data.ownerEmail] = [];
            }
            grouped[data.ownerEmail].push({ ...data, id: doc.id });

            // Count new messages where show is false and sender is "owner"
            if (data.sender === "owner" && !data.show) {
              newMessageCounts[data.ownerEmail] = (newMessageCounts[data.ownerEmail] || 0) + 1;
            }
          }
        });

        setGroupedMessages(grouped);
        setNewMessageCounts(newMessageCounts); // Update new message counts

        // Update selectedMessages if the selected chat is open
        if (selectedEmail) {
          setSelectedMessages(grouped[selectedEmail] || []);
        }
      });

      // Clean up the listener on unmount
      return () => unsubscribe();
    }
  }, [userRole, selectedEmail]);

  // Handle email click to select a chat and mark messages as 'shown'
  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    const selectedMsgs = groupedMessages[email] || [];
    setSelectedMessages(selectedMsgs);

    // Mark messages as shown using a batch update
    const batch = writeBatch(db);
    selectedMsgs.forEach((msg) => {
      if (msg.sender === "owner" && !msg.show) {
        const messageRef = doc(db, "messages", msg.id);
        batch.update(messageRef, { show: true }); // Mark messages as shown
      }
    });

    try {
      await batch.commit(); // Commit the batch operation
    } catch (error) {
      console.error("Error updating messages:", error);
    }
  };

  // Send a new message
  const handleSendMessage = async () => {
    if (message.trim() === "") return; // Don't send empty messages

    try {
      // Add message to Firestore
      const newMessage = {
        ownerEmail: selectedEmail, // Set the selected email as the ownerEmail
        sender: "admin", // Sender as admin
        show: true, // Admin messages are always shown
        text: message,
        timestamp: serverTimestamp(),
      };

      // Update selectedMessages to show the message immediately
      setSelectedMessages((prevMessages) => [...prevMessages, newMessage]);

      // Store the message in Firestore
      await addDoc(collection(db, "messages"), newMessage);

      setMessage(""); // Clear the input after sending
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedMessages]);

  // Filter chats based on search query
  const filteredGroupedMessages = Object.entries(groupedMessages).filter(([ownerEmail, _]) =>
    ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the last message for each chat
  const getLastMessage = (messages) => {
    if (messages.length === 0) return "No messages";
    const lastMessage = messages[messages.length - 1];
    return lastMessage.text;
  };

  // Show loading animation while validating authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
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

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-100 to-pink-100 dark:bg-gray-900 dark:text-white">
      {/* Sidebar */}
      <div className="w-1/4 bg-blue-50 shadow-lg p-4 overflow-y-auto h-screen">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Chats</h2>

        {/* Search Bar */}
        <div className="flex items-center bg-gray-200 p-2 rounded-lg mb-4">
          <FaSearch className="text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full p-2 bg-gray-200 border-none focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Display Chats */}
        {filteredGroupedMessages.length > 0 ? (
          filteredGroupedMessages.map(([ownerEmail, messages]) => {
            const newMessages = newMessageCounts[ownerEmail] || 0; // Get new messages count
            return (
              <motion.div
                key={ownerEmail}
                className="p-3 mb-2 rounded-lg bg-gray-200 cursor-pointer transition-all hover:bg-gray-300"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleEmailClick(ownerEmail)}
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold">{ownerEmail}</p>
                  {newMessages > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {newMessages}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{getLastMessage(messages)}</p>
              </motion.div>
            );
          })
        ) : (
          <p className="text-gray-500">No chats available</p>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-gradient-to-r from-indigo-100 via-blue-200 to-blue-300 p-4 overflow-y-auto h-screen flex flex-col">
        {selectedEmail ? (
          <>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg mb-4">
              <h3 className="text-2xl font-bold">{selectedEmail}</h3>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 flex flex-col">
              {selectedMessages.length > 0 ? (
                selectedMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg shadow-lg ${
                        msg.sender === "admin" ? "bg-blue-400 text-white" : "bg-gray-300"
                      }`}
                    >
                      <p className="text-lg">{msg.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No messages available</p>
              )}

              {/* Scroll to bottom ref */}
              <div ref={messageEndRef}></div>
            </div>

            {/* Message Input Area */}
            <div className="flex items-center space-x-4 mt-4">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg"
                placeholder="Type a message..."
              />
              <button
                onClick={handleSendMessage}
                className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg"
              >
                <FaPaperPlane size={20} />
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Select a chat to view messages</p>
        )}
      </div>
    </div>
  );
}