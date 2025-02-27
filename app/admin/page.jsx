"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "../firebaseconfig"; // Import Firebase auth and db
import { Bell, MessageCircle, Sun, Moon, Users } from "lucide-react"; // Icons for notification, message, users, and dark theme
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore"; // Firebase Firestore methods
import { Bar } from "react-chartjs-2"; // For graphical representation
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"; // Chart.js components

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Cards = () => {
  const [userEmail, setUserEmail] = useState(null); // Move state inside the component
  const [darkMode, setDarkMode] = useState(false); // Dark mode state
  const [messageCount, setMessageCount] = useState(0); // Dynamic message count
  const [ownerCount, setOwnerCount] = useState(0); // Number of owners
  const [activeUsers, setActiveUsers] = useState(0); // Number of active users
  const [inactiveUsers, setInactiveUsers] = useState(0); // Number of inactive users
  const router = useRouter();

  useEffect(() => {
    // Check if the user is authenticated
    const user = auth.currentUser;

    if (!user) {
      // Redirect to login page if user is not logged in
      router.push("/login");
    } else {
      // Set user email if authenticated
      setUserEmail(user.email);
      // Fetch the message count in real-time
      fetchMessageCount(user.email);
      // Fetch the number of owners
      fetchOwnerCount();
      // Fetch active and inactive users
      fetchUserStatus();
    }

    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, [router]);

  // Fetch the message count from Firestore in real-time
  const fetchMessageCount = async (email) => {
    try {
      const q = query(
        collection(db, "messages"),
        where("sender", "==", "owner"), // Filter by sender
        where("show", "==", false) // Filter by unread messages
      );

      // Set up a real-time listener
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setMessageCount(querySnapshot.size); // Update the count in real-time
      });

      // Clean up the listener when the component unmounts
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching message count:", error);
    }
  };

  // Fetch the number of owners from the "owner" collection
  const fetchOwnerCount = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "owner"));
      setOwnerCount(querySnapshot.size); // Set the number of owners
    } catch (error) {
      console.error("Error fetching owner count:", error);
    }
  };

  // Fetch active and inactive users
  const fetchUserStatus = async () => {
    try {
      const activeQuery = query(collection(db, "users"), where("status", "==", "active"));
      const inactiveQuery = query(collection(db, "users"), where("status", "==", "inactive"));

      const [activeSnapshot, inactiveSnapshot] = await Promise.all([
        getDocs(activeQuery),
        getDocs(inactiveQuery),
      ]);

      setActiveUsers(activeSnapshot.size); // Set active users count
      setInactiveUsers(inactiveSnapshot.size); // Set inactive users count
    } catch (error) {
      console.error("Error fetching user status:", error);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  // Handle notification icon click
  const handleNotificationClick = () => {
    router.push("/admin/approved");
  };

  // Handle message icon click
  const handleMessageClick = () => {
    router.push("/admin/message");
  };

  // Data for the bar chart (active vs inactive users)
  const userStatusData = {
    labels: ["Active Users", "Inactive Users"],
    datasets: [
      {
        label: "User Status",
        data: [activeUsers, inactiveUsers],
        backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const cards = [
    {
      title: "Approved Page",
      description: "Manage and view all approved requests efficiently in one place.",
      buttonText: "Go to Approved",
      path: "/admin/approved",
    },
    {
      title: "Message",
      description: "Communicate with users and send important messages easily.",
      buttonText: "Message",
      path: "/admin/sendmessage",
    },
    {
      title: "Manage Transactions",
      description: "Track and manage financial transactions with detailed insights.",
      buttonText: "Manage Transactions",
      path: "/admin/managetransaction",
    },
    {
      title: "User Management",
      description: "View and manage all users in the system.",
      buttonText: "Manage Users",
      path: "/admin/usermanagement",
    },

  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      {/* Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 text-center transition-transform transform hover:scale-105"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{card.title}</h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{card.description}</p>
            <button
              onClick={() => router.push(card.path)}
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300"
            >
              {card.buttonText}
            </button>
          </div>
        ))}
      </div>

      {/* Graphical Representation of Active vs Inactive Users */}
      <div className="mt-6 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">User Status Overview</h2>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
          <Bar
            data={userStatusData}
            options={{
              responsive: true,
              maintainAspectRatio: false, // Allow chart to resize on mobile
              plugins: {
                legend: {
                  position: "top",
                },
                title: {
                  display: true,
                  text: "Active vs Inactive Users",
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Cards;