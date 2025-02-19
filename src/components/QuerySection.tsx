import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowRight } from 'lucide-react';
import AuthModal from './AuthModal';

export default function QuerySection() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <section className="relative py-24 overflow-hidden bg-white">
      {/* Decorative Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-100/40 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            {/* Image Side - Desktop Only */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="hidden lg:block"
            >
              <div className="relative">
                {/* Main Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl transform -rotate-2">
                  <img
                    src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80"
                    alt="Customer Service Representative"
                    className="w-full h-[500px] object-cover object-center"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-transparent" />
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-6 -left-6 w-48 h-48 bg-orange-200 rounded-full opacity-20 blur-2xl" />
                <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-orange-100 rounded-full opacity-20 blur-2xl" />

                {/* Floating Card Effect */}
                <div className="absolute -right-8 bottom-12 bg-white rounded-xl p-4 shadow-xl transform rotate-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-gray-600">Average Response Time: 24hrs</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Content Side */}
            <div className="relative lg:ml-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-left lg:max-w-lg"
              >
                {/* Section Label */}
                <div className="inline-block mb-4">
                  <span className="px-4 py-1.5 rounded-full text-lg font-semibold bg-orange-100 text-orange-600 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Customer Support
                  </span>
                </div>

                {/* Heading */}
                <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">
                  Have a Query or Compliment?
                </h2>

                {/* Description */}
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  Easily log your request through our portal! It will be routed directly to the appropriate department, ensuring swift responses and efficient service resolutions.
                </p>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 group shadow-lg shadow-orange-500/25"
                >
                  Submit your query
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {/* Additional Info */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600 mb-1">24/7</div>
                    <div className="text-sm text-gray-600">Portal Access</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600 mb-1">1-2 Days</div>
                    <div className="text-sm text-gray-600">Response Time</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </section>
  );
}
