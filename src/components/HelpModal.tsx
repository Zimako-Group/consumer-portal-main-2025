import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
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
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal Container - ensures proper mobile positioning */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal */}
            <motion.div
              ref={modalRef}
              className={`
                bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden
                ${isMobile 
                  ? 'w-full max-h-[calc(100vh-2rem)]' 
                  : 'w-[400px]'
                }
              `}
              style={!isMobile ? {
                position: 'fixed',
                bottom: '100px',
                right: '40px',
              } : undefined}
              initial={isMobile ? { opacity: 0, y: 50 } : { opacity: 0, y: 20 }}
              animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              exit={isMobile ? { opacity: 0, y: 50 } : { opacity: 0, y: 20 }}
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
              <div className="p-4 space-y-3">
                <h2 className="text-lg font-semibold text-white">
                  Welcome to the Mohokare Consumer Portal!
                </h2>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    We're excited to have you here. To get started, follow these simple steps:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Click the <b>Get Started</b> button on the main page.</li>
                    <li>Navigate to the <b>Sign Up</b> page.</li>
                    <li>Fill in your details in the required fields.</li>
                    <li>In the <b>Account Number</b> section, enter your Municipality Account Number.</li>
                    <li>Click <b>Sign Up</b>, and the system will automatically log you into your customer dashboard.</li>
                  </ol>
                  <p>
                    If you need assistance, feel free to reach out to our support team.
                  </p>
                </div>

                {/* Signature */}
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <p className="text-right">
                    <span className="inline-block font-['Dancing_Script'] text-lg text-blue-400 italic transform -rotate-2 hover:rotate-0 transition-transform duration-300 cursor-default">
                      — Zimako Dev Team
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
