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
  getDoc
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaPaperPlane, FaReply, FaShare, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Trash2, Edit, Copy } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";

export default function ChatApp() {
  const { theme } = useContext(ThemeContext);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [groupedMessages, setGroupedMessages] = useState({});
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState(null);
  const [selectedOwnerInfo, setSelectedOwnerInfo] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageCounts, setNewMessageCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showActionCard, setShowActionCard] = useState(false);
  const [actionCardPosition, setActionCardPosition] = useState({ top: 0, left: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [ownerData, setOwnerData] = useState({});
  const messageEndRef = useRef(null);
  const actionCardRef = useRef(null);
  const chatAreaRef = useRef(null);
  const router = useRouter();

  const formatTimestamp = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true
      });
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })}`;
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }
  };

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

  // Fetch owner data
  const fetchOwnerData = async (email) => {
    try {
      const ownerDoc = await getDoc(doc(db, "owners", email));
      if (ownerDoc.exists()) {
        const data = ownerDoc.data();
        return {
          email,
          fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || email,
          firstName: data.firstName || '',
          lastName: data.lastName || ''
        };
      }
      return { email, fullName: email, firstName: '', lastName: '' };
    } catch (error) {
      console.error("Error fetching owner info:", error);
      return { email, fullName: email, firstName: '', lastName: '' };
    }
  };

  useEffect(() => {
    const updateOwnerData = async () => {
      const owners = {};
      const ownerEmails = Object.keys(groupedMessages);
      
      for (const email of ownerEmails) {
        const ownerInfo = await fetchOwnerData(email);
        owners[email] = ownerInfo;
      }
      setOwnerData(owners);
    };

    if (Object.keys(groupedMessages).length > 0) {
      updateOwnerData();
    }
  }, [groupedMessages]);

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

        if (selectedOwnerEmail) {
          setSelectedMessages(grouped[selectedOwnerEmail] || []);
        }
      });

      return () => unsubscribe();
    }
  }, [userRole, selectedOwnerEmail]);

  const fetchOwnerInfo = async (email) => {
    return await fetchOwnerData(email);
  };

  const handleOwnerClick = async (email) => {
    setSelectedOwnerEmail(email);
    setReplyingTo(null);
    const selectedMsgs = groupedMessages[email] || [];
    setSelectedMessages(selectedMsgs);

    const ownerInfo = await fetchOwnerInfo(email);
    setSelectedOwnerInfo(ownerInfo);

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

  const handleSendMessage = async () => {
    if (message.trim() === "" || !selectedOwnerEmail) return;

    try {
      const newMessage = {
        ownerEmail: selectedOwnerEmail,
        sender: "admin",
        show: true,
        text: message,
        timestamp: serverTimestamp(),
        ...(replyingTo && { replyTo: replyingTo.id })
      };

      const docRef = await addDoc(collection(db, "messages"), newMessage);
      setSelectedMessages((prevMessages) => [
        ...prevMessages,
        { ...newMessage, id: docRef.id, status: "sending" },
      ]);

      setMessage("");
      setReplyingTo(null);
      
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, "messages", docRef.id), {
            status: "delivered"
          });
          setSelectedMessages(prev => prev.map(m => 
            m.id === docRef.id ? {...m, status: "delivered"} : m
          ));
        } catch (error) {
          await updateDoc(doc(db, "messages", docRef.id), {
            status: "failed"
          });
          setSelectedMessages(prev => prev.map(m => 
            m.id === docRef.id ? {...m, status: "failed"} : m
          ));
        }
      }, 1000);

      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message: ", error);
      toast.error("Failed to send message.");
    }
  };

  const handleMessageAction = (message, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedMessage(message);
    setShowActionCard(true);

    const messageElement = e.currentTarget;
    const rect = messageElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.top + window.scrollY;
    let left = rect.left + window.scrollX;

    const cardWidth = 200;
    const cardHeight = message.sender === "admin" ? 180 : 120;

    if (left + cardWidth > viewportWidth) {
      left = viewportWidth - cardWidth - 10;
    }
    if (top + cardHeight > viewportHeight) {
      top = viewportHeight - cardHeight - 10;
    }

    setActionCardPosition({ top, left });
  };

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

  const handleEditMessage = () => {
    if (selectedMessage) {
      setMessage(selectedMessage.text);
      setShowActionCard(false);
    }
  };

  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        toast.success("Message copied to clipboard!");
      });
      setShowActionCard(false);
    }
  };

  const handleReplyMessage = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      setShowActionCard(false);
      setTimeout(() => {
        document.querySelector('input[type="text"]')?.focus();
      }, 100);
    }
  };

  const handleForwardMessage = () => {
    if (selectedMessage) {
      setForwardingMessage(selectedMessage);
      setShowForwardModal(true);
      setShowActionCard(false);
    }
  };

  const executeForwardMessage = async (recipientEmail) => {
    if (!forwardingMessage || !recipientEmail) return;

    try {
      const newMessage = {
        ownerEmail: recipientEmail,
        sender: "admin",
        show: true,
        text: forwardingMessage.text,
        timestamp: serverTimestamp(),
        isForwarded: true,
        originalSender: forwardingMessage.sender === "admin" ? "You" : ownerData[forwardingMessage.ownerEmail]?.fullName || forwardingMessage.ownerEmail
      };

      await addDoc(collection(db, "messages"), newMessage);
      
      setShowForwardModal(false);
      setForwardingMessage(null);
      toast.success(`Message forwarded to ${ownerData[recipientEmail]?.fullName || recipientEmail}`);
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast.error("Failed to forward message.");
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const cancelForward = () => {
    setForwardingMessage(null);
    setShowForwardModal(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionCard && 
          actionCardRef.current && 
          !actionCardRef.current.contains(e.target) &&
          !e.target.closest('.message-content')) {
        setShowActionCard(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionCard]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedMessages, replyingTo]);

  // Mouse event handling
  useEffect(() => {
    const preventContextMenu = (e) => {
      e.preventDefault();
    };

    const handleMouseDown = (e) => {
      // Allow only left click (button 0)
      if (e.button !== 0) {
        e.preventDefault();
        return false;
      }
    };

    const chatArea = chatAreaRef.current;
    if (chatArea) {
      chatArea.addEventListener('contextmenu', preventContextMenu);
      chatArea.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      if (chatArea) {
        chatArea.removeEventListener('contextmenu', preventContextMenu);
        chatArea.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, []);

  const filteredGroupedMessages = Object.entries(groupedMessages).filter(([ownerEmail, _]) =>
    (ownerData[ownerEmail]?.fullName || ownerEmail).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLastMessage = (messages) => {
    if (messages.length === 0) return "No messages";
    const lastMessage = messages[messages.length - 1];
    return lastMessage.text.length > 30 
      ? `${lastMessage.text.substring(0, 30)}...` 
      : lastMessage.text;
  };

  const getDisplayName = (email) => {
    return ownerData[email]?.fullName || email;
  };

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

        <div className="mt-4 overflow-y-auto custom-scrollbar">
          {filteredGroupedMessages.length > 0 ? (
            filteredGroupedMessages.map(([ownerEmail, messages]) => {
              const newMessages = newMessageCounts[ownerEmail] || 0;
              return (
                <motion.div
                  key={ownerEmail}
                  className={`p-3 mb-2 rounded-lg ${theme === "light" ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"} cursor-pointer transition-all`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOwnerClick(ownerEmail)}
                >
                  <div className="flex justify-between items-center">
                    <p className={`font-semibold ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                      {getDisplayName(ownerEmail)}
                    </p>
                    {newMessages > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {newMessages}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
                    {getLastMessage(messages)}
                  </p>
                </motion.div>
              );
            })
          ) : (
            <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>No chats available</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div 
        ref={chatAreaRef}
        className={`flex-1 ${theme === "light" ? "bg-gradient-to-r from-indigo-100 via-blue-200 to-blue-300" : "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900"} p-4 h-screen flex flex-col`}
      >
        {selectedOwnerEmail ? (
          <>
            <div className={`${theme === "light" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gradient-to-r from-gray-700 to-gray-800"} text-white p-4 rounded-lg mb-4`}>
              <h3 className="text-2xl font-bold">{getDisplayName(selectedOwnerEmail)}</h3>
              {selectedOwnerInfo && (
                <div className="flex space-x-2 mt-1">
                  {selectedOwnerInfo.firstName && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                      {selectedOwnerInfo.firstName}
                    </span>
                  )}
                  {selectedOwnerInfo.lastName && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                      {selectedOwnerInfo.lastName}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3 flex flex-col custom-scrollbar">
              {selectedMessages.length > 0 ? (
                selectedMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${msg.sender === "admin" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className="message-content"
                      onClick={(e) => handleMessageAction(msg, e)}
                      style={{ cursor: "pointer" }}
                    >
                      {msg.replyTo && (
                        <div className={`mb-1 max-w-xs p-2 rounded-lg ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} text-xs opacity-80`}>
                          <p className="font-semibold">
                            {selectedMessages.find(m => m.id === msg.replyTo)?.sender === "admin" ? "You" : getDisplayName(selectedOwnerEmail)}
                          </p>
                          <p className="truncate">
                            {selectedMessages.find(m => m.id === msg.replyTo)?.text || "Original message not found"}
                          </p>
                        </div>
                      )}
                      {msg.isForwarded && (
                        <div className={`mb-1 text-xs ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                          Forwarded from {msg.originalSender}
                        </div>
                      )}
                      <div
                        className={`max-w-xs p-3 rounded-lg shadow-lg ${
                          msg.sender === "admin"
                            ? theme === "light"
                              ? "bg-blue-400 text-white"
                              : "bg-blue-600 text-white"
                            : theme === "light"
                            ? "bg-gray-300 text-gray-800"
                            : "bg-gray-600 text-white"
                        }`}
                      >
                        <p className="text-lg">{msg.text}</p>
                      </div>
                      
                      <div className={`flex items-center mt-1 space-x-2 ${
                        msg.sender === "admin" ? "justify-end" : "justify-start"
                      }`}>
                        <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                          {formatTimestamp(msg.timestamp)}
                        </p>
                        {msg.sender === "admin" && msg.status && (
                          <span className={`text-xs ${
                            msg.status === "sending" ? "text-yellow-500" :
                            msg.status === "delivered" ? "text-green-500" :
                            msg.status === "failed" ? "text-red-500" : ""
                          }`}>
                            {msg.status === "sending" && "Sending..."}
                            {msg.status === "delivered" && "✓ Delivered"}
                            {msg.status === "failed" && "✗ Failed"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                    No messages available
                  </p>
                </div>
              )}

              <div ref={messageEndRef}></div>
            </div>

            {/* Reply preview */}
            {replyingTo && (
              <div className={`mb-2 p-3 rounded-lg ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} flex justify-between items-center`}>
                <div>
                  <p className="text-sm font-semibold">
                    Replying to {replyingTo.sender === "admin" ? "yourself" : getDisplayName(selectedOwnerEmail)}
                  </p>
                  <p className="text-sm truncate">{replyingTo.text}</p>
                </div>
                <button 
                  onClick={cancelReply}
                  className={`p-1 rounded-full ${theme === "light" ? "hover:bg-gray-300" : "hover:bg-gray-600"}`}
                >
                  ×
                </button>
              </div>
            )}

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
                placeholder={replyingTo ? `Replying to ${replyingTo.sender === "admin" ? "yourself" : getDisplayName(selectedOwnerEmail)}...` : "Type a message..."}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className={`p-3 rounded-lg transition-all ${
                  message.trim()
                    ? theme === "light"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      : "bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700"
                    : theme === "light"
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gray-700 cursor-not-allowed"
                } text-white`}
              >
                <FaPaperPlane size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
              Select a chat to view messages
            </p>
          </div>
        )}
      </div>

      {/* Action Card */}
      {showActionCard && (
        <motion.div
          ref={actionCardRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className={`fixed action-card ${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-xl rounded-lg p-2 w-48 z-50 border ${
            theme === "light" ? "border-gray-200" : "border-gray-700"
          }`}
          style={{ 
            top: `${actionCardPosition.top}px`,
            left: `${actionCardPosition.left}px`
          }}
        >
          {selectedMessage?.sender === "admin" ? (
            <>
              <button
                onClick={handleDeleteMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <Trash2 size={16} className="text-red-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Delete</span>
              </button>
              <button
                onClick={handleEditMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <Edit size={16} className="text-blue-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Edit</span>
              </button>
              <button
                onClick={handleReplyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <FaReply size={16} className="text-green-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Reply</span>
              </button>
              <button
                onClick={handleForwardMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <FaShare size={16} className="text-purple-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Forward</span>
              </button>
              <button
                onClick={handleCopyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <Copy size={16} className="text-yellow-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Copy</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReplyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <FaReply size={16} className="text-green-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Reply</span>
              </button>
              <button
                onClick={handleForwardMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <FaShare size={16} className="text-purple-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Forward</span>
              </button>
              <button
                onClick={handleCopyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
              >
                <Copy size={16} className="text-yellow-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Copy</span>
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Forward Modal */}
      <AnimatePresence>
        {showForwardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={cancelForward}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`relative ${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-lg p-6 w-full max-w-md`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={cancelForward}
                className={`absolute top-4 right-4 p-1 rounded-full ${theme === "light" ? "hover:bg-gray-200" : "hover:bg-gray-700"}`}
              >
                <FaTimes className={theme === "light" ? "text-gray-600" : "text-gray-300"} />
              </button>
              
              <h3 className={`text-xl font-bold mb-4 ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                Forward Message
              </h3>
              
              <div className={`mb-4 p-3 rounded-lg ${theme === "light" ? "bg-gray-100" : "bg-gray-700"}`}>
                <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
                  Original message from {forwardingMessage?.sender === "admin" ? "You" : getDisplayName(forwardingMessage?.ownerEmail)}:
                </p>
                <p className={`mt-1 ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                  {forwardingMessage?.text}
                </p>
              </div>
              
              <h4 className={`text-lg font-semibold mb-3 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                Select recipient:
              </h4>
              
              <div className="max-h-60 overflow-y-auto custom-scrollbar mb-4">
                {Object.keys(groupedMessages).map((email) => (
                  <div
                    key={email}
                    className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                      theme === "light" 
                        ? "hover:bg-gray-200" 
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => executeForwardMessage(email)}
                  >
                    <p className={`font-medium ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                      {getDisplayName(email)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        theme={theme === "light" ? "light" : "dark"}
      />
    </div>
  );
}