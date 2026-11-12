'use client';

import React from 'react';

export interface PillFormFieldProps {
  label?: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  hint?: string;
}

export const PillFormField: React.FC<PillFormFieldProps> = ({
  label,
  children,
  error,
  required = false,
  className = '',
  labelClassName = '',
  hint,
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && (
        <label className={`block text-sm font-semibold text-gray-800 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-500 px-3">{hint}</p>}
      {error && <p className="text-xs text-red-600 px-3 font-medium">{error}</p>}
    </div>
  );
};

export interface PillInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const PillInput = React.forwardRef<HTMLInputElement, PillInputProps>(
  ({ icon, error, className = '', wrapperClassName = '', disabled, ...props }, ref) => {
    return (
      <div
        className={`
          relative flex items-center w-full min-h-[46px] px-3.5 py-1.5
          rounded-full border-2 bg-white transition-all
          ${error ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100' : 'border-gray-400/80 hover:border-[#006ABE] focus-within:border-[#006ABE] focus-within:ring-2 focus-within:ring-[#006ABE]/20'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}
          ${wrapperClassName}
        `}
      >
        {icon && (
          <div className="flex items-center justify-center text-gray-500 shrink-0 ml-1 mr-2 pointer-events-none">
            {typeof icon === 'string' ? (
              <span className="text-sm font-semibold text-gray-500">{icon}</span>
            ) : (
              icon
            )}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`
            w-full bg-transparent text-sm text-gray-800 placeholder-gray-400
            focus:outline-none font-normal
            ${disabled ? 'cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

PillInput.displayName = 'PillInput';

export interface PillCurrencyInputProps extends Omit<PillInputProps, 'icon'> {
  iconLabel?: string;
}

export const PillCurrencyInput = React.forwardRef<HTMLInputElement, PillCurrencyInputProps>(
  ({ iconLabel = '$', ...props }, ref) => {
    return (
      <PillInput
        ref={ref}
        type="text"
        inputMode="decimal"
        icon={<span className="text-sm font-semibold text-gray-500">{iconLabel}</span>}
        {...props}
      />
    );
  }
);

PillCurrencyInput.displayName = 'PillCurrencyInput';
