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
                  We want to help!
                </h2>
                <div className="space-y-2 text-sm text-gray-300">
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
                <div className="mt-3 pt-2 border-t border-gray-700">
                  <p className="text-sm text-gray-400 text-right italic">
                    - Windsurf Dev Team
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
