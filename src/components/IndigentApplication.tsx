import React, { useState } from 'react';
import { Download, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import OnlineIndigentApplication from './OnlineIndigentApplication';

interface IndigentApplicationProps {
  onClose: () => void;
}

const IndigentApplication: React.FC<IndigentApplicationProps> = ({ onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [showOnlineApplication, setShowOnlineApplication] = useState(false);

  const handleDownloadForms = async () => {
    try {
      setDownloading(true);
      
      // Create a link element
      const link = document.createElement('a');
      link.href = '/pdfs/indigent_application_form.pdf';
      link.download = 'Mohokare_Indigent_Application_Form.pdf';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Forms downloaded successfully!');
    } catch (error) {
      console.error('Error downloading forms:', error);
      toast.error('Failed to download forms. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleApplyNow = () => {
    setShowOnlineApplication(true);
  };

  if (showOnlineApplication) {
    return <OnlineIndigentApplication onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-4xl shadow-2xl transform transition-all overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center mb-4 flex-wrap">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-theme mr-2" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome to the Mohokare Indigent Application Portal
            </h1>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-2">
            Choose how you'd like to proceed with your indigent status application
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto px-2">
          {/* Download Forms Option */}
          <button
            onClick={handleDownloadForms}
            disabled={downloading}
            className="group relative bg-white dark:bg-dark-hover rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-100 dark:border-gray-800 hover:border-theme dark:hover:border-theme disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-theme text-white p-2 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
              <Download className={`w-4 h-4 sm:w-6 sm:h-6 ${downloading ? 'animate-bounce' : ''}`} />
            </div>
            <div className="text-left">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">Download Forms</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Download and print the application forms to submit in person at our offices
              </p>
              <div className="mt-4 text-theme font-medium text-sm sm:text-base">
                {downloading ? 'Downloading...' : 'Click to download →'}
              </div>
            </div>
          </button>

          {/* Apply Now Option */}
          <button
            onClick={handleApplyNow}
            className="group relative bg-white dark:bg-dark-hover rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-100 dark:border-gray-800 hover:border-theme dark:hover:border-theme"
          >
            <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-theme text-white p-2 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="text-left">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">Apply Now</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Complete your application online with our easy-to-use digital form
              </p>
              <div className="mt-4 text-theme font-medium text-sm sm:text-base">Start application →</div>
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 sm:mt-8 md:mt-12 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Need help? Contact our support team at support@mohokare.gov.za
        </div>
      </div>
    </div>
  );
};

export default IndigentApplication;
