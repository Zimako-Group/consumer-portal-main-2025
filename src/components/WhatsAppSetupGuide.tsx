import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, Circle } from 'lucide-react';

interface StepProps {
  title: string;
  description: React.ReactNode;
  completed: boolean;
  current: boolean;
  onClick: () => void;
}

const Step: React.FC<StepProps> = ({ title, description, completed, current, onClick }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div 
      className={`p-4 rounded-lg cursor-pointer transition-all ${
        current 
          ? isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'
          : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        {completed ? (
          <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className={`h-6 w-6 ${current ? 'text-blue-500' : 'text-gray-400'} flex-shrink-0`} />
        )}
        <h3 className={`ml-2 font-medium ${current ? 'text-blue-600 dark:text-blue-400' : ''}`}>
          {title}
        </h3>
      </div>
      <div className="mt-2 ml-8 text-sm text-gray-600 dark:text-gray-300">
        {description}
      </div>
    </div>
  );
};

const WhatsAppSetupGuide: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const markStepCompleted = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };
  
  const steps = [
    {
      title: "Create a Meta Developer Account",
      description: (
        <div>
          <p className="mb-2">Create a Meta Developer account at <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">developers.facebook.com</a>.</p>
          <p>You'll need to sign up and verify your account with Meta.</p>
        </div>
      )
    },
    {
      title: "Create a Meta Business App",
      description: (
        <div>
          <p className="mb-2">From the Meta Developer Dashboard:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Create App"</li>
            <li>Select "Business" as the app type</li>
            <li>Enter your app name and contact email</li>
            <li>Complete the app creation process</li>
          </ol>
        </div>
      )
    },
    {
      title: "Add WhatsApp to Your App",
      description: (
        <div>
          <p className="mb-2">In your Meta Business App:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Navigate to the Dashboard</li>
            <li>Click "Add Products to Your App"</li>
            <li>Find and select "WhatsApp" from the product list</li>
            <li>Follow the setup instructions</li>
          </ol>
        </div>
      )
    },
    {
      title: "Set Up a WhatsApp Business Account",
      description: (
        <div>
          <p className="mb-2">You'll need to:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create or connect a WhatsApp Business Account</li>
            <li>Verify your business details</li>
            <li>Add a display name and business information</li>
          </ol>
          <p className="mt-2">This step may require business verification documents.</p>
        </div>
      )
    },
    {
      title: "Add a Phone Number",
      description: (
        <div>
          <p className="mb-2">In your WhatsApp Business Account:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Navigate to the Phone Numbers section</li>
            <li>Click "Add Phone Number"</li>
            <li>Choose a phone number or add your own</li>
            <li>Verify the phone number via SMS or call</li>
          </ol>
        </div>
      )
    },
    {
      title: "Generate Access Token",
      description: (
        <div>
          <p className="mb-2">To connect your app to WhatsApp:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to the "API Setup" section</li>
            <li>Generate a Temporary or Permanent Access Token</li>
            <li>Copy the token for use in your app</li>
          </ol>
          <p className="mt-2">Note: Temporary tokens expire after 24 hours.</p>
        </div>
      )
    },
    {
      title: "Set Up Webhook",
      description: (
        <div>
          <p className="mb-2">Configure your webhook to receive messages:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to "Webhooks" in your WhatsApp configuration</li>
            <li>Click "Configure Webhooks"</li>
            <li>Enter your webhook URL: <code className={`px-1 py-0.5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>https://your-domain.com/api/whatsapp/webhook</code></li>
            <li>Create a verify token (a random string) and enter it</li>
            <li>Select the webhook fields: <code className={`px-1 py-0.5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>messages</code> and <code className={`px-1 py-0.5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>message_status</code></li>
          </ol>
        </div>
      )
    },
    {
      title: "Create Message Templates",
      description: (
        <div>
          <p className="mb-2">For sending notifications, you need approved templates:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to "Message Templates" in your WhatsApp configuration</li>
            <li>Click "Create Template"</li>
            <li>Select a category (e.g., Utility, Authentication)</li>
            <li>Create templates for payment reminders, statements, etc.</li>
            <li>Submit for approval (can take 24-48 hours)</li>
          </ol>
          <p className="mt-2">Template examples needed:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>payment_reminder</li>
            <li>statement_notification</li>
            <li>payment_confirmation</li>
            <li>query_response</li>
            <li>service_interruption</li>
          </ul>
        </div>
      )
    },
    {
      title: "Configure Portal Settings",
      description: (
        <div>
          <p className="mb-2">Enter your WhatsApp credentials in the portal:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to WhatsApp Settings in the Admin Dashboard</li>
            <li>Enter your Phone Number ID</li>
            <li>Enter your Business Account ID</li>
            <li>Enter your Access Token</li>
            <li>Enter your Webhook Verify Token</li>
            <li>Enable WhatsApp integration</li>
          </ol>
        </div>
      )
    },
    {
      title: "Test Your Integration",
      description: (
        <div>
          <p className="mb-2">Verify your integration is working:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Send a test message from the WhatsApp Dashboard</li>
            <li>Check that you receive incoming messages</li>
            <li>Test each template message type</li>
            <li>Verify message status updates are working</li>
          </ol>
        </div>
      )
    }
  ];
  
  return (
    <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-6">WhatsApp Business API Setup Guide</h2>
      
      <div className="mb-6">
        <p className="text-sm mb-4">
          Follow these steps to set up the WhatsApp Business API integration for your Mohokare Consumer Portal.
          This guide will walk you through the process from creating a Meta Developer account to testing your integration.
        </p>
        
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6">
          <div 
            className="h-2 bg-blue-500 rounded-full transition-all" 
            style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Step
            key={index}
            title={`Step ${index + 1}: ${step.title}`}
            description={step.description}
            completed={completedSteps.includes(index)}
            current={currentStep === index}
            onClick={() => {
              setCurrentStep(index);
            }}
          />
        ))}
      </div>
      
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className={`px-4 py-2 rounded-md ${
            currentStep === 0
              ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-700'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Previous
        </button>
        
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => {
              markStepCompleted(currentStep);
              setCurrentStep(currentStep + 1);
            }}
            className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => markStepCompleted(currentStep)}
            className={`px-4 py-2 rounded-md ${
              completedSteps.includes(currentStep)
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {completedSteps.includes(currentStep) ? 'Completed' : 'Mark as Complete'}
          </button>
        )}
      </div>
    </div>
  );
};

export default WhatsAppSetupGuide;
