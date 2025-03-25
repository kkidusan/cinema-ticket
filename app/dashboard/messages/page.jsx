"use client";
import { useState, useEffect, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { auth, db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from "../../firebaseconfig";
import { ArrowLeft, Send, Paperclip, Trash2, Edit, Copy, Reply, Pin, X } from "lucide-react";
import { PacmanLoader } from "react-spinners";
import { toast, ToastContainer } from "react-toastify"; // For toast messages
import "react-toastify/dist/ReactToastify.css"; // Toast styles
import { ThemeContext } from "../../context/ThemeContext"; // Import ThemeContext

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null); // Track selected message for actions
  const [showActionCard, setShowActionCard] = useState(false); // Toggle action card visibility
  const [actionCardPosition, setActionCardPosition] = useState({ top: 0, left: 0 }); // Position of the action card
  const [editingMessageId, setEditingMessageId] = useState(null); // Track message being edited
  const [replyingToMessage, setReplyingToMessage] = useState(null); // Track replied message
  const messagesEndRef = useRef(null);
  const router = useRouter();
  const { theme } = useContext(ThemeContext); // Get theme from context

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

  // Send a new message or save an edited message
  const sendMessage = async () => {
    if (newMessage.trim() === "" && !file) return;

    if (editingMessageId) {
      // Save edited message
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
        toast.success("Message updated successfully!"); // Show success toast
      } catch (error) {
        console.error("Error updating message:", error);
        toast.error("Failed to update message."); // Show error toast
      }
    } else {
      // Send new message
      const newMessageObj = {
        ownerEmail: userEmail,
        text: newMessage,
        sender: "owner",
        from: auth.currentUser?.displayName || userEmail,
        show: true,
        timestamp: new Date(),
        status: "sending",
        replyTo: replyingToMessage ? replyingToMessage.id : null, // Add replyTo field
      };

      setMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setNewMessage("");
      setFile(null);
      setReplyingToMessage(null); // Clear replied message
      scrollToBottom();

      try {
        const docRef = await addDoc(collection(db, "messages"), {
          ownerEmail: userEmail,
          text: newMessage,
          sender: "owner",
          from: auth.currentUser?.displayName || userEmail,
          show: false,
          timestamp: serverTimestamp(),
          status: "sending",
          replyTo: replyingToMessage ? replyingToMessage.id : null, // Add replyTo field
        });

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.text === newMessageObj.text && msg.status === "sending"
              ? { ...msg, id: docRef.id, status: "delivered" }
              : msg
          )
        );
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.text === newMessageObj.text && msg.status === "sending"
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

  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Handle double-click or right-click to show action card
  const handleMessageAction = (message, e) => {
    if (message.sender === "owner") {
      e.preventDefault(); // Prevent default context menu
      setSelectedMessage(message);
      setShowActionCard(true);

      // Calculate position for the action card
      const messageElement = e.currentTarget;
      const rect = messageElement.getBoundingClientRect();
      setActionCardPosition({
        top: rect.top + window.scrollY,
        left: rect.left - 200, // Position to the left of the message
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
          toast.success("Message deleted successfully!"); // Show success toast
        } catch (error) {
          console.error("Error deleting message:", error);
          toast.error("Failed to delete message."); // Show error toast
        }
      }
    }
  };

  // Handle edit message
  const handleEditMessage = () => {
    if (selectedMessage) {
      setEditingMessageId(selectedMessage.id);
      setNewMessage(selectedMessage.text); // Prefill input field
      setReplyingToMessage(null); // Clear reply if any
      setShowActionCard(false);
    }
  };

  // Handle copy message
  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        toast.success("Message copied to clipboard!"); // Show success toast
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
        toast.success("Message pinned to the top!"); // Show success toast
        setShowActionCard(false);
      } catch (error) {
        console.error("Error pinning message:", error);
        toast.error("Failed to pin message."); // Show error toast
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

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${theme === "light" ? "bg-gradient-to-r from-indigo-100 via-purple-200 to-pink-100" : "bg-gray-900"}`}>
        <PacmanLoader color={theme === "light" ? "#6D28D9" : "#FFFFFF"} size={30} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${theme === "light" ? "bg-gradient-to-r from-indigo-100 via-purple-200 to-pink-100" : "bg-gray-900"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 ${theme === "light" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gray-800"} text-white shadow-md`}>
        <button onClick={() => router.push("/dashboard")} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-semibold">Messages</h2>
        <div className="w-10"></div> {/* Placeholder for alignment */}
      </div>

      {/* Chat Messages Grid */}
      <div className={`flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar ${theme === "light" ? "bg-white" : "bg-gray-900"}`}>
        <div className="grid gap-4">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`grid ${msg.sender === "owner" ? "justify-self-end" : "justify-self-start"}`}
                onDoubleClick={(e) => handleMessageAction(msg, e)}
                onContextMenu={(e) => handleMessageAction(msg, e)}
                style={{ cursor: msg.sender === "owner" ? "pointer" : "default" }}
              >
                <div
                  className={`max-w-lg p-4 rounded-lg ${
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
                  {msg.sender === "owner" && (
                    <p className="text-xs mt-1 text-right">
                      {msg.status === "sending"
                        ? "Sending..."
                        : msg.status === "delivered"
                        ? "Delivered"
                        : "Failed"}
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
        </div>
      )}

      {/* Input Field with Reply Preview */}
      <div className={`p-4 ${theme === "light" ? "bg-gradient-to-r from-blue-100 via-blue-200 to-blue-300" : "bg-gray-800"} flex flex-col shadow-md space-y-2 rounded-lg`}>
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
      />
    </div>
  );
}