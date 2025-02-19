import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Gauge } from 'lucide-react';
import AuthModal from './AuthModal';

export default function BillingControl() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <section className="relative py-8 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-orange-100 rounded-full filter blur-[100px] opacity-20 transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-orange-200 rounded-full filter blur-[100px] opacity-20 transform -translate-x-1/3 translate-y-1/3" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
            {/* Content Side */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-left mt-2"
              >
                {/* Section Label */}
                <div className="inline-block mb-4">
                  <span className="px-6 py-2 rounded-full text-lg font-medium bg-gradient-to-r from-orange-50 to-orange-100 text-orange-600 flex items-center gap-2 shadow-sm">
                    <Gauge className="w-4 h-4" />
                    Meter Reading Management
                  </span>
                </div>

                {/* Heading */}
                <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
                  Take Control of Your Billing
                </h2>

                {/* Description */}
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  Tired of estimated bills? Submit your monthly meter readings online through our Consumer Portal for accurate billing. By tracking your consumption, you can gain valuable insights into your usage patterns, identify opportunities to cut costs, and save on your utility bills. Embrace smarter resource management and enjoy better control over your expenses today!
                </p>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 group shadow-lg shadow-orange-500/25"
                >
                  Click here to submit your readings
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            </div>

            {/* Image Side - Desktop Only */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="hidden lg:block mt-12 lg:mt-0"
            >
              <div className="relative">
                {/* Main Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80"
                    alt="Digital Meter Reading"
                    className="w-full h-[500px] object-cover object-center"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-4 -right-4 w-64 h-64 bg-orange-200 rounded-full opacity-20 blur-2xl" />
                <div className="absolute -top-4 -left-4 w-64 h-64 bg-orange-100 rounded-full opacity-20 blur-2xl" />
              </div>
            </motion.div>
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
