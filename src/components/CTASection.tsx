import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, UserPlus, Check } from 'lucide-react';
import AuthModal from './AuthModal';

const benefits = [
  'Instant access to statements',
  'Online payment options',
  'Real-time account updates',
  'Secure data protection',
  'Direct communication channel',
  '24/7 account management'
];

export default function CTASection() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'login' | 'register'>('register');

  const handleRegisterClick = () => {
    setInitialTab('register');
    setIsAuthModalOpen(true);
  };

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-500">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Content Side */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {/* Section Label */}
              <div className="inline-block mb-4">
                <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white/10 text-white flex items-center gap-2 backdrop-blur-sm">
                  <UserPlus className="w-4 h-4" />
                  Get Started Today
                </span>
              </div>

              {/* Heading */}
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
                Take Control of Your Municipal Account Today!
              </h2>

              {/* Description */}
              <p className="text-xl text-white/90 leading-relaxed mb-8">
                Switch to the Mohokare Consumer Portal and manage your account with ease and confidence.
              </p>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRegisterClick}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 rounded-full font-semibold hover:bg-orange-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600 shadow-lg shadow-black/25 group"
              >
                Register Now
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          </div>

          {/* Benefits List Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="mt-12 lg:mt-0"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/90 text-lg">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={initialTab}
      />

      <style jsx>{`
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </section>
  );
}
