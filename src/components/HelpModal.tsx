import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const updatePosition = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Position modal near the help button for larger screens
      if (viewportWidth > 768) {
        setModalPosition({
          x: viewportWidth - 420, // 400px width + 20px margin
          y: viewportHeight - 420 // Position from bottom
        });
      } else {
        // Center modal for mobile screens
        setModalPosition({
          x: viewportWidth / 2,
          y: viewportHeight / 2
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - only show on mobile */}
          <motion.div
            className="md:hidden fixed inset-0 bg-black/30 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            ref={modalRef}
            className="fixed z-50 w-[90vw] md:w-[400px] bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden"
            style={{
              top: window.innerWidth > 768 ? 'auto' : '50%',
              bottom: window.innerWidth > 768 ? '100px' : 'auto',
              left: window.innerWidth > 768 ? 'auto' : '50%',
              right: window.innerWidth > 768 ? '40px' : 'auto',
              transform: window.innerWidth > 768 
                ? 'none'
                : 'translate(-50%, -50%)'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">
                We want to help!
              </h2>
              <div className="space-y-3 text-sm text-gray-300">
                <p>
                  We want Windsurf to be as fast, reliable, and helpful to you as possible. We are working night and day to improve your experience.
                </p>
                <p>
                  Sometimes errors are part of a finder's research and planning process. Just like a human learning a new computer environment, what files exist, what tools are available, and so on.
                </p>
                <p>
                  Don't worry! Windsurf can fall due to rate limits and availability issues outside of our control. Check our status page for more information.
                </p>
              </div>

              {/* Signature */}
              <div className="mt-4 pt-3 border-t border-gray-700">
                <p className="text-sm text-gray-400 text-right italic">
                  - Windsurf Dev Team
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
