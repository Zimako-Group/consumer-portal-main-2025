import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Send, User, Home, Phone, FileText, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface OnlineIndigentApplicationProps {
  onClose: () => void;
}

type ApplicationStep = {
  id: number;
  title: string;
  description: string;
};

interface Occupant {
  initials: string;
  surname: string;
  relationship: string;
  idNumber: string;
  employment: {
    companyName: string;
    address: string;
    employerContact: string;
    salary: string;
    employmentStatus: 'Permanent' | 'Seasonal' | 'Unemployed';
  };
}

interface EmploymentDetails {
  companyName: string;
  address: string;
  employerContact: string;
  salary: string;
  employmentStatus: 'Permanent' | 'Seasonal' | 'Unemployed' | 'SASSA';
  sassaSrdNumber?: string;
}

interface FormData {
  // Personal Information
  fullName: string;
  maidenName: string;
  idNumber: string;
  dateOfBirth: string;
  taxpayerNumber: string;
  maritalStatus: string;
  spouseFullName: string;
  spouseIdNumber: string;
  spouseTaxpayerNumber: string;
  address: string;

  // Household Details
  numberOfDependants: string;
  occupants: Occupant[];

  // Income & Employment
  employmentDetails: EmploymentDetails;

  // Supporting Documents
  idDocument: File | null;
  proofOfResidence: File | null;
  bankStatements: File | null;

  // Application Status
  lastSaved: string | null;
  status: 'draft' | 'submitted';
  currentStep: number;
}

const APPLICATION_STEPS: ApplicationStep[] = [
  {
    id: 1,
    title: 'Personal Information',
    description: 'Basic personal details and contact information'
  },
  {
    id: 2,
    title: 'Household Details',
    description: 'Information about your household and dependents'
  },
  {
    id: 3,
    title: 'Income & Employment',
    description: 'Employment status and sources of income'
  },
  {
    id: 4,
    title: 'Supporting Documents',
    description: 'Upload required documentation'
  },
  {
    id: 5,
    title: 'Review & Submit',
    description: 'Review your application before submission'
  }
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' }
];

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' }
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'Permanent', label: 'Permanent Employment' },
  { value: 'Seasonal', label: 'Seasonal Employment' },
  { value: 'SASSA', label: 'SASSA Beneficiary' },
  { value: 'Unemployed', label: 'Unemployed' }
];

