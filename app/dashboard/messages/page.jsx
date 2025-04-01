"use client";
import { useState, useEffect, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { auth, db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from "../../firebaseconfig";
import { ArrowLeft, Send, Paperclip, Trash2, Edit, Copy, Reply, Pin, X } from "lucide-react";
import { PacmanLoader } from "react-spinners";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeContext } from "../../context/ThemeContext";

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showActionCard, setShowActionCard] = useState(false);
  const [actionCardPosition, setActionCardPosition] = useState({ top: 0, left: 0 });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [visibleStatuses, setVisibleStatuses] = useState({});
  const messagesEndRef = useRef(null);
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  // Enhanced timestamp formatting
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return "";
    }

    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      // Today - show time only
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInDays === 1) {
      // Yesterday
      return `Yesterday at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}`;
    } else if (diffInDays < 7) {
      // Within a week - show day name
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Older than a week - show full date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  // Fetch user authentication and role
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
          setIsAuthenticated(true);
          if (data.role !== "owner") {
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
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Fetch messages from Firestore
  useEffect(() => {
    if (!userEmail) return;

    const q = query(
      collection(db, "messages"),
      where("ownerEmail", "==", userEmail),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp
      }));
      setMessages(messagesData);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [userEmail]);

  // Scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      toast.info("File selected: " + selectedFile.name);
    }
  };

  // Send a new message or save an edited message
  const sendMessage = async () => {
    if (newMessage.trim() === "" && !file) return;

    if (editingMessageId) {
      try {
        await updateDoc(doc(db, "messages", editingMessageId), {
          text: newMessage,
        });
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === editingMessageId ? { ...msg, text: newMessage } : msg
          )
        );
        setEditingMessageId(null);
        setNewMessage("");
        toast.success("Message updated successfully!");
      } catch (error) {
        console.error("Error updating message:", error);
        toast.error("Failed to update message.");
      }
    } else {
      const tempId = Date.now().toString();
      const newMessageObj = {
        ownerEmail: userEmail,
        text: newMessage,
        sender: "owner",
        from: auth.currentUser?.displayName || userEmail,
        show: true,
        timestamp: new Date(),
        status: "sending",
        replyTo: replyingToMessage ? replyingToMessage.id : null,
        tempId
      };

      setMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setNewMessage("");
      setFile(null);
      setReplyingToMessage(null);
      scrollToBottom();

      // Show status temporarily
      setVisibleStatuses(prev => ({ ...prev, [tempId]: true }));
      setTimeout(() => {
        setVisibleStatuses(prev => ({ ...prev, [tempId]: false }));
      }, 3000);

      try {
        const docRef = await addDoc(collection(db, "messages"), {
          ownerEmail: userEmail,
          text: newMessage,
          sender: "owner",
          from: auth.currentUser?.displayName || userEmail,
          show: false,
          timestamp: serverTimestamp(),
          status: "sending",
          replyTo: replyingToMessage ? replyingToMessage.id : null,
        });

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.tempId === tempId 
              ? { ...msg, id: docRef.id, status: "delivered", tempId: undefined }
              : msg
          )
        );
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.tempId === tempId
              ? { ...msg, status: "failed" }
              : msg
          )
        );
      }
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && newMessage.trim() !== "") {
      sendMessage();
    }
  };

  // Handle message actions
  const handleMessageAction = (message, e) => {
    e.preventDefault();
    setSelectedMessage(message);
    setShowActionCard(true);

    const messageElement = e.currentTarget;
    const rect = messageElement.getBoundingClientRect();
    
    // Position differently for owner vs admin messages
    if (message.sender === "owner") {
      setActionCardPosition({
        top: rect.top + window.scrollY,
        left: rect.left - 200,
      });
    } else {
      setActionCardPosition({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width + 10,
      });
    }
  };

  // Handle delete message
  const handleDeleteMessage = async () => {
    if (selectedMessage) {
      const confirmDelete = window.confirm("Are you sure you want to delete this message?");
      if (confirmDelete) {
        try {
          await deleteDoc(doc(db, "messages", selectedMessage.id));
          setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== selectedMessage.id));
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
      setEditingMessageId(selectedMessage.id);
      setNewMessage(selectedMessage.text);
      setReplyingToMessage(null);
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

  // Handle reply message
  const handleReplyMessage = () => {
    if (selectedMessage) {
      setReplyingToMessage(selectedMessage);
      setShowActionCard(false);
    }
  };

  // Handle pin message
  const handlePinMessage = async () => {
    if (selectedMessage) {
      try {
        await updateDoc(doc(db, "messages", selectedMessage.id), {
          pinned: true,
        });
        toast.success("Message pinned to the top!");
        setShowActionCard(false);
      } catch (error) {
        console.error("Error pinning message:", error);
        toast.error("Failed to pin message.");
      }
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

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${theme === "light" ? "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" : "bg-gradient-to-br from-gray-800 to-gray-900"}`}>
        <PacmanLoader color={theme === "light" ? "#6D28D9" : "#FFFFFF"} size={30} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${theme === "light" ? "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" : "bg-gradient-to-br from-gray-800 to-gray-900"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 ${theme === "light" ? "bg-white/80 backdrop-blur-sm" : "bg-gray-800/80 backdrop-blur-sm"} shadow-md ${theme === "light" ? "text-gray-800" : "text-white"}`}>
        <button onClick={() => router.push("/dashboard")} className={theme === "light" ? "text-gray-800" : "text-white"}>
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-semibold">Messages</h2>
        <div className="w-10"></div>
      </div>

      {/* Chat Messages Grid */}
      <div className={`flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar ${theme === "light" ? "bg-white/50 backdrop-blur-sm" : "bg-gray-900/50 backdrop-blur-sm"}`}>
        <div className="grid gap-4">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id || msg.tempId}
                className={`grid ${msg.sender === "owner" ? "justify-self-end" : "justify-self-start"}`}
                onDoubleClick={(e) => handleMessageAction(msg, e)}
                onContextMenu={(e) => handleMessageAction(msg, e)}
                style={{ cursor: "pointer" }}
              >
                <div
                  className={`max-w-lg p-4 rounded-lg relative ${
                    msg.sender === "owner"
                      ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
                      : theme === "light"
                      ? "bg-gray-300 text-black"
                      : "bg-gray-700 text-white"
                  } shadow-lg`}
                >
                  {msg.replyTo && (
                    <div className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"} mb-2`}>
                      Replying to: {messages.find((m) => m.id === msg.replyTo)?.text}
                    </div>
                  )}
                  <p className="text-lg">{msg.text}</p>
                </div>
                <div className={`flex justify-between items-center mt-1 px-2 ${
                  msg.sender === "owner" ? "justify-end" : "justify-start"
                }`}>
                  <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-300"}`}>
                    {formatTimestamp(msg.timestamp)}
                  </p>
                  {msg.sender === "owner" && visibleStatuses[msg.id || msg.tempId] && (
                    <p className={`text-xs ml-2 ${
                      msg.status === "sending" ? "text-yellow-300" :
                      msg.status === "delivered" ? "text-green-300" :
                      "text-red-300"
                    }`}>
                      {msg.status === "sending"
                        ? "Sending..."
                        : msg.status === "delivered"
                        ? "✓ Delivered"
                        : "✗ Failed"}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className={`text-center ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>No messages yet.</p>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Action Card */}
      {showActionCard && (
        <div
          className={`absolute action-card ${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-lg rounded-lg p-2 w-48 z-50`}
          style={{ top: actionCardPosition.top, left: actionCardPosition.left }}
        >
          {selectedMessage?.sender === "owner" ? (
            <>
              <button
                onClick={handleDeleteMessage}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Trash2 size={16} className="text-red-500" />
                <span className="text-sm">Delete</span>
              </button>
              <button
                onClick={handleEditMessage}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Edit size={16} className="text-blue-500" />
                <span className="text-sm">Edit</span>
              </button>
              <button
                onClick={handleCopyMessage}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Copy size={16} className="text-green-500" />
                <span className="text-sm">Copy</span>
              </button>
              <button
                onClick={handleReplyMessage}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Reply size={16} className="text-purple-500" />
                <span className="text-sm">Reply</span>
              </button>
              <button
                onClick={handlePinMessage}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Pin size={16} className="text-yellow-500" />
                <span className="text-sm">Pin</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopyMessage}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Copy size={16} className="text-green-500" />
                <span className="text-sm">Copy</span>
              </button>
              <button
                onClick={handleReplyMessage}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Reply size={16} className="text-purple-500" />
                <span className="text-sm">Reply</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Input Field with Reply Preview */}
      <div className={`p-4 ${theme === "light" ? "bg-white/80 backdrop-blur-sm" : "bg-gray-800/80 backdrop-blur-sm"} flex flex-col shadow-md space-y-2 rounded-lg`}>
        {replyingToMessage && (
          <div className={`flex items-center justify-between p-2 ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} rounded-lg`}>
            <div className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
              Replying to: {replyingToMessage.text}
            </div>
            <button
              onClick={() => setReplyingToMessage(null)}
              className={`text-gray-500 hover:text-gray-700 ${theme === "light" ? "" : "dark:text-gray-300"}`}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-3">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Paperclip size={20} className={`text-gray-500 hover:text-gray-700 ${theme === "light" ? "" : "dark:text-gray-300"}`} />
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className={`flex-grow p-3 border rounded-xl ${theme === "light" ? "bg-white" : "bg-gray-700 text-white"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />

          <button
            onClick={sendMessage}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2"
          >
            <Send size={20} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
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