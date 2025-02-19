import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';

const faqs = [
  {
    category: 'Account Management',
    questions: [
      {
        question: 'How do I register for an online account?',
        answer: 'To register for an online account, click the "Register" button in the top right corner. You\'ll need to provide your municipal account number, email address, and create a password. We\'ll verify your information and send a confirmation email to complete the registration.'
      },
      {
        question: 'What should I do if I forget my password?',
        answer: 'If you forget your password, click the "Forgot Password" link on the login page. Enter your registered email address, and we\'ll send you instructions to reset your password. For security reasons, password reset links expire after 24 hours.'
      },
      {
        question: 'How can I update my contact information?',
        answer: 'Once logged in, go to your Profile Settings. Here you can update your phone number, email address, and physical address. Remember to click "Save Changes" after making any updates. Your information will be verified before changes take effect.'
      }
    ]
  },
  {
    category: 'Billing & Payments',
    questions: [
      {
        question: 'How can I view my current bill?',
        answer: 'Your current bill is available in the "Billing" section of your dashboard. You can view detailed breakdowns of charges, download PDF statements, and see your payment history. Bills are typically updated by the 7th of each month.'
      },
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept various payment methods including credit/debit cards, EFT, and direct debit. All online payments are processed securely through our payment partner, YeboPay. You can also set up automatic payments to avoid missing due dates.'
      },
      {
        question: 'How do I submit my meter reading?',
        answer: 'To submit a meter reading, navigate to the "Meter Reading" section in your dashboard. Enter your current meter reading and upload a clear photo of your meter. Readings should be submitted between the 20th and 25th of each month.'
      }
    ]
  },
  {
    category: 'Technical Support',
    questions: [
      {
        question: 'What should I do if I can\'t access my account?',
        answer: 'If you\'re having trouble accessing your account, first check your internet connection and clear your browser cache. If the problem persists, contact our technical support team at support@mohokare.gov.za or call our 24/7 helpline at 0800 555 0000.'
      },
      {
        question: 'Is my information secure?',
        answer: 'Yes, we take security seriously. Our platform uses 256-bit SSL encryption, regular security audits, and follows best practices for data protection. Your personal and payment information is encrypted and stored securely in compliance with POPI Act regulations.'
      },
      {
        question: 'How do I report technical issues?',
        answer: 'Technical issues can be reported through the "Support" section of your dashboard. Provide as much detail as possible, including screenshots if applicable. Our technical team aims to respond within 24 hours for non-urgent issues and within 2 hours for critical problems.'
      }
    ]
  }
];

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-orange-100 text-orange-600">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-4xl font-bold text-gray-900 sm:text-5xl"
          >
            Frequently Asked Questions
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-xl text-gray-600"
          >
            Everything you need to know about the Mohokare Consumer Portal
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 max-w-xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search your question..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
              />
            </div>
          </motion.div>
        </div>

        {/* FAQ Categories */}
        <div className="grid gap-8 md:grid-cols-1 lg:gap-12">
          {filteredFaqs.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-orange-50">
                <h2 className="text-xl font-semibold text-gray-900">{category.category}</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {category.questions.map((faq, questionIndex) => {
                  const isExpanded = expandedItems[`${categoryIndex}-${questionIndex}`];
                  
                  return (
                    <div key={questionIndex} className="px-6 py-4">
                      <button
                        onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                        className="flex justify-between items-center w-full text-left focus:outline-none"
                      >
                        <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-4 text-gray-600 leading-relaxed">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600">
            Can't find what you're looking for?{' '}
            <a href="/contact" className="text-orange-600 font-semibold hover:text-orange-700">
              Contact our support team
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
