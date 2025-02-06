import { motion } from 'framer-motion';

const rules = [
  "Rule 1: Always be respectful.",
  "Rule 2: Follow the community guidelines.",
  "Rule 3: No spamming allowed.",
  "Rule 4: Stay on topic.",
  "Rule 5: Keep it friendly and welcoming."
];

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <motion.div
        className="bg-white shadow-xl rounded-lg p-6 w-96"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Community Rules</h2>
        <ul className="space-y-2 mb-4">
          {rules.map((rule, index) => (
            <motion.li
              key={index}
              className="text-lg text-gray-600"
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              {rule}
            </motion.li>
          ))}
        </ul>
        <motion.button
          className="w-full py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition duration-300"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          Accept Rules
        </motion.button>
      </motion.div>
    </div>
  );
}
