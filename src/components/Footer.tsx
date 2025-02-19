import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, ChevronRight, Shield } from 'lucide-react';

const quickLinks = [
  { name: 'Home', path: '/' },
  { name: 'About Us', path: '/about' },
  { name: 'Services', path: '/services' },
  { name: 'FAQ', path: '/faq' },
  { name: 'Contact', path: '/contact' },
];

const legalLinks = [
  { name: 'Terms and Conditions', path: '/terms' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'POPI Act', path: '/popi' },
];

const services = [
  'Online Bill Payments',
  'Meter Reading Submission',
  'Account Management',
  'Query Resolution',
  'Document Downloads',
];

const contactInfo = [
  { icon: Phone, text: '0800 555 0000', href: 'tel:0800555000' },
  { icon: Mail, text: 'info@mohokare.gov.za', href: 'mailto:info@mohokare.gov.za' },
  { icon: MapPin, text: 'Mohokare Local Municipality, Free State', href: 'https://maps.google.com' },
];

const socialLinks = [
  { icon: Facebook, href: 'https://www.facebook.com/www.mohokare.gov.za/' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-white">Mohokare</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Empowering our community through efficient, transparent, and accessible municipal services.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-800 hover:bg-orange-500 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <motion.li
                  key={index}
                  whileHover={{ x: 5 }}
                  className="flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  <Link
                    to={link.path}
                    className="hover:text-orange-500 transition-colors"
                  >
                    {link.name}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Our Services</h3>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <motion.li
                  key={index}
                  whileHover={{ x: 5 }}
                  className="flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  <span className="hover:text-orange-500 transition-colors cursor-pointer">
                    {service}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Contact Us</h3>
            <ul className="space-y-4">
              {contactInfo.map((contact, index) => (
                <motion.li
                  key={index}
                  whileHover={{ x: 5 }}
                  className="flex items-start space-x-3"
                >
                  <contact.icon className="w-5 h-5 text-orange-500 mt-1" />
                  <a
                    href={contact.href}
                    className="hover:text-orange-500 transition-colors"
                  >
                    {contact.text}
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Legal Links & Copyright */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap justify-center md:justify-start gap-x-8">
              {legalLinks.map((link, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                >
                  <Link
                    to={link.path}
                    className="text-sm hover:text-orange-500 transition-colors"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {currentYear} Mohokare Local Municipality. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <div className="relative">
          <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-gray-900/20 to-transparent" />
        </div>
      </div>
    </footer>
  );
}
