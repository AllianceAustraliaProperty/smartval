import React, { useState, useEffect } from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  error,
  required = false,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => {
  return (
    <input
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        text-gray-900 bg-white
        ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
        ${className}
      `}
      {...props}
    />
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ error, className = '', ...props }) => {
  return (
    <textarea
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        resize-vertical min-h-[80px] text-gray-900 bg-white
        ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
        ${className}
      `}
      {...props}
    />
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ error, options, className = '', ...props }) => {
  return (
    <select
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        text-gray-900 bg-white
        ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
        ${className}
      `}
      {...props}
    >
      <option value="">Select an option</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        className={`
          h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded
          ${className}
        `}
        {...props}
      />
      <label className="text-sm text-gray-900 font-medium">{label}</label>
    </div>
  );
};

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ error, className = '', ...props }) => {
  return (
    <input
      type="file"
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
        file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100
        ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
        ${className}
      `}
      {...props}
    />
  );
};

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  onValueChange?: (value: string) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ 
  error, 
  className = '', 
  value = '',
  onValueChange,
  onChange,
  ...props 
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  // Format number with commas
  const formatNumber = (num: string) => {
    const cleanNumber = num.replace(/[^\d.]/g, '');
    if (cleanNumber === '') return '';
    
    const parts = cleanNumber.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return parts.join('.');
  };

  // Remove commas for actual value
  const cleanValue = (val: string) => {
    return val.replace(/,/g, '');
  };

  useEffect(() => {
    setIsHydrated(true);
    if (value && value !== '0') {
      setDisplayValue(formatNumber(String(value)));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleaned = cleanValue(inputValue);
    
    // Only allow numbers and one decimal point
    if (!/^\d*\.?\d*$/.test(cleaned)) return;
    
    setDisplayValue(formatNumber(inputValue));
    
    // Create a new event with cleaned value for form handling
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: cleaned
      }
    };
    
    // Call both callbacks
    onValueChange?.(cleaned);
    onChange?.(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    
    console.log('CurrencyInput changed:', { inputValue, cleaned, displayValue: formatNumber(inputValue) });
  };

  // Use unformatted value during SSR/before hydration
  const inputValue = isHydrated ? displayValue : String(value);

  return (
    <input
      {...props}
      type="text"
      value={inputValue}
      onChange={handleChange}
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        text-gray-900 bg-white
        ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
        ${className}
      `}
    />
  );
}; 