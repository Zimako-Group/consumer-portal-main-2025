import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, CheckCircle } from 'lucide-react';

const securityFeatures = [
  {
    icon: <Lock className="w-6 h-6" />,
    title: 'SSL Encryption',
    description: 'All data transmissions are secured with SSL encryption'
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Data Protection',
    description: 'Your sensitive information is protected with advanced security measures'
  },
  {
    icon: <CheckCircle className="w-6 h-6" />,
    title: 'Regular Audits',
    description: 'Continuous security monitoring and regular system audits'
  }
];

export default function SecuritySection() {
  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-70" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-50 rounded-full mix-blend-multiply filter blur-xl opacity-70" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Content Side */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-left"
            >
              {/* Section Label */}
              <div className="inline-block mb-4">
                <span className="px-4 py-1.5 rounded-full text-lg font-semibold bg-orange-100 text-orange-600 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Data Security
                </span>
              </div>

              {/* Heading */}
              <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">
                Your Security is Our Priority!
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Concerned about the safety of your information? Rest assured, the Consumer Portal is equipped with state-of-the-art browser security features to protect your private and sensitive data. Our team has implemented robust encryption protocols, including SSL (Secure Sockets Layer), to safeguard your information during transmission. We've taken every measure to ensure your data remains secure and confidential at all times.
              </p>

              {/* Security Features Grid */}
              <div className="grid gap-6 mt-8">
                {securityFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Image/Visual Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="mt-12 lg:mt-0 hidden lg:block"
          >
            <div className="relative">
              {/* Main Visual */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-600 to-orange-500 shadow-2xl p-8 aspect-square">
                {/* Security Shield Animation */}
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.9, 1, 0.9]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Shield className="w-48 h-48 text-white opacity-20" />
                </motion.div>

                {/* Security Stats */}
                <div className="relative grid grid-cols-2 gap-4 h-full">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-center items-center text-white">
                    <div className="text-3xl font-bold mb-2">256-bit</div>
                    <div className="text-sm text-white/90 text-center">SSL Encryption</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-center items-center text-white">
                    <div className="text-3xl font-bold mb-2">24/7</div>
                    <div className="text-sm text-white/90 text-center">Monitoring</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-center items-center text-white">
                    <div className="text-3xl font-bold mb-2">100%</div>
                    <div className="text-sm text-white/90 text-center">Data Protection</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-center items-center text-white">
                    <div className="text-3xl font-bold mb-2">Regular</div>
                    <div className="text-sm text-white/90 text-center">Security Audits</div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-6 -right-6 w-64 h-64 bg-orange-200 rounded-full opacity-20 blur-2xl" />
              <div className="absolute -top-6 -left-6 w-64 h-64 bg-orange-100 rounded-full opacity-20 blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </section>
  );
}
