// pages/index.jsx
'use client'
import { motion } from 'framer-motion'
import PortfolioCard from './Cardview'

const projects = [
  {
    title: '',
    subtitle: 'Modern Ticket Selling v1',
    description: '',
    tags: ['Uplod detail', 'Update detail', 'Cancelle detail'],
    image: '/images/project1.jpg'
  },
  {
    title: '',
    subtitle: 'Billing of Money',
    description: '',
    tags: ['Withdeawn Money', 'Saving Money',],
    image: '/images/project1.jpg'
  },
  {
    title: '',
    subtitle: 'Obtaining Permission',
    description: '',
    tags: ['Applay', 'Waiting for Permission to'],
    image: '/images/project1.jpg'
  },
  // Add more projects...
]

export default function Card() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
    >
      <div className="container mx-auto px-4 py-12">
        <motion.h1
          className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-white"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          My Portfolio
        </motion.h1>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PortfolioCard project={project} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}