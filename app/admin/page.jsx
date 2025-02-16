
"use client";
import { useRouter } from "next/navigation";

const cards = [
  {
    title: "Approved Page",
    description: "Manage and view all approved requests efficiently in one place.",
    buttonText: "Go to Approved",
    path: "/admin/approved",
  },
  {
    title: "Manage Transactions",
    description: "Track and manage financial transactions with detailed insights.",
    buttonText: "Manage Transactions",
    path: "/admin/managetransaction",
  },
  {
    title: "Receive Feedback",
    description: "Collect and review user feedback to improve your services.",
    buttonText: "View Feedback",
    path: "/admin/receivfeedback",
  },
  {
    title: "Send Message",
    description: "Communicate with users and send important messages easily.",
    buttonText: "Send Message",
    path: "/admin/sendmessage",
  },
];

const Cards = () => {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 text-center transition-transform transform hover:scale-105">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{card.title}</h2>
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{card.description}</p>
          <button
            onClick={() => router.push(card.path)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300"
          >
            {card.buttonText}
          </button>
        </div>
      ))}
    </div>
  );
};

export default Cards;
