import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

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
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 font-medium px-3">{error}</p>
      )}
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, icon, className = '', disabled, ...props }, ref) => {
    if (icon) {
      return (
        <div
          className={`
            relative flex items-center w-full min-h-[46px] px-3.5 py-1.5
            rounded-full border-2 bg-white transition-all
            ${error ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100' : 'border-gray-400/80 hover:border-gray-500 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}
          `}
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-400/80 text-gray-500 shrink-0 mr-2.5 pointer-events-none">
            {typeof icon === 'string' ? (
              <span className="text-xs font-semibold">{icon}</span>
            ) : (
              icon
            )}
          </div>
          <input
            ref={ref}
            disabled={disabled}
            className={`
              w-full bg-transparent text-sm text-gray-900 placeholder-gray-400
              focus:outline-none font-normal
              ${disabled ? 'cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`
          w-full min-h-[46px] px-5 py-2.5 border-2 border-gray-400/80 rounded-full shadow-sm placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600
          text-sm text-gray-900 bg-white transition-all
          ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'hover:border-gray-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`
          w-full p-4 border-2 border-gray-400/80 rounded-2xl shadow-sm placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600
          resize-vertical min-h-[90px] text-sm text-gray-900 bg-white transition-all
          ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'hover:border-gray-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options?: { value: string; label: string }[];
  icon?: React.ReactNode;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, options, children, icon, placeholder, className = '', disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full border border-gray-400/80 text-gray-500 shrink-0 pointer-events-none z-10">
            {typeof icon === 'string' ? (
              <span className="text-xs font-semibold">{icon}</span>
            ) : (
              icon
            )}
          </div>
        )}
        <select
          ref={ref}
          disabled={disabled}
          className={`
            w-full min-h-[46px] ${icon ? 'pl-13' : 'px-5'} pr-11 border-2 border-gray-400/80 rounded-full shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600
            text-sm text-gray-900 bg-white appearance-none cursor-pointer transition-all
            ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'hover:border-gray-500'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}
            ${className}
          `}
          {...props}
        >
          {options ? (
            <>
              <option value="">{placeholder || 'Select an option'}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </>
          ) : (
            children
          )}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
          <ChevronDown className="w-5 h-5 text-gray-500" strokeWidth={2.5} />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="flex items-center space-x-2.5 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={`
            h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer
            ${className}
          `}
          {...props}
        />
        <label className="text-sm text-gray-800 font-medium select-none cursor-pointer">{label}</label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ error, className = '', ...props }) => {
  return (
    <input
      type="file"
      className={`
        w-full px-5 py-2.5 border-2 border-gray-400/80 rounded-full shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600
        file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0
        file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100 transition-all text-sm
        ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'hover:border-gray-500'}
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
  disabled,
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
    
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: cleaned
      }
    };
    
    onValueChange?.(cleaned);
    onChange?.(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
  };

  const inputValue = isHydrated ? displayValue : String(value);

  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-3.5 flex items-center justify-center w-7 h-7 rounded-full border border-gray-400/80 text-gray-500 shrink-0 pointer-events-none text-xs font-semibold z-10">
        $
      </div>
      <input
        {...props}
        type="text"
        disabled={disabled}
        value={inputValue}
        onChange={handleChange}
        className={`
          w-full min-h-[46px] pl-13 pr-5 border-2 border-gray-400/80 rounded-full shadow-sm placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600
          text-sm text-gray-900 bg-white transition-all
          ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'hover:border-gray-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}
          ${className}
        `}
      />
    </div>
  );
}; 

interface MultiSelectDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  placeholder?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  value,
  onChange,
  error,
  className = '',
  placeholder = 'Select options'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValues = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

  const handleToggle = (optionValue: string) => {
    let newSelected;
    if (selectedValues.includes(optionValue)) {
      newSelected = selectedValues.filter(v => v !== optionValue);
    } else {
      newSelected = [...selectedValues, optionValue];
    }
    onChange(newSelected.join(', '));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div 
        className={`
          w-full min-h-[46px] px-5 py-2.5 border-2 border-gray-400/80 rounded-full shadow-sm bg-white
          cursor-pointer flex justify-between items-center transition-all
          ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600'}
        `}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className={`block truncate text-sm ${selectedValues.length ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {selectedValues.length ? selectedValues.join(', ') : placeholder}
        </span>
        <ChevronDown className="w-5 h-5 text-gray-500 pointer-events-none flex-shrink-0" strokeWidth={2.5} />
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-auto p-1.5">
          {options.map((option) => (
            <div 
              key={option.value}
              className="px-3.5 py-2 flex items-center hover:bg-blue-50 rounded-xl cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggle(option.value);
              }}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                readOnly
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3 cursor-pointer"
              />
              <span className="text-gray-800 text-sm font-medium">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
