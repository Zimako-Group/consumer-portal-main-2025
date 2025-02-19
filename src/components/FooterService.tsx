import React from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Lightbulb, 
  Trash2, 
  Map, 
  Building2, 
  TreePine,
  Users,
  FileText,
  Clock,
  Phone
} from 'lucide-react';

const services = [
  {
    icon: Droplets,
    title: 'Water Services',
    description: 'Clean water supply, maintenance of water infrastructure, and water quality management.',
    color: 'bg-blue-500',
  },
  {
    icon: Lightbulb,
    title: 'Electricity',
    description: 'Power distribution, street lighting, and electrical infrastructure maintenance.',
    color: 'bg-yellow-500',
  },
  {
    icon: Trash2,
    title: 'Waste Management',
    description: 'Regular waste collection, recycling programs, and waste disposal services.',
    color: 'bg-green-500',
  },
  {
    icon: Map,
    title: 'Roads & Transport',
    description: 'Road maintenance, traffic management, and public transport infrastructure.',
    color: 'bg-gray-500',
  },
  {
    icon: Building2,
    title: 'Housing',
    description: 'Housing development projects and property management services.',
    color: 'bg-orange-500',
  },
  {
    icon: TreePine,
    title: 'Parks & Recreation',
    description: 'Maintenance of public parks, recreational facilities, and community spaces.',
    color: 'bg-emerald-500',
  }
];

const emergencyContacts = [
  {
    icon: Phone,
    title: 'Emergency Hotline',
    contact: '051 673 9600',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    contact: '051 673 9600',
  }
];

const serviceRequests = [
  'Water Connection',
  'Electricity Connection',
  'Waste Bin Request',
  'Street Light Repair',
  'Road Maintenance',
  'Building Permits'
];

export default function FooterService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/services/hero-bg.jpg"
            alt="Municipal Services"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Municipal Services
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-200 max-w-3xl mx-auto"
          >
            Delivering essential services to enhance the quality of life in our community
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Comprehensive municipal services designed to meet the needs of our community
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className={`w-12 h-12 ${service.color} rounded-lg flex items-center justify-center mb-6`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="py-16 bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {emergencyContacts.map((contact, index) => (
              <motion.div
                key={contact.title}
                initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-xl p-6 flex items-center space-x-4"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <contact.icon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{contact.title}</h3>
                  <p className="text-orange-600 font-semibold">{contact.contact}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Requests */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Service Requests</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Submit your service requests online for faster processing
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceRequests.map((request, index) => (
              <motion.button
                key={request}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left flex items-center space-x-3"
              >
                <FileText className="w-5 h-5 text-orange-500" />
                <span className="text-gray-700">{request}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Need Assistance?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Our dedicated team is here to help you with any municipal service inquiries
            </p>
            <button className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
              Contact Support
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