const OnlineIndigentApplication: React.FC<OnlineIndigentApplicationProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [shouldSave, setShouldSave] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    // Personal Information
    fullName: '',
    maidenName: '',
    idNumber: '',
    dateOfBirth: '',
    taxpayerNumber: '',
    maritalStatus: '',
    spouseFullName: '',
    spouseIdNumber: '',
    spouseTaxpayerNumber: '',
    address: '',

    // Household Details
    numberOfDependants: '0',
    occupants: [],

    // Income & Employment
    employmentDetails: {
      companyName: '',
      address: '',
      employerContact: '',
      salary: '',
      employmentStatus: 'Unemployed' as const
    },

    // Supporting Documents
    idDocument: null,
    proofOfResidence: null,
    bankStatements: null,

    // Application Status
    lastSaved: null,
    status: 'draft',
    currentStep: 1
  });

  // Load saved application data
  useEffect(() => {
    const loadSavedApplication = async () => {
      if (!currentUser?.email) return;

      try {
        const applicationRef = doc(db, 'indigentApplications', currentUser.email);
        const applicationDoc = await getDoc(applicationRef);

        if (applicationDoc.exists() && applicationDoc.data().status === 'draft') {
          const savedData = applicationDoc.data();
          setFormData(prev => ({
            ...prev,
            ...savedData,
            // Don't restore file uploads as they can't be stored directly
            idDocument: null,
            proofOfResidence: null,
            bankStatements: null
          }));
          setCurrentStep(savedData.currentStep || 1);
          toast.success('Loaded your saved application');
        }
      } catch (error) {
        console.error('Error loading saved application:', error);
        toast.error('Failed to load saved application');
      }
    };

    loadSavedApplication();
  }, [currentUser]);

  // Auto-save functionality
  useEffect(() => {
    if (!shouldSave) return;

    const autoSaveApplication = async () => {
      if (!currentUser?.email || formData.status === 'submitted') return;

      try {
        setAutoSaveStatus('saving');
        const applicationRef = doc(db, 'indigentApplications', currentUser.email);

        // Create a save-safe version of the form data (excluding File objects)
        const saveData = {
          ...formData,
          idDocument: null,
          proofOfResidence: null,
          bankStatements: null,
          lastSaved: new Date().toISOString(),
          currentStep
        };

        await setDoc(applicationRef, saveData, { merge: true });
        setAutoSaveStatus('saved');

        // Update the form data with the save time
        setFormData(prev => ({
          ...prev,
          lastSaved: saveData.lastSaved
        }));
      } catch (error) {
        console.error('Error auto-saving application:', error);
        setAutoSaveStatus('error');
      } finally {
        setShouldSave(false);
      }
    };

    // Debounce the auto-save to prevent too frequent saves
    const timeoutId = setTimeout(autoSaveApplication, 1000);
    return () => clearTimeout(timeoutId);
  }, [shouldSave, formData, currentStep, currentUser]);

  const [idErrors, setIdErrors] = useState({
    idNumber: '',
    spouseIdNumber: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Handle nested fields (e.g., employmentDetails.companyName)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Trigger auto-save after user input
    setShouldSave(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, [fieldName]: file }));
      // Trigger auto-save after file upload
      setShouldSave(true);
    }
  };

  const handleIdNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow only numbers, backspace, delete, tab, arrows
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'];
    if (!allowedKeys.includes(e.key) && !/\d/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleDependantsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setFormData(prev => ({
      ...prev,
      numberOfDependants: e.target.value,
      occupants: Array(value).fill({
        initials: '',
        surname: '',
        relationship: '',
        idNumber: '',
        employment: {
          companyName: '',
          address: '',
          employerContact: '',
          salary: '',
          employmentStatus: 'Unemployed' as const
        }
      })
    }));

    // Trigger auto-save after dependants change
    setShouldSave(true);
  };

  const handleOccupantChange = (index: number, field: keyof Occupant | 'employment.companyName' | 'employment.address' | 'employment.employerContact' | 'employment.salary' | 'employment.employmentStatus', value: string) => {
    setFormData(prev => ({
      ...prev,
      occupants: prev.occupants.map((occupant, i) => {
        if (i !== index) return occupant;

        if (field.startsWith('employment.')) {
          const employmentField = field.split('.')[1] as keyof typeof occupant.employment;
          return {
            ...occupant,
            employment: {
              ...occupant.employment,
              [employmentField]: value
            }
          };
        }

        return {
          ...occupant,
          [field]: value
        };
      })
    }));

    // Trigger auto-save after occupant change
    setShouldSave(true);
  };

  const handleOccupantIdNumberChange = (index: number, value: string) => {
    // Only allow numbers
    const numbersOnly = value.replace(/[^0-9]/g, '');

    if (numbersOnly.length <= 13) {
      handleOccupantChange(index, 'idNumber', numbersOnly);
    }
  };

  const handleOccupantIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A
      (e.keyCode === 65 && e.ctrlKey === true) ||
      // Allow: Ctrl+C
      (e.keyCode === 67 && e.ctrlKey === true) ||
      // Allow: Ctrl+V
      (e.keyCode === 86 && e.ctrlKey === true) ||
      // Allow: Ctrl+X
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    // Block any non-number inputs
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, APPLICATION_STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    // Add validation logic for each step
    switch (currentStep) {
      case 1:
        if (!formData.fullName || !formData.idNumber || !formData.taxpayerNumber || !formData.address) {
          toast.error('Please fill in all required fields');
          return false;
        }
        if (formData.idNumber.length !== 13) {
          toast.error('ID number must be 13 digits');
          return false;
        }
        if (formData.maritalStatus === 'married') {
          if (!formData.spouseFullName || !formData.spouseIdNumber || !formData.spouseTaxpayerNumber) {
            toast.error('Please fill in all spouse information');
            return false;
          }
          if (formData.spouseIdNumber.length !== 13) {
            toast.error('Spouse ID number must be 13 digits');
            return false;
          }
        }
        break;
      case 2:
        if (!formData.numberOfDependants || !formData.occupants.length) {
          toast.error('Please fill in all required fields');
          return false;
        }
        break;
      case 3:
        if (!formData.employmentDetails.employmentStatus) {
          toast.error('Please select your employment status');
          return false;
        }
        if (formData.employmentDetails.employmentStatus !== 'Unemployed') {
          if (!formData.employmentDetails.companyName ||
            !formData.employmentDetails.address ||
            !formData.employmentDetails.employerContact ||
            !formData.employmentDetails.salary) {
            toast.error('Please fill in all employment details');
            return false;
          }
        }
        if (formData.employmentDetails.employmentStatus === 'SASSA' && !formData.employmentDetails.sassaSrdNumber) {
          toast.error('Please enter your SASSA SRD number');
          return false;
        }
        break;
      case 4:
        if (!formData.idDocument || !formData.proofOfResidence) {
          toast.error('Please upload all required documents');
          return false;
        }
        break;
      default:
        return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      // TODO: Implement submission logic to your backend
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API call
      toast.success('Application submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {/* Full Name & Maiden Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name & Surname *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                placeholder="Enter your full name and surname"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maiden Name (if applicable)
              </label>
              <input
                type="text"
                name="maidenName"
                value={formData.maidenName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                placeholder="Enter maiden name if applicable"
              />
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  onKeyDown={handleIdNumberKeyDown}
                  maxLength={13}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white ${
                    idErrors.idNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your 13-digit ID number"
                  required
                />
                {idErrors.idNumber && (
                  <p className="mt-1 text-sm text-red-500">{idErrors.idNumber}</p>
                )}
                {formData.idNumber.length > 0 && formData.idNumber.length === 13 && !idErrors.idNumber && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date of Birth *
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                  required
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Taxpayer Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Taxpayer Reference Number *
              </label>
              <input
                type="text"
                name="taxpayerNumber"
                value={formData.taxpayerNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                placeholder="Enter your taxpayer reference number"
                required
              />
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marital Status *
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                required
              >
                <option value="">Select marital status</option>
                {MARITAL_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Spouse Information - Only shown if married */}
            {formData.maritalStatus === 'married' && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Spouse Information</h3>

                {/* Spouse Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse's Full Name & Surname *
                  </label>
                  <input
                    type="text"
                    name="spouseFullName"
                    value={formData.spouseFullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                    placeholder="Enter spouse's full name and surname"
                    required
                  />
                </div>

                {/* Spouse ID Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse's ID Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="spouseIdNumber"
                      value={formData.spouseIdNumber}
                      onChange={handleInputChange}
                      onKeyDown={handleIdNumberKeyDown}
                      maxLength={13}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white ${
                        idErrors.spouseIdNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter spouse's 13-digit ID number"
                      required
                    />
                    {idErrors.spouseIdNumber && (
                      <p className="mt-1 text-sm text-red-500">{idErrors.spouseIdNumber}</p>
                    )}
                    {formData.spouseIdNumber.length > 0 && formData.spouseIdNumber.length === 13 && !idErrors.spouseIdNumber && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spouse Taxpayer Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse's Taxpayer Reference Number *
                  </label>
                  <input
                    type="text"
                    name="spouseTaxpayerNumber"
                    value={formData.spouseTaxpayerNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                    placeholder="Enter spouse's taxpayer reference number"
                    required
                  />
                </div>
              </div>
            )}

            {/* Residential Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Residential Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                placeholder="Enter your residential address"
                required
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Dependants *
              </label>
              <select
                name="numberOfDependants"
                value={formData.numberOfDependants}
                onChange={handleDependantsChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-white"
              >
                {[...Array(11)].map((_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            {formData.numberOfDependants !== '0' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Occupant Details
                </h3>
                {formData.occupants.map((occupant, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Occupant {index + 1}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Initials *
                        </label>
                        <input
                          type="text"
                          value={occupant.initials}
                          onChange={(e) => handleOccupantChange(index, 'initials', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-white"
                          placeholder="Enter initials"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Surname *
                        </label>
                        <input
                          type="text"
                          value={occupant.surname}
                          onChange={(e) => handleOccupantChange(index, 'surname', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-white"
                          placeholder="Enter surname"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Relationship *
                        </label>
                        <select
                          value={occupant.relationship}
                          onChange={(e) => handleOccupantChange(index, 'relationship', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-white"
                          required
                        >
                          <option value="">Select relationship</option>
                          {RELATIONSHIP_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ID Number *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={occupant.idNumber}
                          onChange={(e) => handleOccupantIdNumberChange(index, e.target.value)}
                          onKeyDown={handleOccupantIdKeyDown}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                          placeholder="Enter ID number (13 digits)"
                          maxLength={13}
                          required
                        />
                      </div>
                    </div>

                    {/* Employment Details Section */}
                    <div className="mt-6">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-4">
                        Employment Details
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={occupant.employment.companyName}
                            onChange={(e) => handleOccupantChange(index, 'employment.companyName', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                            placeholder="Enter company name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={occupant.employment.address}
                            onChange={(e) => handleOccupantChange(index, 'employment.address', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                            placeholder="Enter company address"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tel/Cell of Employer
                          </label>
                          <input
                            type="text"
                            value={occupant.employment.employerContact}
                            onChange={(e) => handleOccupantChange(index, 'employment.employerContact', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                            placeholder="Enter employer contact"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Salary per w/m
                          </label>
                          <input
                            type="text"
                            value={occupant.employment.salary}
                            onChange={(e) => handleOccupantChange(index, 'employment.salary', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                            placeholder="Enter salary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Employment Status
                          </label>
                          <select
                            value={occupant.employment.employmentStatus}
                            onChange={(e) => handleOccupantChange(index, 'employment.employmentStatus', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                          >
                            {EMPLOYMENT_STATUS_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
              Please select your employment status to proceed
            </p>

            {/* Employment Status Dropdown - Always shown first */}
            <div className="space-y-2 max-w-md mx-auto">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Employment Status *
              </label>
              <select
                name="employmentDetails.employmentStatus"
                value={formData.employmentDetails.employmentStatus}
                onChange={(e) => {
                  handleInputChange(e);
                  // Clear employment details if switching to unemployed
                  if (e.target.value === 'Unemployed') {
                    setFormData(prev => ({
                      ...prev,
                      employmentDetails: {
                        ...prev.employmentDetails,
                        companyName: '',
                        address: '',
                        employerContact: '',
                        salary: '',
                        employmentStatus: 'Unemployed'
                      }
                    }));
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white text-base"
                required
              >
                <option value="">Select employment status</option>
                {EMPLOYMENT_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence mode="wait">
              {(formData.employmentDetails.employmentStatus === 'Permanent' ||
                formData.employmentDetails.employmentStatus === 'Seasonal') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 mt-8 max-w-2xl mx-auto"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="employmentDetails.companyName"
                        value={formData.employmentDetails.companyName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                        placeholder="Enter company name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Monthly Salary *
                      </label>
                      <input
                        type="text"
                        name="employmentDetails.salary"
                        value={formData.employmentDetails.salary}
                        onChange={(e) => {
                          // Only allow numbers and decimal points
                          const value = e.target.value.replace(/[^\d.]/g, '');
                          // Ensure only one decimal point
                          const parts = value.split('.');
                          const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
                          handleInputChange({
                            ...e,
                            target: { ...e.target, value: formatted }
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                        placeholder="Enter monthly salary"
                        required
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Company Address *
                      </label>
                      <input
                        type="text"
                        name="employmentDetails.address"
                        value={formData.employmentDetails.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                        placeholder="Enter company address"
                        required
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Employer Contact *
                      </label>
                      <input
                        type="tel"
                        name="employmentDetails.employerContact"
                        value={formData.employmentDetails.employerContact}
                        onChange={(e) => {
                          // Only allow numbers and basic phone number characters
                          const value = e.target.value.replace(/[^\d+\-() ]/g, '');
                          handleInputChange({
                            ...e,
                            target: { ...e.target, value }
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                        placeholder="Enter employer contact number"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {formData.employmentDetails.employmentStatus === 'SASSA' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 mt-8 max-w-md mx-auto"
                >
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      SASSA SRD Number *
                    </label>
                    <input
                      type="text"
                      name="employmentDetails.sassaSrdNumber"
                      value={formData.employmentDetails.sassaSrdNumber || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover text-gray-900 dark:text-white"
                      placeholder="Enter your SASSA SRD number"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID Document *
              </label>
              <input
                type="file"
                name="idDocument"
                onChange={(e) => handleFileUpload(e, 'idDocument')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Proof of Residence *
              </label>
              <input
                type="file"
                name="proofOfResidence"
                onChange={(e) => handleFileUpload(e, 'proofOfResidence')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Statements (if applicable)
              </label>
              <input
                type="file"
                name="bankStatements"
                onChange={(e) => handleFileUpload(e, 'bankStatements')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover"
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Review & Submit
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please review your application before submission.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name & Surname
                </label>
                <p className="text-gray-900 dark:text-white">{formData.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID Number
                </label>
                <p className="text-gray-900 dark:text-white">{formData.idNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Taxpayer Reference Number
                </label>
                <p className="text-gray-900 dark:text-white">{formData.taxpayerNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Residential Address
                </label>
                <p className="text-gray-900 dark:text-white">{formData.address}</p>
              </div>
              {formData.maritalStatus === 'married' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse's Full Name & Surname
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.spouseFullName}</p>
                </div>
              )}
              {formData.maritalStatus === 'married' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse's ID Number
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.spouseIdNumber}</p>
                </div>
              )}
              {formData.maritalStatus === 'married' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spouse's Taxpayer Reference Number
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.spouseTaxpayerNumber}</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <div>Step content not available</div>;
    }
  };

  const renderAutoSaveStatus = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-gray-500 text-sm">
            <Save className="w-4 h-4 mr-1 animate-pulse" />
            Saving...
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-green-500 text-sm">
            <Save className="w-4 h-4 mr-1" />
            Saved {formData.lastSaved ? new Date(formData.lastSaved).toLocaleTimeString() : ''}
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            Error saving
          </div>
        );
      default:
        return null;
    }
  };

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

        {/* Auto-save Status */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
          {renderAutoSaveStatus()}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {APPLICATION_STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  currentStep === step.id
                    ? 'text-theme'
                    : currentStep > step.id
                    ? 'text-green-500'
                    : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    currentStep === step.id
                      ? 'bg-theme text-white'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {step.id}
                </div>
                <div className="text-xs font-medium hidden sm:block">{step.title}</div>
              </div>
            ))}
          </div>
          <div className="relative mt-2">
            <div className="absolute top-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full rounded">
              <div
                className="absolute top-0 left-0 h-full bg-theme rounded transition-all duration-300"
                style={{ width: `${((currentStep - 1) / (APPLICATION_STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {APPLICATION_STEPS[currentStep - 1].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {APPLICATION_STEPS[currentStep - 1].description}
          </p>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>
          {currentStep === APPLICATION_STEPS.length ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-theme text-white rounded-lg flex items-center space-x-2 hover:bg-theme/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-theme text-white rounded-lg flex items-center space-x-2 hover:bg-theme/90"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineIndigentApplication;
