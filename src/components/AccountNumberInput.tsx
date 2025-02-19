import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AccountNumberInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
}

// Separate component for validation status icon to prevent unnecessary re-renders
const ValidationStatus = React.memo(({ 
  isValidating, 
  shouldShowStatus, 
  isValid 
}: { 
  isValidating: boolean;
  shouldShowStatus: boolean;
  isValid: boolean;
}) => {
  if (isValidating) {
    return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
  }
  if (shouldShowStatus) {
    return isValid ? 
      <Check className="h-5 w-5 text-green-500 opacity-100 transition-opacity duration-200" /> :
      <X className="h-5 w-5 text-red-500 opacity-100 transition-opacity duration-200" />;
  }
  return null;
});

ValidationStatus.displayName = 'ValidationStatus';

export default function AccountNumberInput({ value, onChange, error }: AccountNumberInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [shouldShowStatus, setShouldShowStatus] = useState(false);

  const validateAccountNumber = useCallback(async (inputValue: string) => {
    if (!inputValue || inputValue.length < 4) {
      setShouldShowStatus(false);
      setIsValid(false);
      setValidationMessage('');
      onChange(inputValue, false);
      return;
    }

    // Don't show loading state for quick responses
    const loadingTimeout = setTimeout(() => {
      setIsValidating(true);
    }, 150);

    try {
      const profilesRef = collection(db, 'profiles');
      const q = query(profilesRef, where('customerNumber', '==', inputValue));
      const querySnapshot = await getDocs(q);
      
      const valid = !querySnapshot.empty;
      let customerName = '';
      
      if (valid) {
        const userData = querySnapshot.docs[0].data();
        customerName = userData.fullName || '';
      }

      // Only update states if the input value hasn't changed during validation
      if (inputValue === value) {
        clearTimeout(loadingTimeout);
        setIsValidating(false);
        
        // Batch state updates together
        Promise.resolve().then(() => {
          setIsValid(valid);
          setValidationMessage(valid ? `Verified: ${customerName}` : 'Account number not found');
          setShouldShowStatus(true);
          onChange(inputValue, valid);
        });
      }
    } catch (error) {
      console.error('Error validating account number:', error);
      if (inputValue === value) {
        clearTimeout(loadingTimeout);
        setIsValidating(false);
        
        // Batch state updates together
        Promise.resolve().then(() => {
          setIsValid(false);
          setValidationMessage('Error validating account number');
          setShouldShowStatus(true);
          onChange(inputValue, false);
        });
      }
    }
  }, [onChange, value]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateAccountNumber(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, validateAccountNumber]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    if (/^[a-zA-Z0-9]*$/.test(newValue) || newValue === '') {
      onChange(newValue, false);
      setShouldShowStatus(false);
    }
  };

  const borderColorClass = error 
    ? 'border-red-500' 
    : isValid && shouldShowStatus
    ? 'border-green-500' 
    : 'border-gray-300';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Account Number * <span className="text-xs text-gray-500">(letters and numbers only)</span>
      </label>
      <div className="mt-1 relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          className={`block w-full pr-10 rounded-md shadow-sm transition-all duration-200 ${borderColorClass} focus:ring-theme focus:border-theme`}
          placeholder="Enter your account number"
          maxLength={20}
          pattern="[a-zA-Z0-9]*"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ValidationStatus
            isValidating={isValidating}
            shouldShowStatus={shouldShowStatus}
            isValid={isValid}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {!error && shouldShowStatus && validationMessage && (
        <p className={`mt-1 text-sm ${isValid ? 'text-green-600' : 'text-red-500'}`}>
          {validationMessage}
        </p>
      )}
    </div>
  );
}