"use client";

import { useEffect, useState, useRef, useContext, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase-client";
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
  getDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaPaperPlane, FaReply, FaShare, FaTimes, FaCheck, FaCheckDouble } from "react-icons/fa";
import { Trash2, Edit, Copy, Paperclip, Smile } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeContext } from "../../context/ThemeContext";
import { ClipLoader } from "react-spinners";
import EmojiPicker from "emoji-picker-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const messageEndRef = useRef(null);
  const actionCardRef = useRef(null);
  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const router = useRouter();

  // Format timestamp
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp?.toDate) return "Unknown time";
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      } else if (diffInDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
      } else if (diffInDays < 7) {
        return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: true });
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
      }
    } catch (error) {
      return "Invalid timestamp";
    }
  }, []);

  // Fetch user authentication
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/validate", { method: "GET", credentials: "include" });
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
  const fetchOwnerData = useCallback(async (email) => {
    try {
      const ownerDoc = await getDoc(doc(db, "owners", email));
      if (ownerDoc.exists()) {
        const data = ownerDoc.data();
        return {
          email,
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim() || email,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        };
      }
      return { email, fullName: email, firstName: "", lastName: "" };
    } catch (error) {
      console.error("Error fetching owner info:", error);
      return { email, fullName: email, firstName: "", lastName: "" };
    }
  }, []);

  // Update owner data
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
  }, [groupedMessages, fetchOwnerData]);

  // Fetch messages
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

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (ownerEmail) => {
    if (!ownerEmail) return;

    try {
      const q = query(
        collection(db, "messages"),
        where("ownerEmail", "==", ownerEmail),
        where("show", "==", false)
      );
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { show: true });
      });
      
      await batch.commit();

      setSelectedMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.show ? msg : { ...msg, show: true }))
      );
      
      setNewMessageCounts((prev) => ({
        ...prev,
        [ownerEmail]: 0,
      }));

      toast.success("Messages marked as read!", { 
        position: "bottom-right", 
        autoClose: 2000, 
        theme,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      toast.error("Failed to mark messages as read.", { 
        position: "bottom-right", 
        autoClose: 3000, 
        theme,
      });
    }
  }, [theme]);

  // Observe last message
  useEffect(() => {
    if (!messageEndRef.current || selectedMessages.length === 0 || !selectedOwnerEmail) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const lastMessage = selectedMessages[selectedMessages.length - 1];
          if (lastMessage.sender === "owner" && !lastMessage.show) {
            markMessagesAsRead(selectedOwnerEmail);
          }
        }
      },
      { threshold: 1.0, rootMargin: "0px" }
    );

    observer.observe(messageEndRef.current);
    return () => observer.disconnect();
  }, [selectedMessages, selectedOwnerEmail, markMessagesAsRead]);

  // Handle file change
  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "video/mpeg", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only images, videos, or PDFs are allowed.", { 
        position: "bottom-right", 
        autoClose: 3000, 
        theme,
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB.", { 
        position: "bottom-right", 
        autoClose: 3000, 
        theme,
      });
      return;
    }

    setFile(selectedFile);
    toast.info(`File selected: ${selectedFile.name}`, { 
      position: "bottom-right", 
      autoClose: 3000, 
      theme,
    });
  }, [theme]);

  // Upload file to Cloudinary
  const uploadFileToCloudinary = useCallback(async (file, retries = 2) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    const endpoint = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${
      file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "raw"
    }/upload`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(endpoint, { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok || !data.secure_url) {
          throw new Error(data.error?.message || "File upload failed");
        }
        return { url: data.secure_url, type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "pdf" };
      } catch (error) {
        if (attempt === retries) {
          toast.error(`Failed to upload ${file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "PDF"} after ${retries} attempts.`, {
            position: "bottom-right",
            autoClose: 3000,
            theme,
          });
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }, [theme]);

  // Handle emoji selection
  const handleEmojiClick = useCallback((emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  // Handle owner click
  const handleOwnerClick = useCallback(async (email) => {
    setSelectedOwnerEmail(email);
    setReplyingTo(null);
    setFile(null);
    setShowEmojiPicker(false);
    setShowPdfModal(false);
    setPdfUrl(null);
    setPageNumber(1);
    setScale(1.0);
    const selectedMsgs = groupedMessages[email] || [];
    setSelectedMessages(selectedMsgs);

    const ownerInfo = await fetchOwnerData(email);
    setSelectedOwnerInfo(ownerInfo);

    await markMessagesAsRead(email);
  }, [groupedMessages, fetchOwnerData, markMessagesAsRead]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (message.trim() === "" && !file) return;
    if (!selectedOwnerEmail) {
      toast.error("Select a chat to send a message.", { 
        position: "bottom-right", 
        autoClose: 3000, 
        theme,
      });
      return;
    }

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

    try {
      const newMessage = {
        ownerEmail: selectedOwnerEmail,
        sender: "admin",
        show: true,
        text: message,
        timestamp: serverTimestamp(),
        status: "sending",
        ...(replyingTo && { replyTo: replyingTo.id }),
        ...(fileUrl && { fileUrl, fileType }),
      };

      const docRef = await addDoc(collection(db, "messages"), newMessage);
      setSelectedMessages((prevMessages) => [...prevMessages, { ...newMessage, id: docRef.id }]);
      setMessage("");
      setFile(null);
      setReplyingTo(null);

      setTimeout(async () => {
        try {
          await updateDoc(doc(db, "messages", docRef.id), { status: "delivered" });
          setSelectedMessages((prev) =>
            prev.map((m) => (m.id === docRef.id ? { ...m, status: "delivered" } : m))
          );
        } catch (error) {
          await updateDoc(doc(db, "messages", docRef.id), { status: "failed" });
          setSelectedMessages((prev) =>
            prev.map((m) => (m.id === docRef.id ? { ...m, status: "failed" } : m))
          );
        }
      }, 1000);

      toast.success("Message sent successfully!", { 
        position: "bottom-right", 
        autoClose: 2000, 
        theme,
      });
    } catch (error) {
      console.error("Error sending message: ", error);
      toast.error("Failed to send message.", { 
        position: "bottom-right", 
        autoClose: 3000, 
        theme,
      });
    } finally {
      setUploading(false);
    }
  }, [message, file, selectedOwnerEmail, replyingTo, theme, uploadFileToCloudinary]);

  // Handle message action
  const handleMessageAction = useCallback((message, e) => {
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
  }, []);

  // Delete message
  const handleDeleteMessage = useCallback(async () => {
    if (selectedMessage) {
      const confirmDelete = window.confirm("Are you sure you want to delete this message?");
      if (confirmDelete) {
        try {
          await deleteDoc(doc(db, "messages", selectedMessage.id));
          setSelectedMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== selectedMessage.id));
          setShowActionCard(false);
          toast.success("Message deleted successfully!", { 
            position: "bottom-right", 
            autoClose: 2000, 
            theme,
          });
        } catch (error) {
          console.error("Error deleting message:", error);
          toast.error("Failed to delete message.", { 
            position: "bottom-right", 
            autoClose: 3000, 
            theme,
          });
        }
      }
    }
  }, [selectedMessage, theme]);

  // Edit message
  const handleEditMessage = useCallback(() => {
    if (selectedMessage) {
      setMessage(selectedMessage.text);
      setShowActionCard(false);
      inputRef.current?.focus();
    }
  }, [selectedMessage]);

  // Copy message
  const handleCopyMessage = useCallback(() => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        toast.success("Message copied to clipboard!", { 
          position: "bottom-right", 
          autoClose: 2000, 
          theme,
        });
      });
      setShowActionCard(false);
    }
  }, [selectedMessage, theme]);

  // Reply to message
  const handleReplyMessage = useCallback(() => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      setShowActionCard(false);
      inputRef.current?.focus();
    }
  }, [selectedMessage]);

  // Forward message
  const handleForwardMessage = useCallback(() => {
    if (selectedMessage) {
      setForwardingMessage(selectedMessage);
      setShowForwardModal(true);
      setShowActionCard(false);
    }
  }, [selectedMessage]);

  // Execute forward
  const executeForwardMessage = useCallback(async (recipientEmail) => {
    if (!forwardingMessage || !recipientEmail) return;

    let fileUrl = forwardingMessage.fileUrl || null;
    let fileType = forwardingMessage.fileType || null;

    try {
      const newMessage = {
        ownerEmail: recipientEmail,
        sender: "admin",
        show: true,
        text: forwardingMessage.text,
        timestamp: serverTimestamp(),
        isForwarded: true,
        originalSender: forwardingMessage.sender === "admin" ? "You" : ownerData[forwardingMessage.ownerEmail]?.fullName || forwardingMessage.ownerEmail,
        ...(fileUrl && { fileUrl, fileType }),
      };

      await addDoc(collection(db, "messages"), newMessage);
      setShowForwardModal(false);
      setForwardingMessage(null);
      toast.success(`Message forwarded to ${ownerData[recipientEmail]?.fullName || recipientEmail}`, {
        position: "bottom-right",
        autoClose: 2000,
        theme,
      });
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast.error("Failed to forward message.", { 
        position: "bottom-right", 
        autoClose: 3000, 
        theme,
      });
    }
  }, [forwardingMessage, ownerData, theme]);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Cancel forward
  const cancelForward = useCallback(() => {
    setForwardingMessage(null);
    setShowForwardModal(false);
  }, []);

  // Handle PDF modal
  const openPdfModal = useCallback((url) => {
    setPdfUrl(url);
    setShowPdfModal(true);
    setPageNumber(1);
    setScale(1.0);
  }, []);

  const closePdfModal = useCallback(() => {
    setShowPdfModal(false);
    setPdfUrl(null);
    setNumPages(null);
    setPageNumber(1);
    setScale(1.0);
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
  }, []);

  // Close action card, emoji picker, and PDF modal on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showActionCard &&
        actionCardRef.current &&
        !actionCardRef.current.contains(e.target) &&
        !e.target.closest(".message-content")
      ) {
        setShowActionCard(false);
      }
      if (
        showEmojiPicker &&
        !e.target.closest(".emoji-picker") &&
        !e.target.closest(".emoji-button")
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionCard, showEmojiPicker]);

  // Scroll to bottom
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedMessages, replyingTo]);

  // Prevent context menu and handle mouse events
  useEffect(() => {
    const preventContextMenu = (e) => {
      e.preventDefault();
    };

    const handleMouseDown = (e) => {
      if (e.button !== 0) {
        e.preventDefault();
        return false;
      }
    };

    const chatArea = chatAreaRef.current;
    if (chatArea) {
      chatArea.addEventListener("contextmenu", preventContextMenu);
      chatArea.addEventListener("mousedown", handleMouseDown);
    }

    return () => {
      if (chatArea) {
        chatArea.removeEventListener("contextmenu", preventContextMenu);
        chatArea.removeEventListener("mousedown", handleMouseDown);
      }
    };
  }, []);

  // Filter grouped messages for search
  const filteredGroupedMessages = useMemo(() => {
    return Object.entries(groupedMessages).filter(([ownerEmail, _]) =>
      (ownerData[ownerEmail]?.fullName || ownerEmail).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groupedMessages, ownerData, searchQuery]);

  // Get last message preview
  const getLastMessage = useCallback((messages) => {
    if (messages.length === 0) return "No messages";
    const lastMessage = messages[messages.length - 1];
    const text = lastMessage.fileUrl
      ? lastMessage.fileType === "image"
        ? "Image"
        : lastMessage.fileType === "video"
        ? "Video"
        : "PDF"
      : lastMessage.text;
    return text.length > 30 ? `${text.substring(0, 30)}...` : text;
  }, []);

  // Get display name
  const getDisplayName = useCallback((email) => {
    return ownerData[email]?.fullName || email;
  }, [ownerData]);

  // Message status component
  const MessageStatus = useCallback(({ status }) => {
    if (status === "sending") {
      return <span className="text-xs text-yellow-500">Sending...</span>;
    } else if (status === "delivered") {
      return <FaCheck className="text-xs text-blue-500" />;
    } else if (status === "read") {
      return <FaCheckDouble className="text-xs text-green-500" />;
    } else if (status === "failed") {
      return <span className="text-xs text-red-500">✗ Failed</span>;
    }
    return null;
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
        <motion.div className="flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <ClipLoader color={theme === "light" ? "#6D28D9" : "#A78BFA"} size={40} />
          <p className={`mt-4 text-lg ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}>Loading chats...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${theme === "light" ? "bg-gradient-to-r from-indigo-100 to-pink-100" : "bg-gradient-to-r from-gray-800 to-gray-900"} overflow-hidden`}>
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
        theme={theme}
        toastClassName={`rounded-xl shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"}`}
      />

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
              aria-label="Search chats"
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
                    <p className={`font-semibold ${theme === "light" ? "text-gray-800" : "text-white"}`}>{getDisplayName(ownerEmail)}</p>
                    {newMessages > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">{newMessages}</span>
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
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">{selectedOwnerInfo.firstName}</span>
                  )}
                  {selectedOwnerInfo.lastName && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">{selectedOwnerInfo.lastName}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3 flex flex-col custom-scrollbar">
              {selectedMessages.length > 0 ? (
                selectedMessages.map((msg, index) => (
                  <motion.div
                    key={`${msg.id}-${index}`}
                    className={`flex flex-col ${msg.sender === "admin" ? "items-end" : "items-start"} hover:bg-opacity-10 hover:bg-gray-500 transition-colors rounded-lg p-1 ${!msg.show && msg.sender === "owner" ? "bg-blue-100/50" : ""}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className="message-content"
                      onClick={(e) => handleMessageAction(msg, e)}
                      style={{ cursor: "pointer" }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleMessageAction(msg, e)}
                    >
                      {msg.replyTo && (
                        <div className={`mb-1 max-w-xs p-2 rounded-lg ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} text-xs opacity-80`}>
                          <p className="font-semibold">
                            {selectedMessages.find((m) => m.id === msg.replyTo)?.sender === "admin" ? "You" : getDisplayName(selectedOwnerEmail)}
                          </p>
                          <p className="truncate">{selectedMessages.find((m) => m.id === msg.replyTo)?.text || "Original message not found"}</p>
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
                        {msg.fileUrl && (
                          <div className="mb-2">
                            {msg.fileType === "image" ? (
                              <img 
                                src={msg.fileUrl} 
                                alt="Uploaded content" 
                                className="max-w-full h-auto rounded-lg shadow-sm object-cover max-h-64"
                                loading="lazy"
                              />
                            ) : msg.fileType === "video" ? (
                              <video controls className="max-w-full h-auto rounded-lg shadow-sm max-h-64">
                                <source src={msg.fileUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <button
                                onClick={() => openPdfModal(msg.fileUrl)}
                                className={`text-sm underline ${theme === "light" ? "text-blue-600 hover:text-blue-800" : "text-blue-400 hover:text-blue-300"}`}
                              >
                                View PDF
                              </button>
                            )}
                          </div>
                        )}
                        {msg.text && <p className="text-base">{msg.text}</p>}
                      </div>
                      <div
                        className={`flex items-center mt-1 space-x-2 ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <p className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>{formatTimestamp(msg.timestamp)}</p>
                        {msg.sender === "admin" && msg.status && <MessageStatus status={msg.status} />}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>No messages available</p>
                </div>
              )}
              <div ref={messageEndRef}></div>
            </div>

            {/* Reply preview */}
            {replyingTo && (
              <motion.div
                className={`mb-2 p-3 rounded-lg ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} flex justify-between items-center`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <p className="text-sm font-semibold">
                    Replying to {replyingTo.sender === "admin" ? "yourself" : getDisplayName(selectedOwnerEmail)}
                  </p>
                  <p className="text-sm truncate">{replyingTo.text}</p>
                </div>
                <button
                  onClick={cancelReply}
                  className={`p-1 rounded-full ${theme === "light" ? "hover:bg-gray-300" : "hover:bg-gray-600"}`}
                  aria-label="Cancel reply"
                >
                  <FaTimes className={theme === "light" ? "text-gray-600" : "text-gray-300"} />
                </button>
              </motion.div>
            )}

            {/* File preview */}
            {file && (
              <motion.div
                className={`mb-2 p-3 rounded-lg ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} flex justify-between items-center`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"} truncate max-w-[70%]`}>{file.name}</span>
                <button
                  onClick={() => setFile(null)}
                  className={`p-1 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-600"}`}
                  aria-label="Remove file"
                >
                  <FaTimes size={16} />
                </button>
              </motion.div>
            )}

            {/* Emoji picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  className="absolute bottom-16 left-4 sm:left-auto sm:right-4 z-50 emoji-picker max-w-[90vw] sm:max-w-[360px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <EmojiPicker onEmojiClick={handleEmojiClick} theme={theme === "light" ? "light" : "dark"} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area */}
            <div className="flex items-center space-x-2 mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-2 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-700"} ${uploading ? "opacity-50" : ""}`}
                >
                  {uploading ? <ClipLoader color={theme === "light" ? "#6D28D9" : "#A78BFA"} size={18} /> : <Paperclip size={18} />}
                </motion.div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,video/mp4,video/mpeg,application/pdf"
                  disabled={uploading}
                  aria-label="Upload file"
                />
              </label>
              <button
                className={`emoji-button p-2 rounded-full ${theme === "light" ? "text-gray-500 hover:bg-gray-200" : "text-gray-300 hover:bg-gray-700"}`}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                aria-label="Toggle emoji picker"
              >
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Smile size={18} />
                </motion.div>
              </button>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (message.trim() !== "" || file) && !uploading) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className={`flex-1 p-3 border ${theme === "light" ? "border-gray-300 bg-white text-gray-800" : "border-gray-600 bg-gray-700 text-white"} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                placeholder={replyingTo ? `Replying to ${replyingTo.sender === "admin" ? "yourself" : getDisplayName(selectedOwnerEmail)}...` : "Type a message..."}
                disabled={uploading}
                aria-label={replyingTo ? "Reply message" : "New message"}
              />
              <motion.button
                onClick={handleSendMessage}
                disabled={(!message.trim() && !file) || uploading}
                className={`p-3 rounded-lg transition-all ${
                  (message.trim() || file) && !uploading
                    ? theme === "light"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      : "bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700"
                    : theme === "light"
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gray-700 cursor-not-allowed"
                } text-white`}
                whileHover={{ scale: (message.trim() || file) && !uploading ? 1.05 : 1 }}
                whileTap={{ scale: (message.trim() || file) && !uploading ? 0.95 : 1 }}
                aria-label="Send message"
              >
                <FaPaperPlane size={20} />
              </motion.button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className={`${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>Select a chat to view messages</p>
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
          style={{ top: `${actionCardPosition.top}px`, left: `${actionCardPosition.left}px` }}
        >
          {selectedMessage?.sender === "admin" ? (
            <>
              <motion.button
                onClick={handleDeleteMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 size={16} className="text-red-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Delete</span>
              </motion.button>
              <motion.button
                onClick={handleEditMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Edit size={16} className="text-blue-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Edit</span>
              </motion.button>
              <motion.button
                onClick={handleReplyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaReply size={16} className="text-green-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Reply</span>
              </motion.button>
              <motion.button
                onClick={handleForwardMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaShare size={16} className="text-purple-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Forward</span>
              </motion.button>
              <motion.button
                onClick={handleCopyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Copy size={16} className="text-yellow-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Copy</span>
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                onClick={handleReplyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaReply size={16} className="text-green-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Reply</span>
              </motion.button>
              <motion.button
                onClick={handleForwardMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaShare size={16} className="text-purple-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Forward</span>
              </motion.button>
              <motion.button
                onClick={handleCopyMessage}
                className={`flex items-center space-x-2 p-2 rounded-md w-full text-left ${
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Copy size={16} className="text-yellow-500" />
                <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>Copy</span>
              </motion.button>
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
                aria-label="Close forward modal"
              >
                <FaTimes className={theme === "light" ? "text-gray-600" : "text-gray-300"} />
              </button>
              <h3 className={`text-xl font-bold mb-4 ${theme === "light" ? "text-gray-800" : "text-white"}`}>Forward Message</h3>
              <div className={`mb-4 p-3 rounded-lg ${theme === "light" ? "bg-gray-100" : "bg-gray-700"}`}>
                <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
                  Original message from {forwardingMessage?.sender === "admin" ? "You" : getDisplayName(forwardingMessage?.ownerEmail)}:
                </p>
                {forwardingMessage?.fileUrl && (
                  <div className="my-2">
                    {forwardingMessage.fileType === "image" ? (
                      <img 
                        src={forwardingMessage.fileUrl} 
                        alt="Forwarded content" 
                        className="max-w-full h-auto rounded-lg shadow-sm object-cover max-h-64"
                        loading="lazy"
                      />
                    ) : forwardingMessage.fileType === "video" ? (
                      <video controls className="max-w-full h-auto rounded-lg shadow-sm max-h-64">
                        <source src={forwardingMessage.fileUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <button
                        onClick={() => openPdfModal(forwardingMessage.fileUrl)}
                        className={`text-sm underline ${theme === "light" ? "text-blue-600 hover:text-blue-800" : "text-blue-400 hover:text-blue-300"}`}
                      >
                        View PDF
                      </button>
                    )}
                  </div>
                )}
                <p className={`mt-1 ${theme === "light" ? "text-gray-800" : "text-white"}`}>{forwardingMessage?.text}</p>
              </div>
              <h4 className={`text-lg font-semibold mb-3 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>Select recipient:</h4>
              <div className="max-h-60 overflow-y-auto custom-scrollbar mb-4">
                {Object.keys(groupedMessages).map((email) => (
                  <motion.div
                    key={email}
                    className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                      theme === "light" ? "hover:bg-gray-200" : "hover:bg-gray-700"
                    }`}
                    onClick={() => executeForwardMessage(email)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className={`font-medium ${theme === "light" ? "text-gray-800" : "text-white"}`}>{getDisplayName(email)}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {showPdfModal && pdfUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closePdfModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`relative ${theme === "light" ? "bg-white" : "bg-gray-800"} rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closePdfModal}
                className={`absolute top-4 right-4 p-1 rounded-full ${theme === "light" ? "hover:bg-gray-200" : "hover:bg-gray-700"}`}
                aria-label="Close PDF viewer"
              >
                <FaTimes className={theme === "light" ? "text-gray-600" : "text-gray-300"} />
              </button>
              <h3 className={`text-xl font-bold mb-4 ${theme === "light" ? "text-gray-800" : "text-white"}`}>PDF Viewer</h3>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                    disabled={pageNumber <= 1}
                    className={`p-2 rounded-md ${theme === "light" ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"} ${pageNumber <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                    Page {pageNumber} of {numPages || "?"}
                  </span>
                  <button
                    onClick={() => setPageNumber((prev) => Math.min(prev + 1, numPages || prev))}
                    disabled={pageNumber >= numPages}
                    className={`p-2 rounded-md ${theme === "light" ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"} ${pageNumber >= numPages ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
                    className={`p-2 rounded-md ${theme === "light" ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"}`}
                    aria-label="Zoom out"
                  >
                    -
                  </button>
                  <span className={`text-sm ${theme === "light" ? "text-gray-800" : "text-white"}`}>{Math.round(scale * 100)}%</span>
                  <button
                    onClick={() => setScale((prev) => Math.min(prev + 0.1, 2.0))}
                    className={`p-2 rounded-md ${theme === "light" ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"}`}
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                </div>
              </div>
              <div ref={pdfContainerRef} className="overflow-auto max-h-[70vh]">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => {
                    console.error("PDF load error:", error);
                    toast.error("Failed to load PDF.", { 
                      position: "bottom-right", 
                      autoClose: 3000, 
                      theme,
                    });
                    closePdfModal();
                  }}
                >
                  <Page pageNumber={pageNumber} scale={scale} />
                </Document>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}