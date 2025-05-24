"use client";

import { useState, useEffect, useRef, useContext } from "react";
import { useRouter } from "next/navigation";
import { auth, db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDocs, writeBatch } from "../../firebaseconfig";
import { ArrowLeft, Send, Paperclip, Trash2, Edit, Copy, Reply, Pin, X, Smile, FileText, Download } from "lucide-react";
import { PacmanLoader, ClipLoader } from "react-spinners";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeContext } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";

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
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === "number") {
      date = new Date(timestamp);
    } else {
      return "";
    }

    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    } else if (diffInDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: true });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    }
  };

  // Fetch user authentication and role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", { method: "GET", credentials: "include" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Unauthorized access. Please log in.";
          toast.error(errorMessage, { position: "bottom-right", autoClose: 3000, theme: theme });
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.email && data.role) {
          setUserEmail(data.email);
          setUserRole(data.role);
          setIsAuthenticated(true);
          if (data.role !== "owner") {
            toast.error("User is not an owner.", { position: "bottom-right", autoClose: 3000, theme: theme });
            throw new Error("User is not an owner.");
          }
        } else {
          toast.error("No email or role found.", { position: "bottom-right", autoClose: 3000, theme: theme });
          throw new Error("No email or role found");
        }
      } catch (error) {
        setTimeout(() => router.replace("/login"), 3500);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router, theme]);

  // Fetch messages from Firestore
  useEffect(() => {
    if (!userEmail || !isAuthenticated || userRole !== "owner") return;

    const q = query(
      collection(db, "messages"),
      where("ownerEmail", "==", userEmail),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp,
      }));
      setMessages(messagesData);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [userEmail, isAuthenticated, userRole]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Update all messages' show field to false when the last message is read
  const markAllMessagesAsRead = async () => {
    if (messages.length === 0) return;

    try {
      const q = query(
        collection(db, "messages"),
        where("ownerEmail", "==", userEmail),
        where("show", "==", true)
      );
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { show: false });
      });
      await batch.commit();
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.show ? { ...msg, show: false } : msg))
      );
      toast.success("All messages marked as read!", { position: "bottom-right", autoClose: 3000, theme: theme });
    } catch (error) {
      toast.error("Failed to mark messages as read.", { position: "bottom-right", autoClose: 3000, theme: theme });
    }
  };

  // Observe the last message to detect when it's visible
  useEffect(() => {
    if (!messagesEndRef.current || messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.sender === "admin" && lastMessage.show) {
            markAllMessagesAsRead();
          }
        }
      },
      { threshold: 1.0, rootMargin: "0px" } // Trigger when fully visible
    );

    observer.observe(messagesEndRef.current);
    return () => observer.disconnect();
  }, [messages, userEmail]);

  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "video/mpeg", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only images, videos, or PDFs are allowed.", { position: "bottom-right", autoClose: 3000, theme: theme });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB.", { position: "bottom-right", autoClose: 3000, theme: theme });
      return;
    }

    setFile(selectedFile);
    
    // Generate preview for PDF
    if (selectedFile.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPdfPreview({
          name: selectedFile.name,
          size: (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB",
          url: e.target.result
        });
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPdfPreview(null);
    }
    
    toast.info(`File selected: ${selectedFile.name}`, { position: "bottom-right", autoClose: 3000, theme: theme });
  };

  // Upload file to Cloudinary
  const uploadFileToCloudinary = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    const endpoint = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${
      file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "raw"
    }/upload`;

    try {
      const response = await fetch(endpoint, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message || "File upload failed");
      }
      return { url: data.secure_url, type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "pdf" };
    } catch (error) {
      toast.error(`Failed to upload ${file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "PDF"}.`, {
        position: "bottom-right",
        autoClose: 3000,
        theme: theme,
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Send or edit message
  const sendMessage = async () => {
    if (newMessage.trim() === "" && !file) return;

    if (editingMessageId) {
      try {
        await updateDoc(doc(db, "messages", editingMessageId), { text: newMessage });
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg.id === editingMessageId ? { ...msg, text: newMessage } : msg))
        );
        setEditingMessageId(null);
        setNewMessage("");
        toast.success("Message updated successfully!", { position: "bottom-right", autoClose: 3000, theme: theme });
      } catch (error) {
        toast.error("Failed to update message.", { position: "bottom-right", autoClose: 3000, theme: theme });
      }
    } else {
      const tempId = Date.now().toString();
      let fileUrl = null;
      let fileType = null;

      if (file) {
        try {
          const uploadResult = await uploadFileToCloudinary(file);
          fileUrl = uploadResult.url;
          fileType = uploadResult.type;
        } catch (error) {
          return;
        }
      }

      const newMessageObj = {
        ownerEmail: userEmail,
        text: newMessage,
        sender: "owner",
        from: auth.currentUser?.displayName || userEmail,
        show: false,
        timestamp: new Date(),
        status: "sending",
        replyTo: replyingToMessage ? replyingToMessage.id : null,
        fileUrl,
        fileType,
        fileName: file?.name || null,
        fileSize: file?.size ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : null,
        tempId,
      };

      setMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setNewMessage("");
      setFile(null);
      setPdfPreview(null);
      setReplyingToMessage(null);
      scrollToBottom();

      setVisibleStatuses((prev) => ({ ...prev, [tempId]: true }));
      setTimeout(() => {
        setVisibleStatuses((prev) => ({ ...prev, [tempId]: false }));
      }, 3000);

      try {
        const docRef = await addDoc(collection(db, "messages"), {
          ownerEmail: userEmail,
          text: newMessage,
          sender: "owner",
          from: auth.currentUser?.displayName || userEmail,
          show: false,
          timestamp: serverTimestamp(),
          status: "delivered",
          replyTo: replyingToMessage ? replyingToMessage.id : null,
          fileUrl,
          fileType,
          fileName: file?.name || null,
          fileSize: file?.size ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : null,
        });

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.tempId === tempId ? { ...msg, id: docRef.id, status: "delivered", tempId: undefined } : msg
          )
        );
      } catch (error) {
        toast.error("Failed to send message.", { position: "bottom-right", autoClose: 3000, theme: theme });
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg.tempId === tempId ? { ...msg, status: "failed" } : msg))
        );
      }
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && (newMessage.trim() !== "" || file)) {
      e.preventDefault();
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
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = viewportWidth < 640 ? 160 : 192;
    const cardHeight = 200;

    let top = rect.top + window.scrollY;
    let left;

    if (top + cardHeight > viewportHeight) {
      top = rect.bottom + window.scrollY - cardHeight;
    }
    top = Math.max(10, Math.min(top, viewportHeight - cardHeight - 10));

    if (message.sender === "owner") {
      left = rect.left - cardWidth - 10;
      if (left < 10) {
        left = rect.right + 10;
      }
    } else {
      left = rect.right + 10;
      if (left + cardWidth > viewportWidth) {
        left = rect.left - cardWidth - 10;
      }
    }
    left = Math.max(10, Math.min(left, viewportWidth - cardWidth - 10));

    setActionCardPosition({ top, left });
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
          toast.success("Message deleted successfully!", { position: "bottom-right", autoClose: 3000, theme: theme });
        } catch (error) {
          toast.error("Failed to delete message.", { position: "bottom-right", autoClose: 3000, theme: theme });
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
      inputRef.current?.focus();
    }
  };

  // Handle copy message
  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        toast.success("Message copied to clipboard!", { position: "bottom-right", autoClose: 3000, theme: theme });
      });
      setShowActionCard(false);
    }
  };

  // Handle reply message
  const handleReplyMessage = () => {
    if (selectedMessage) {
      setReplyingToMessage(selectedMessage);
      setShowActionCard(false);
      inputRef.current?.focus();
    }
  };

  // Handle pin message
  const handlePinMessage = async () => {
    if (selectedMessage) {
      try {
        await updateDoc(doc(db, "messages", selectedMessage.id), { pinned: true });
        toast.success("Message pinned to the top!", { position: "bottom-right", autoClose: 3000, theme: theme });
        setShowActionCard(false);
      } catch (error) {
        toast.error("Failed to pin message.", { position: "bottom-right", autoClose: 3000, theme: theme });
      }
    }
  };

  // Close action card when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionCard && !e.target.closest(".action-card") && !e.target.closest(".emoji-picker")) {
        setShowActionCard(false);
      }
      if (showEmojiPicker && !e.target.closest(".emoji-picker") && !e.target.closest(".emoji-button")) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionCard, showEmojiPicker]);

  // Loading state
  if (isLoading || !isAuthenticated || userRole !== "owner") {
    return (
      <div className={`flex items-center justify-center min-h-screen w-full ${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-900 to-indigo-900"}`}>
        <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <PacmanLoader color={theme === "light" ? "#6D28D9" : "#A78BFA"} size={40} />
          <motion.p className={`mt-6 text-xl sm:text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-200"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
            Loading your messages...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Render PDF preview component
  const renderPdfPreview = () => (
    <motion.div 
      className={`mt-2 p-3 ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} rounded-lg flex items-start space-x-3 w-full`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`p-2 rounded-lg ${theme === "light" ? "bg-blue-100" : "bg-blue-900/30"}`}>
        <FileText size={24} className={theme === "light" ? "text-blue-600" : "text-blue-400"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}>
          {pdfPreview.name}
        </p>
        <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
          {pdfPreview.size}
        </p>
      </div>
      <button 
        onClick={() => {
          setFile(null);
          setPdfPreview(null);
        }} 
        className={`p-1 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-600"} transition-colors`}
        aria-label="Remove file"
      >
        <X size={16} />
      </button>
    </motion.div>
  );

  // Render PDF message component
  const renderPdfMessage = (msg) => (
    <div className={`p-3 rounded-lg ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} flex items-start space-x-3 w-full`}>
      <div className={`p-2 rounded-lg ${theme === "light" ? "bg-blue-100" : "bg-blue-900/30"}`}>
        <FileText size={24} className={theme === "light" ? "text-blue-600" : "text-blue-400"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}>
          {msg.fileName}
        </p>
        <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
          {msg.fileSize}
        </p>
        <a 
          href={msg.fileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`inline-flex items-center mt-2 text-sm ${theme === "light" ? "text-blue-600 hover:text-blue-800" : "text-blue-400 hover:text-blue-300"}`}
          download
        >
          <Download size={16} className="mr-1" />
          Download PDF
        </a>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen w-full max-w-full overflow-x-hidden ${theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-900 to-indigo-900"} font-sans`}>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme={theme} toastClassName={`rounded-xl shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"}`} />
      
      {/* Header */}
      <motion.header className={`sticky top-0 z-10 flex items-center justify-between px-3 sm:px-4 py-3 w-full ${theme === "light" ? "bg-white/90 backdrop-blur-md" : "bg-gray-800/90 backdrop-blur-md"} shadow-sm`} initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}>
        <button onClick={() => router.push("/dashboard")} className={`p-2 rounded-full ${theme === "light" ? "text-gray-700 hover:bg-gray-100" : "text-gray-200 hover:bg-gray-700"} transition-colors`} aria-label="Back to dashboard">
          <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
        </button>
        <h2 className={`text-lg sm:text-xl font-bold ${theme === "light" ? "text-gray-800" : "text-white"}`}>Messages</h2>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
          {userEmail?.charAt(0).toUpperCase() || "U"}
        </div>
      </motion.header>

      {/* Chat Messages */}
      <div className="flex-grow px-3 sm:px-4 py-4 overflow-y-auto custom-scrollbar w-full">
        <AnimatePresence>
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <motion.div
                key={msg.id || msg.tempId}
                className={`flex ${msg.sender === "owner" ? "justify-end" : "justify-start"} mb-3 sm:mb-4 w-full ${msg.show && msg.sender === "admin" ? "bg-blue-100/50" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                onClick={window.innerWidth < 640 ? (e) => handleMessageAction(msg, e) : undefined}
                onDoubleClick={window.innerWidth >= 640 ? (e) => handleMessageAction(msg, e) : undefined}
                onContextMenu={(e) => handleMessageAction(msg, e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleMessageAction(msg, e)}
              >
                <div className={`max-w-[85%] sm:max-w-[60%] min-w-[40%] flex flex-col ${msg.sender === "owner" ? "items-end" : "items-start"}`}>
                  <div className={`p-3 sm:p-4 rounded-2xl shadow-md relative ${msg.sender === "owner" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" : theme === "light" ? "bg-gray-200 text-gray-800" : "bg-gray-700 text-gray-200"} ${msg.pinned ? "border-l-4 border-yellow-400" : ""}`} aria-label={`Message from ${msg.from}: ${msg.text}`}>
                    {msg.replyTo && (
                      <div className={`text-xs sm:text-sm italic mb-2 ${theme === "light" ? "text-gray-600" : "text-gray-400"} bg-opacity-50 p-2 rounded-lg ${theme === "light" ? "bg-gray-300" : "bg-gray-600"}`}>
                        Replying to: {messages.find((m) => m.id === msg.replyTo)?.text?.slice(0, 50) || "Message"}...
                      </div>
                    )}
                    {msg.fileUrl && msg.fileType === "pdf" ? (
                      renderPdfMessage(msg)
                    ) : msg.fileUrl && (
                      <div className="mb-2">
                        {msg.fileType === "image" ? (
                          <img src={msg.fileUrl} alt="Uploaded image" className="max-w-full h-auto rounded-lg shadow-sm" />
                        ) : msg.fileType === "video" ? (
                          <video controls className="max-w-full h-auto rounded-lg shadow-sm">
                            <source src={msg.fileUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : null}
                      </div>
                    )}
                    {msg.text && <p className="text-sm sm:text-base leading-relaxed">{msg.text}</p>}
                  </div>
                  <div className={`flex items-center mt-1 sm:mt-2 space-x-2 ${msg.sender === "owner" ? "justify-end" : "justify-start"}`}>
                    <span className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>{formatTimestamp(msg.timestamp)}</span>
                    {msg.sender === "owner" && visibleStatuses[msg.id || msg.tempId] && (
                      <span className={`text-xs flex items-center space-x-1 ${msg.status === "sending" ? "text-yellow-400" : msg.status === "delivered" ? "text-green-400" : "text-red-400"}`}>
                        {msg.status === "sending" ? (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                          </svg>
                        ) : msg.status === "delivered" ? (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span>{msg.status === "sending" ? "Sending" : msg.status === "delivered" ? "Delivered" : "Failed"}</span>
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div className="flex flex-col items-center justify-center h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <svg className={`w-12 sm:w-16 h-12 sm:h-16 ${theme === "light" ? "text-gray-400" : "text-gray-500"} mb-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className={`text-base sm:text-lg ${theme === "light" ? "text-gray-500" : "text-gray-400"} text-center`}>No messages yet. Start the conversation!</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Action Card */}
      <AnimatePresence>
        {showActionCard && (
          <>
            <motion.div className="fixed inset-0 bg-black/20 z-40 sm:bg-transparent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setShowActionCard(false)} />
            <motion.div className={`absolute action-card ${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-xl shadow-xl p-3 w-40 sm:w-48 z-50 backdrop-blur-sm border ${theme === "light" ? "border-gray-200" : "border-gray-700"}`} style={{ top: actionCardPosition.top, left: actionCardPosition.left }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
              {selectedMessage?.sender === "owner" ? (
                <>
                  <button onClick={handleDeleteMessage} className={`flex items-center space-x-2 p-2 rounded-lg w-full text-left ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} transition-colors text-sm`}>
                    <Trash2 size={16} className="text-red-500" />
                    <span>Delete</span>
                  </button>
                  <button onClick={handleEditMessage} className={`flex items-center space-x-2 p-2 rounded-lg w-full text-left ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} transition-colors text-sm`}>
                    <Edit size={16} className="text-blue-500" />
                    <span>Edit</span>
                  </button>
                  <button onClick={handleCopyMessage} className={`flex items-center space-x-2 p-2 rounded-lg w-full text-left ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} transition-colors text-sm`}>
                    <Copy size={16} className="text-green-500" />
                    <span>Copy</span>
                  </button>
                  <button onClick={handleReplyMessage} className={`flex items-center space-x-2 p-2 rounded-lg w-full text-left ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} transition-colors text-sm`}>
                    <Reply size={16} className="text-purple-500" />
                    <span>Reply</span>
                  </button>
                  <button onClick={handlePinMessage} className={`flex items-center space-x-2 p-2 rounded-lg w-full text-left ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} transition-colors text-sm`}>
                    <Pin size={16} className="text-yellow-500" />
                    <span>Pin</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleCopyMessage} className={`flex items-center space-x-2 p-2 rounded-lg w-full text-left ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} transition-colors text-sm`}>
                    <Copy size={16} className="text-green-500" />
                    <span>Copy</span>
                  </button>
                  <button onClick={handleReplyMessage} className={`flex items-center space-x-2 p-2 rounded-lg w-full text-left ${theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"} transition-colors text-sm`}>
                    <Reply size={16} className="text-purple-500" />
                    <span>Reply</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input Field */}
      <motion.div className={`sticky bottom-0 px-3 sm:px-4 py-3 ${theme === "light" ? "bg-white/90 backdrop-blur-md" : "bg-gray-800/90 backdrop-blur-md"} shadow-t-md w-full`} initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}>
        <AnimatePresence>
          {replyingToMessage && (
            <motion.div className={`flex items-center justify-between p-2 sm:p-3 mb-2 ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} rounded-xl w-full`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
              <div className={`text-xs sm:text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"} truncate max-w-[80%]`}>
                Replying to: {replyingToMessage.text.slice(0, 50)}{replyingToMessage.text.length > 50 ? "..." : ""}
              </div>
              <button onClick={() => setReplyingToMessage(null)} className={`p-1 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-600"} transition-colors`} aria-label="Cancel reply">
                <X size={16} />
              </button>
            </motion.div>
          )}
          {showEmojiPicker && (
            <motion.div className="absolute bottom-16 left-0 right-0 z-50 emoji-picker" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
              <EmojiPicker onEmojiClick={handleEmojiClick} theme={theme === "light" ? "light" : "dark"} />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center space-x-2 sm:space-x-3 w-full">
          <label htmlFor="file-upload" className="cursor-pointer">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`p-2 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-100" : "text-gray-300 hover:bg-gray-700"} transition-colors ${uploading ? "opacity-50" : ""}`}>
              {uploading ? <ClipLoader color={theme === "light" ? "#6D28D9" : "#A78BFA"} size={18} /> : <Paperclip size={18} className="sm:w-5 sm:h-5" />}
            </motion.div>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/jpeg,image/png,video/mp4,video/mpeg,application/pdf" disabled={uploading} />
          </label>
          <button className={`emoji-button p-2 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-100" : "text-gray-300 hover:bg-gray-700"} transition-colors`} onClick={() => setShowEmojiPicker(!showEmojiPicker)} aria-label="Toggle emoji picker">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Smile size={18} className="sm:w-5 sm:h-5" />
            </motion.div>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
            className={`flex-grow p-2 sm:p-3 border rounded-xl text-sm sm:text-base ${theme === "light" ? "bg-white border-gray-300 text-gray-800" : "bg-gray-700 border-gray-600 text-gray-200"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full`}
            aria-label={editingMessageId ? "Edit message" : "New message"}
            disabled={uploading}
          />
          <motion.button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !file) || uploading}
            className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl text-white transition-colors ${
              (newMessage.trim() || file) && !uploading
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            whileHover={{ scale: (newMessage.trim() || file) && !uploading ? 1.05 : 1 }}
            whileTap={{ scale: (newMessage.trim() || file) && !uploading ? 0.95 : 1 }}
            aria-label="Send message"
          >
            <Send size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm">{editingMessageId ? "Save" : "Send"}</span>
          </motion.button>
        </div>
        {pdfPreview && renderPdfPreview()}
        {file && !pdfPreview && (
          <motion.div className={`mt-2 p-2 ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} rounded-lg flex items-center justify-between w-full`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <span className={`text-xs sm:text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"} truncate max-w-[70%]`}>{file.name}</span>
            <button onClick={() => setFile(null)} className={`p-1 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-600"} transition-colors`} aria-label="Remove file">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}