"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <motion.p
        className="mt-4 text-xl font-bold text-gray-700 dark:text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
}