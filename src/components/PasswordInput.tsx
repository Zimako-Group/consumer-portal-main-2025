import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  label: string;
  error?: string;
  placeholder?: string;
  showRequirements?: boolean;
}

interface ValidationRule {
  id: string;
  label: string;
  validate: (value: string) => boolean;
}

const passwordRules: ValidationRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    validate: (value) => value.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    validate: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    validate: (value) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: 'One number',
    validate: (value) => /[0-9]/.test(value),
  },
  {
    id: 'special',
    label: 'One special character (!@#$%^&*)',
    validate: (value) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
  }
];

export const isPasswordValid = (password: string): boolean => {
  return passwordRules.every((rule) => rule.validate(password));
};

export default function PasswordInput({
  value,
  onChange,
  name,
  label,
  error,
  placeholder,
  showRequirements = false
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [shouldShowRequirements, setShouldShowRequirements] = useState(false);

  useEffect(() => {
    if (showRequirements) {
      if (value && !isPasswordValid(value)) {
        setShouldShowRequirements(true);
      } else {
        setShouldShowRequirements(false);
      }
    }
  }, [value, showRequirements]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`block w-full pr-10 rounded-md shadow-sm ${
            error ? 'border-red-500' : 'border-gray-300'
          } focus:ring-theme focus:border-theme`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {showRequirements && shouldShowRequirements && (
        <div className="mt-2 space-y-2">
          {passwordRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center space-x-2 text-sm"
            >
              {rule.validate(value) ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-300" />
              )}
              <span
                className={
                  rule.validate(value)
                    ? 'text-green-600'
                    : 'text-gray-500'
                }
              >
                {rule.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}