import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import HelpModal from './HelpModal';

interface FloatingHelpButtonProps {
  onClick: () => void;
}

const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({ onClick }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50 w-16 h-16">
        {/* Ripple effects */}
        <div className="absolute inset-0 animate-ripple-1">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-25"></div>
        </div>
        <div className="absolute inset-0 animate-ripple-2">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-25"></div>
        </div>
        <div className="absolute inset-0 animate-ripple-3">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-25"></div>
        </div>
        
        {/* Main button */}
        <motion.button
          className="absolute inset-0 p-4 bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-full shadow-lg cursor-pointer overflow-hidden"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(59, 130, 246, 0.7)",
              "0 0 0 20px rgba(59, 130, 246, 0)",
            ],
          }}
          transition={{
            boxShadow: {
              repeat: Infinity,
              duration: 2,
            },
          }}
          onClick={handleClick}
          aria-label="Help"
        >
          <motion.div
            className="w-full h-full flex items-center justify-center"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <QuestionMarkCircleIcon className="w-8 h-8" />
          </motion.div>
        </motion.button>
      </div>

      <HelpModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FloatingHelpButton;
