"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from "../../firebaseconfig";
import { ArrowLeft, Send, Paperclip, Trash } from "lucide-react";
import { PacmanLoader } from "react-spinners";

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]); // Track selected messages
  const [isSelectMode, setIsSelectMode] = useState(false); // Toggle select mode
  const messagesEndRef = useRef(null);
  const router = useRouter();

  // Track last tap time for double-tap detection
  const lastTapRef = useRef(0);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "" && !file) return;

    const newMessageObj = {
      ownerEmail: userEmail,
      text: newMessage,
      sender: "owner",
      from: auth.currentUser?.displayName || userEmail,
      show: true,
      timestamp: new Date(),
      status: "sending",
    };

    setMessages((prevMessages) => [...prevMessages, newMessageObj]);
    setNewMessage("");
    setFile(null);
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

  // Toggle select mode
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (!isSelectMode) {
      setSelectedMessages([]); // Clear selections when exiting select mode
    }
  };

  // Handle message selection
  const handleMessageSelect = (messageId) => {
    if (isSelectMode) {
      setSelectedMessages((prevSelected) =>
        prevSelected.includes(messageId)
          ? prevSelected.filter((id) => id !== messageId) // Deselect
          : [...prevSelected, messageId] // Select
      );
    }
  };

  // Delete a single message
  const deleteMessage = async (messageId) => {
    try {
      await deleteDoc(doc(db, "messages", messageId));
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // Handle double-click or double-tap
  const handleDoubleClickOrTap = (messageId) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms delay for double-tap
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      deleteMessage(messageId); // Delete the message on double-tap/double-click
    }
    lastTapRef.current = now;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-indigo-100 via-purple-200 to-pink-100 dark:bg-gray-900">
        <PacmanLoader color="#6D28D9" size={30} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-r from-indigo-100 via-purple-200 to-pink-100 dark:bg-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md">
        <button onClick={() => router.push("/dashboard")} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-semibold">Messages</h2>
        <button
          onClick={toggleSelectMode}
          className={`p-2 rounded-lg ${isSelectMode ? "bg-red-500" : "bg-purple-500"}`}
        >
          {isSelectMode ? "Cancel" : "Select"}
        </button>
      </div>

      {/* Chat Messages Grid */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        <div className="grid gap-4">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`grid ${msg.sender === "owner" ? "justify-self-end" : "justify-self-start"}`}
                onClick={() => handleMessageSelect(msg.id)}
                onDoubleClick={() => handleDoubleClickOrTap(msg.id)} // Double-click for desktop
                onTouchEnd={() => handleDoubleClickOrTap(msg.id)} // Double-tap for touch devices
              >
                <div
                  className={`max-w-lg p-4 rounded-lg ${
                    msg.sender === "owner"
                      ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
                      : "bg-gray-300 text-black"
                  } shadow-lg ${
                    selectedMessages.includes(msg.id) ? "ring-2 ring-purple-500" : ""
                  }`}
                >
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
            <p className="text-center text-gray-500">No messages yet.</p>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-300 dark:bg-gray-800 flex items-center shadow-md space-x-3 rounded-lg">
        {isSelectMode ? (
          <button
            onClick={() => deleteSelectedMessages()}
            className="bg-red-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2"
          >
            <Trash size={20} />
            <span>Delete</span>
          </button>
        ) : (
          <>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Paperclip size={20} className="text-gray-500 hover:text-gray-700 dark:text-gray-300" />
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
              className="flex-grow p-3 border rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={sendMessage}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2"
            >
              <Send size={20} />
              <span>Send</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}