
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, error, ...props }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-textSecondary mb-1">{label}</label>
    <input
      id={id}
      {...props}
      className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-danger' : 'border-borderDefault'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-surface text-textPrimary placeholder-textSecondary`}
    />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, id, error, ...props }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-textSecondary mb-1">{label}</label>
    <textarea
      id={id}
      rows={3}
      {...props}
      className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-danger' : 'border-borderDefault'} rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-surface text-textPrimary placeholder-textSecondary`}
    />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, id, error, options, ...props }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-textSecondary mb-1">{label}</label>
    <select
      id={id}
      {...props}
      className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-danger' : 'border-borderDefault'} bg-surface rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm text-textPrimary`}
    >
      <option value="">選擇...</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle = "font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150";
  
  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = 'bg-primary text-white hover:bg-primary-dark focus:ring-primary';
      break;
    case 'secondary':
      variantStyle = 'bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary';
      break;
    case 'danger':
      variantStyle = 'bg-danger text-white hover:bg-danger-dark focus:ring-danger';
      break;
    case 'neutral':
      variantStyle = 'bg-slate-200 text-textPrimary hover:bg-slate-300 focus:ring-slate-400';
      break;
    case 'outline':
      variantStyle = 'bg-transparent text-primary border border-primary hover:bg-primary hover:text-white focus:ring-primary';
      break;
  }

  let sizeStyle = '';
  switch (size) {
    case 'sm':
      sizeStyle = 'px-3 py-1.5 text-xs';
      break;
    case 'md':
      sizeStyle = 'px-4 py-2 text-sm';
      break;
    case 'lg':
      sizeStyle = 'px-6 py-3 text-base';
      break;
  }

  return (
    <button
      {...props}
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
    >
      {children}
    </button>
  );
};