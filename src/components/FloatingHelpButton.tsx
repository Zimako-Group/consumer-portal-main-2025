import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import HelpModal from './HelpModal';

interface FloatingHelpButtonProps {
  onClick: () => void;
}

const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({ onClick }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
    onClick();
  };

  return (
    <>
      <motion.button
        className="fixed bottom-8 right-8 p-4 bg-blue-800 hover:bg-blue-900 text-white rounded-full shadow-lg cursor-pointer z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleClick}
        aria-label="Help"
      >
        <QuestionMarkCircleIcon className="w-6 h-6" />
      </motion.button>

      <HelpModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FloatingHelpButton;
