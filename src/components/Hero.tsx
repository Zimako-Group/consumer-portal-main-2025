import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import AuthModal from './AuthModal';
import defaultHero from '../assets/hero.jpg';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const slides = [
  {
    id: 1,
    image: defaultHero,
    fallbackImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1470&auto=format&fit=crop',
    alt: 'Municipal Building',
    content: {
      title: 'Welcome To',
      highlight: 'Mohokare Consumer Portal',
      subtitle: 'A Performance Driven Municipality That Responds To Community Needs',
      showDefaultButtons: true
    }
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1524813686514-a57563d77965?q=80&w=1632&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1470&auto=format&fit=crop',
    alt: 'Community Service',
    content: {
      title: 'Exciting News!',
      subtitle: 'Your municipal statements are now available at your fingertips—anytime, anywhere, 24/7! Say goodbye to waiting for office hours and hello to ultimate convenience.',
      showStatementButton: true
    }
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1470&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1524813686514-a57563d77965?q=80&w=1632&auto=format&fit=crop',
    alt: 'Modern Infrastructure',
    content: {
      title: 'Did you know?',
      subtitle: 'You can play a key role in ensuring accurate billing by uploading your meter readings. Take control and make sure you\'re charged correctly for what you use!',
      showMeterButton: true
    }
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    fallbackImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1470&auto=format&fit=crop',
    alt: 'Water Service',
    content: {
      title: 'Did you know?',
      subtitle: 'You can easily set up payment arrangements online through our Consumer Portal, allowing you to tailor a payment plan that suits your budget and needs!',
      showPaymentButton: true
    }
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=1469&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1470&auto=format&fit=crop',
    alt: 'Community Development',
    content: {
      title: 'Did you know?',
      subtitle: 'The Consumer Portal allows you to submit queries directly to a dedicated municipal agent, ensuring quick responses and efficient resolution of your concerns',
      showQueryButton: true
    }
  }
];

interface HeroProps {
  onLoginSuccess?: () => void;
}

export default function Hero({ onLoginSuccess }: HeroProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<number, boolean>>({});
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);

  const nextSlide = useCallback(() => {
    if (!isAutoplayPaused) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }
  }, [isAutoplayPaused]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 10000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const handleImageError = (slideId: number) => {
    console.warn(`Failed to load image for slide ${slideId}, using fallback`);
    setImageLoadErrors(prev => ({
      ...prev,
      [slideId]: true
    }));
  };

  const handleSlideChange = (index: number) => {
    setCurrentSlide(index);
    setIsAutoplayPaused(true);
    setTimeout(() => setIsAutoplayPaused(false), 10000);
  };

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden">
      {/* Slider Background */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: currentSlide === index ? 1 : 0,
              scale: currentSlide === index ? 1 : 1.1
            }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-black/40 z-10" />
            <img
              src={imageLoadErrors[slide.id] ? slide.fallbackImage : slide.image}
              alt={slide.alt}
              className="w-full h-full object-cover transform transition-transform duration-10000 scale-100"
              style={{ 
                transform: currentSlide === index ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 10s linear'
              }}
              onError={() => handleImageError(slide.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 md:pt-32 pb-8 sm:pb-12 md:pb-20">
        <div className="text-center">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`transition-all duration-1000 ${
                currentSlide === index ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4 hidden'
              }`}
            >
              <motion.div
                initial="initial"
                animate="animate"
                variants={fadeIn}
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                  {slide.content.title}
                  {slide.content.highlight && (
                    <span className="text-orange-400 block mt-1">
                      {slide.content.highlight}
                    </span>
                  )}
                </h1>
              </motion.div>

              <motion.p
                className="text-lg sm:text-xl text-gray-200 mb-6 sm:mb-8 max-w-3xl mx-auto px-4 sm:px-0"
                initial="initial"
                animate="animate"
                variants={fadeIn}
                transition={{ delay: 0.2 }}
              >
                {slide.content.subtitle}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
                initial="initial"
                animate="animate"
                variants={fadeIn}
                transition={{ delay: 0.4 }}
              >
                {slide.content.showDefaultButtons && (
                  <>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
                    >
                      Get Started <ArrowRight className="w-5 h-5" />
                    </button>
                    <button 
                      className="px-8 py-3 bg-white text-orange-600 rounded-full font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
                      onClick={() => {
                        const featuresSection = document.getElementById('features');
                        if (featuresSection) {
                          featuresSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      Learn More
                    </button>
                  </>
                )}
                {slide.content.showStatementButton && (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-all hover:scale-105 flex items-center gap-2 group shadow-lg"
                  >
                    View Your Statement
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {slide.content.showMeterButton && (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-all hover:scale-105 flex items-center gap-2 group shadow-lg"
                  >
                    Submit Meter Readings
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {slide.content.showPaymentButton && (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-all hover:scale-105 flex items-center gap-2 group shadow-lg"
                  >
                    Make Payment Arrangement
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {slide.content.showQueryButton && (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-all hover:scale-105 flex items-center gap-2 group shadow-lg"
                  >
                    Submit Queries
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => handleSlideChange(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              currentSlide === index
                ? 'bg-orange-500 w-6'
                : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={onLoginSuccess}
      />
    </section>
  );
}
