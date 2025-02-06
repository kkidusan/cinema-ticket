// Cardview.jsx
'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { TypeAnimation } from 'react-type-animation'

const PortfolioCard = ({ project }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="relative group bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Project Image with Film-like Overlay */}
      <div className="relative aspect-video">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover"
        />
        <div
          className={`
            absolute inset-0 bg-gradient-to-br from-black/60 to-transparent
            transition-opacity duration-300
            ${isHovered ? 'opacity-0' : 'opacity-100'}
          `}
        />
      </div>

      {/* Content with Typing Animation */}
      <div className="p-6">
        <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
          <TypeAnimation
            sequence={[
              project.title,
              2000,
              project.subtitle,
              2000
            ]}
            speed={50}
            noCursor={false}
            wrapper="div"
          />
        </h3>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {project.description}
        </p>

        {/* Tags with Film-like Animation */}
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag, index) => (
            <motion.span
              key={index}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {tag}
            </motion.span>
          ))}
        </div>

        {/* Hover Effects */}
        <motion.div
          className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transition-all duration-500"
          animate={{ width: isHovered ? '100%' : '0%' }}
        />
      </div>
    </motion.div>
  )
}

export default PortfolioCard