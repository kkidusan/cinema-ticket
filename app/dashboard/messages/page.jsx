"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "@/app/firebaseconfig"; // Ensure correct path
import { ArrowLeft, Send, Paperclip } from "lucide-react";

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);  // For file upload
  const messagesEndRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!auth.currentUser) {
        router.push("/login");
        return;
      }

      const userEmail = auth.currentUser.email;
      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        where("ownerEmail", "==", userEmail),
        orderBy("timestamp", "asc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(fetchedMessages);
        scrollToBottom();
      });

      return () => unsubscribe();
    };

    fetchMessages();
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "" && !file) return;

    const newMessageObj = {
      ownerEmail: auth.currentUser.email,
      text: newMessage,
      sender: "owner",
      from: auth.currentUser.displayName || auth.currentUser.email,
      show: true,
      timestamp: new Date(),
      status: "sending", // Set initial status as "sending"
    };

    setMessages((prevMessages) => [...prevMessages, newMessageObj]); // Add new message to the state
    setNewMessage(""); // Clear the input field
    setFile(null); // Reset file input
    scrollToBottom(); // Scroll to the bottom of the messages

    // Send the message to Firestore
    await addDoc(collection(db, "messages"), {
      ownerEmail: auth.currentUser.email,
      text: newMessage,
      sender: "owner",
      from: auth.currentUser.displayName || auth.currentUser.email,
      show: true,
      timestamp: serverTimestamp(),
      status: "sending", // Set status as "sending"
    });

    // Update the message status to "delivered" after sending it
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.text === newMessageObj.text && msg.status === "sending"
          ? { ...msg, status: "delivered" }
          : msg
      )
    );
  };

  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-blue-600 text-white shadow-md">
        <button onClick={() => router.push("/dashboard")} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-semibold">Messages</h2>
      </div>

      {/* Chat Messages Grid */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        <div className="grid gap-4">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={msg.id || index} // Fallback to index if id is not available
                className={`grid ${msg.sender === "owner" ? "justify-self-end" : "justify-self-start"}`}
              >
                <div
                  className={`max-w-lg p-4 rounded-lg ${msg.sender === "owner" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"} shadow-lg`}
                >
                  {/* Message Text */}
                  <p className="text-lg">{msg.text}</p>

                  {/* Optionally, display file thumbnail or icon */}
                  {file && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">File: {file.name}</span>
                    </div>
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
      <div className="p-4 bg-white dark:bg-gray-800 flex items-center shadow-md space-x-3 rounded-lg">
        {/* File Upload */}
        <label htmlFor="file-upload" className="cursor-pointer">
          <Paperclip size={20} className="text-gray-500 hover:text-gray-700 dark:text-gray-300" />
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Text Input */}
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-3 border rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Send Button */}
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2"
        >
          <Send size={20} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
