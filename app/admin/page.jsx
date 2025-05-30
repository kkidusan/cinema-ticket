// app/Cards.tsx
"use client";
import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase-client"; // Update to new path
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";

const Cards = () => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const [ownersData, setOwnersData] = useState([]);
  const [totalOwners, setTotalOwners] = useState(0);

  useEffect(() => {
    const ownersRef = collection(db, "owner");

    const unsubscribe = onSnapshot(ownersRef, (querySnapshot) => {
      const owners = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const approvedCount = owners.filter((owner) => owner.approved).length;
      const notApprovedCount = owners.filter((owner) => !owner.approved).length;

      const chartData = [
        { name: "Approved", count: approvedCount },
        { name: "Not Approved", count: notApprovedCount },
      ];

      setOwnersData(chartData);
      setTotalOwners(owners.length);
    });

    return () => unsubscribe();
  }, []);

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
      path: "/admin/manageuser",
    },
  ];

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-gray-100" : "bg-gray-900"} p-4`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            className={`bg-gradient-to-br ${theme === "light" ? "from-blue-50 to-purple-50" : "from-gray-800 to-gray-900"} p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h2 className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-2`}>
              {card.title}
            </h2>
            <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"} text-sm mb-3`}>
              {card.description}
            </p>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => router.push(card.path)}
                className={`bg-transparent border-2 ${theme === "light" ? "border-[#a21caf] text-black" : "border-[#a21caf] text-white"} px-4 py-2 rounded-md transition-all hover:bg-[#a21caf] hover:text-white`}
              >
                {card.buttonText}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-lg rounded-lg p-6`}>
        <h2 className={`text-xl font-semibold ${theme === "light" ? "text-gray-900" : "text-white"} mb-4`}>
          Owner Approval Status
        </h2>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ownersData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme === "light" ? "#eee" : "#444"} />
              <XAxis dataKey="name" stroke={theme === "light" ? "#888" : "#ccc"} />
              <YAxis stroke={theme === "light" ? "#888" : "#ccc"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === "light" ? "#ffffff" : "#333",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  color: theme === "light" ? "#000" : "#fff",
                }}
              />
              <Legend />
              <Bar
                dataKey="count"
                fill="url(#colorGradient)"
                radius={[5, 5, 0, 0]}
                barSize={40}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-lg rounded-lg p-4 text-center hover:shadow-xl transition-shadow`}>
          <h3 className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
            Total Owners
          </h3>
          <p className={`text-3xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"} mt-2`}>
            {totalOwners}
          </p>
        </div>
        <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-lg rounded-lg p-4 text-center hover:shadow-xl transition-shadow`}>
          <h3 className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
            Approved Owners
          </h3>
          <p className={`text-3xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"} mt-2`}>
            {ownersData.find((d) => d.name === "Approved")?.count || 0}
          </p>
        </div>
        <div className={`${theme === "light" ? "bg-white" : "bg-gray-800"} shadow-lg rounded-lg p-4 text-center hover:shadow-xl transition-shadow`}>
          <h3 className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
            Not Approved Owners
          </h3>
          <p className={`text-3xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"} mt-2`}>
            {ownersData.find((d) => d.name === "Not Approved")?.count || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cards;