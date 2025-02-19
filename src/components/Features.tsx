import React, { useState } from 'react';
import { CreditCard, Clock, FileText, MessageSquare, Activity, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthModal from './AuthModal';

const benefits = [
  {
    icon: <CreditCard className="w-8 h-8 text-orange-600" />,
    title: 'Instant Online Payments',
    description: 'Using our secure payment platform, YeboPay, you can make quick and hassle-free payments directly through the Consumer Portal.',
    primary: true,
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&q=80'
  },
  {
    icon: <Clock className="w-8 h-8 text-orange-600" />,
    title: '24/7 Access',
    description: 'Access your account information, statements, and services anytime, anywhere - day or night.',
  },
  {
    icon: <FileText className="w-8 h-8 text-orange-600" />,
    title: 'Digital Statements',
    description: 'View and download your statements instantly, reducing paper waste and saving time.',
  },
  {
    icon: <MessageSquare className="w-8 h-8 text-orange-600" />,
    title: 'Direct Communication',
    description: 'Submit queries and receive responses directly from dedicated municipal agents.',
  },
  {
    icon: <Activity className="w-8 h-8 text-orange-600" />,
    title: 'Usage Monitoring',
    description: 'Track your consumption patterns and manage your utility usage more effectively.',
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0
  }
};

export default function Features() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <section id="features" className="relative py-12 overflow-hidden bg-gradient-to-b from-white via-orange-50/30 to-white">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-orange-100 rounded-full filter blur-[100px] opacity-20 transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-orange-200 rounded-full filter blur-[100px] opacity-20 transform -translate-x-1/3 translate-y-1/3" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight"
          >
            Benefits of Consumer Portal
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Experience the convenience of managing your municipal services online with our feature-rich portal
          </motion.p>
        </div>

        {/* Primary Benefit Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 to-orange-500 shadow-2xl">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative flex flex-col lg:flex-row items-center">
              {/* Content Side */}
              <div className="w-full lg:w-1/2 p-12 lg:p-16 text-white">
                <div className="p-3 bg-white/10 rounded-2xl inline-block backdrop-blur-sm mb-6">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4">Instant Online Payments</h3>
                <p className="text-white/90 text-lg mb-8 leading-relaxed">
                  Experience seamless transactions with our secure <a href="https://yebopay.co.za/" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 font-medium transition-colors">YeboPay</a> platform. Pay your municipal bills instantly, track your payment history, and manage your accounts all in one place.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white text-orange-600 rounded-full font-semibold hover:bg-orange-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600 group"
                >
                  Make Payment
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>
              {/* Image Side - Desktop Only */}
              <div className="hidden lg:block w-1/2 h-full">
                <img
                  src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&q=80"
                  alt="Online Payment"
                  className="w-full h-full object-cover object-center transform scale-110"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Other Benefits Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8"
        >
          {benefits.slice(1).map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="p-3.5 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                    {benefit.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

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