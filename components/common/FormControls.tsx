
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, error, hint, className = '', ...props }) => {
  const isNumberType = props.type === 'number';
  
  // Prevent wheel event from changing number input value
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (isNumberType && document.activeElement === e.currentTarget) {
      e.currentTarget.blur();
    }
  };
  
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium text-surface-300 mb-2">
        {label}
        {props.required && <span className="text-primary-400 ml-1">*</span>}
      </label>
      <input
        id={id}
        {...props}
        onWheel={isNumberType ? handleWheel : props.onWheel}
        className={`
          input-modern
          w-full px-4 py-3 
          bg-surface-800/50 
          border border-white/10
          rounded-xl
          text-white placeholder-surface-500
          focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
          transition-all duration-200
          ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}
          ${isNumberType ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}
          ${className}
        `}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-surface-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-danger-400">{error}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, id, error, hint, className = '', ...props }) => (
  <div className="mb-5">
    <label htmlFor={id} className="block text-sm font-medium text-surface-300 mb-2">
      {label}
      {props.required && <span className="text-primary-400 ml-1">*</span>}
    </label>
    <textarea
      id={id}
      rows={4}
      {...props}
      className={`
        input-modern
        w-full px-4 py-3 
        bg-surface-800/50 
        border border-white/10
        rounded-xl
        text-white placeholder-surface-500
        focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
        transition-all duration-200
        resize-none
        ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}
        ${className}
      `}
    />
    {hint && !error && <p className="mt-1.5 text-xs text-surface-500">{hint}</p>}
    {error && <p className="mt-1.5 text-xs text-danger-400">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, id, error, hint, options, className = '', ...props }) => (
  <div className="mb-5">
    <label htmlFor={id} className="block text-sm font-medium text-surface-300 mb-2">
      {label}
      {props.required && <span className="text-primary-400 ml-1">*</span>}
    </label>
    <div className="relative">
      <select
        id={id}
        {...props}
        className={`
          input-modern
          w-full px-4 py-3 pr-10
          bg-surface-800/50 
          border border-white/10
          rounded-xl
          text-white
          focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
          transition-all duration-200
          appearance-none
          cursor-pointer
          ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}
          ${className}
        `}
      >
        <option value="" className="bg-surface-900 text-surface-400">選擇...</option>
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-surface-900 text-white">
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
    {hint && !error && <p className="mt-1.5 text-xs text-surface-500">{hint}</p>}
    {error && <p className="mt-1.5 text-xs text-danger-400">{error}</p>}
  </div>
);

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, id, className = '', ...props }) => (
  <label htmlFor={id} className={`flex items-center gap-3 cursor-pointer group ${className}`}>
    <div className="relative">
      <input
        type="checkbox"
        id={id}
        {...props}
        className="peer sr-only"
      />
      <div className="w-5 h-5 rounded-md border border-white/20 bg-surface-800/50 
                      peer-checked:bg-primary-500 peer-checked:border-primary-500
                      peer-focus:ring-2 peer-focus:ring-primary-500/20
                      transition-all duration-200">
        <svg 
          className="w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={3} 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <svg 
        className="absolute top-0 left-0 w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={3} 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    </div>
    <span className="text-sm text-surface-300 group-hover:text-white transition-colors">{label}</span>
  </label>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  icon,
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyle = `
    inline-flex items-center justify-center
    font-medium rounded-xl
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `;
  
  const variantStyles: Record<string, string> = {
    primary: 'btn-primary text-white focus:ring-primary-500',
    secondary: 'btn-secondary text-white focus:ring-surface-500',
    danger: 'btn-danger text-white focus:ring-danger-500',
    neutral: 'bg-surface-700 text-surface-200 hover:bg-surface-600 focus:ring-surface-500',
    outline: 'bg-transparent text-primary-400 border-2 border-primary-500/50 hover:bg-primary-500/10 hover:border-primary-500 focus:ring-primary-500',
    ghost: 'bg-transparent text-surface-300 hover:bg-white/5 hover:text-white focus:ring-surface-500',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-2 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
};

// Card component for consistent styling
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md' }) => {
  const paddingStyles: Record<string, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`glass-card rounded-2xl ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
};

// Section Header component
interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, icon, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && <p className="text-xs text-surface-500">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Divider component
export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`divider my-6 ${className}`} />
);

// Form Group component
interface FormGroupProps {
  title: string;
  children: React.ReactNode;
}

export const FormGroup: React.FC<FormGroupProps> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-primary-400 mb-4 flex items-center gap-2">
      <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
      {title}
    </h3>
    <div className="pl-3 border-l border-white/5">
      {children}
    </div>
  </div>
);
