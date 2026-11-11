'use client';

import React from 'react';
import { Select } from './FormField';

export interface PillSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface PillSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
  error?: string;
  options?: PillSelectOption[];
  wrapperClassName?: string;
  placeholder?: string;
}

export const PillSelect = React.forwardRef<HTMLSelectElement, PillSelectProps>(
  ({ wrapperClassName, ...props }, ref) => {
    return <Select ref={ref} {...props} />;
  }
);

PillSelect.displayName = 'PillSelect';
