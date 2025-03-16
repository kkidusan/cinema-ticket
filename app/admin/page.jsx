"use client";
import { useRouter } from "next/navigation";

const Cards = () => {
  const router = useRouter();

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
    <>
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
      </div>
    </>
  );
};

export default Cards;