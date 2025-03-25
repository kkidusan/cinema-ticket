"use client";
import { useEffect, useState, useRef, useContext } from "react";
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
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { FaSearch, FaPaperPlane } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Trash2, Edit, Copy } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext"; // Import ThemeContext

export default function ChatApp() {
  const { theme } = useContext(ThemeContext); // Use ThemeContext
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [groupedMessages, setGroupedMessages] = useState({});
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageCounts, setNewMessageCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showActionCard, setShowActionCard] = useState(false);
  const [actionCardPosition, setActionCardPosition] = useState({ top: 0, left: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messageEndRef = useRef(null);
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

  // Fetch Messages from Firestore and group by ownerEmail
  useEffect(() => {
    if (userRole === "admin") {
      const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

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

            if (data.sender === "owner" && !data.show) {
              newMessageCounts[data.ownerEmail] = (newMessageCounts[data.ownerEmail] || 0) + 1;
            }
          }
        });

        setGroupedMessages(grouped);
        setNewMessageCounts(newMessageCounts);

        if (selectedEmail) {
          setSelectedMessages(grouped[selectedEmail] || []);
        }
      });

      return () => unsubscribe();
    }
  }, [userRole, selectedEmail]);

  // Handle email click to select a chat and mark messages as 'shown'
  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    const selectedMsgs = groupedMessages[email] || [];
    setSelectedMessages(selectedMsgs);

    const batch = writeBatch(db);
    selectedMsgs.forEach((msg) => {
      if (msg.sender === "owner" && !msg.show) {
        const messageRef = doc(db, "messages", msg.id);
        batch.update(messageRef, { show: true });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error updating messages:", error);
    }
  };

  // Send a new message
  const handleSendMessage = async () => {
    if (message.trim() === "" || !selectedEmail) return;

    try {
      const newMessage = {
        ownerEmail: selectedEmail,
        sender: "admin",
        show: true,
        text: message,
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "messages"), newMessage);
      setSelectedMessages((prevMessages) => [
        ...prevMessages,
        { ...newMessage, id: docRef.id },
      ]);

      setMessage("");
      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message: ", error);
      toast.error("Failed to send message.");
    }
  };

  // Handle right-click or double-click to show action card
  const handleMessageAction = (message, e) => {
    if (message.sender === "admin") {
      e.preventDefault();
      setSelectedMessage(message);
      setShowActionCard(true);

      const messageElement = e.currentTarget;
      const rect = messageElement.getBoundingClientRect();

      // Calculate the position
      let top = rect.bottom + window.scrollY + 3; // 3px below the message
      let left = rect.left + window.scrollX + 3; // 3px to the right of the message

      // Ensure the action card doesn't overflow the viewport
      const actionCardWidth = 200; // Adjust based on your action card width
      const actionCardHeight = 120; // Adjust based on your action card height

      if (left + actionCardWidth > window.innerWidth) {
        left = window.innerWidth - actionCardWidth - 10; // 10px buffer
      }

      if (top + actionCardHeight > window.innerHeight) {
        top = window.innerHeight - actionCardHeight - 10; // 10px buffer
      }

      setActionCardPosition({ top, left });
    }
  };

  // Handle delete message
  const handleDeleteMessage = async () => {
    if (selectedMessage) {
      const confirmDelete = window.confirm("Are you sure you want to delete this message?");
      if (confirmDelete) {
        try {
          await deleteDoc(doc(db, "messages", selectedMessage.id));
          setSelectedMessages((prevMessages) =>
            prevMessages.filter((msg) => msg.id !== selectedMessage.id)
          );
          setShowActionCard(false);
          toast.success("Message deleted successfully!");
        } catch (error) {
          console.error("Error deleting message:", error);
          toast.error("Failed to delete message.");
        }
      }
    }
  };

  // Handle edit message
  const handleEditMessage = () => {
    if (selectedMessage) {
      setMessage(selectedMessage.text);
      setShowActionCard(false);
    }
  };

  // Handle copy message
  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        toast.success("Message copied to clipboard!");
      });
      setShowActionCard(false);
    }
  };

  // Close action card when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionCard && !e.target.closest(".action-card")) {
        setShowActionCard(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionCard]);

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

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Show loading animation while validating authentication
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

  return (
    <div className={`flex min-h-screen ${theme === "light" ? "bg-gradient-to-r from-indigo-100 to-pink-100" : "bg-gradient-to-r from-gray-800 to-gray-900"} overflow-hidden`}>
      {/* Sidebar */}
      <div className={`w-1/4 ${theme === "light" ? "bg-blue-50" : "bg-gray-800"} shadow-lg p-4 h-screen flex flex-col`}>
        {/* Fixed Search Bar */}
        <div className={`sticky top-0 z-10 ${theme === "light" ? "bg-blue-50" : "bg-gray-800"} pb-4`}>
          <h2 className={`text-xl font-bold ${theme === "light" ? "text-gray-800" : "text-white"} mb-4`}>Chats</h2>
          <div className={`flex items-center ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} p-2 rounded-lg`}>
            <FaSearch className={`${theme === "light" ? "text-gray-500" : "text-gray-300"} mr-2`} />
            <input
              type="text"
              placeholder="Search chats..."
              className={`w-full p-2 ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} border-none focus:outline-none ${theme === "light" ? "text-gray-800" : "text-white"}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable Chats List */}
        <div className="mt-4 overflow-y-auto custom-scrollbar">
          {filteredGroupedMessages.length > 0 ? (
            filteredGroupedMessages.map(([ownerEmail, messages]) => {
              const newMessages = newMessageCounts[ownerEmail] || 0;
              return (
                <motion.div
                  key={ownerEmail}
                  className={`p-3 mb-2 rounded-lg ${theme === "light" ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"} cursor-pointer transition-all`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEmailClick(ownerEmail)}
                >
                  <div className="flex justify-between items-center">
                    <p className={`font-semibold ${theme === "light" ? "text-gray-800" : "text-white"}`}>{ownerEmail}</p>
                    {newMessages > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {newMessages}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>{getLastMessage(messages)}</p>
                </motion.div>
              );
            })
          ) : (
            <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>No chats available</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 ${theme === "light" ? "bg-gradient-to-r from-indigo-100 via-blue-200 to-blue-300" : "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900"} p-4 h-screen flex flex-col`}>
        {selectedEmail ? (
          <>
            <div className={`${theme === "light" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gradient-to-r from-gray-700 to-gray-800"} text-white p-4 rounded-lg mb-4`}>
              <h3 className="text-2xl font-bold">{selectedEmail}</h3>
            </div>

            {/* Scrollable Chat Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 flex flex-col custom-scrollbar">
              {selectedMessages.length > 0 ? (
                selectedMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                    onContextMenu={(e) => handleMessageAction(msg, e)}
                    onDoubleClick={(e) => handleMessageAction(msg, e)}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg shadow-lg ${
                        msg.sender === "admin"
                          ? theme === "light"
                            ? "bg-blue-400 text-white"
                            : "bg-blue-600 text-white"
                          : theme === "light"
                          ? "bg-gray-300"
                          : "bg-gray-600"
                      }`}
                    >
                      <p className="text-lg">{msg.text}</p>
                      <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-300"} mt-1`}>
                        {formatTimestamp(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>No messages available</p>
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
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === "Tab") && message.trim() !== "") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className={`flex-1 p-3 border ${theme === "light" ? "border-gray-300" : "border-gray-600"} rounded-lg ${theme === "light" ? "text-gray-800" : "text-white bg-gray-700"}`}
                placeholder="Type a message..."
              />
              <button
                onClick={handleSendMessage}
                className={`p-3 ${theme === "light" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gradient-to-r from-gray-700 to-gray-800"} text-white rounded-lg`}
              >
                <FaPaperPlane size={20} />
              </button>
            </div>
          </>
        ) : (
          <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>Select a chat to view messages</p>
        )}
      </div>

      {/* Modern Action Card */}
      {showActionCard && (
        <div
          className={`absolute action-card ${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-lg rounded-lg p-2 w-48 z-50`}
          style={{ top: actionCardPosition.top, left: actionCardPosition.left }}
        >
          <button
            onClick={handleDeleteMessage}
            className={`flex items-center space-x-2 p-2 ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} w-full text-left`}
          >
            <Trash2 size={16} className="text-red-500" />
            <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Delete</span>
          </button>
          <button
            onClick={handleEditMessage}
            className={`flex items-center space-x-2 p-2 ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} w-full text-left`}
          >
            <Edit size={16} className="text-blue-500" />
            <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Edit</span>
          </button>
          <button
            onClick={handleCopyMessage}
            className={`flex items-center space-x-2 p-2 ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} w-full text-left`}
          >
            <Copy size={16} className="text-green-500" />
            <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Copy</span>
          </button>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}