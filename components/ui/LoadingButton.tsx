import { ButtonHTMLAttributes, ReactNode } from 'react';
import { InlineSpinner } from './Spinner';

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variantClasses = {
  primary: 'bg-[#10b981] text-white hover:bg-[#059669] focus:ring-[#10b981] disabled:bg-[#10b981]/50',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 disabled:bg-gray-100/50',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 disabled:bg-red-500/50',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400 disabled:bg-transparent disabled:text-gray-400',
};

const sizeClasses = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-3 text-sm',
  lg: 'px-6 py-4 text-base',
};

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={`
        relative inline-flex items-center justify-center gap-2
        border border-transparent rounded-lg
        font-bold uppercase tracking-wide
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <InlineSpinner
          size="sm"
          variant={variant === 'primary' || variant === 'danger' ? 'white' : 'primary'}
        />
      )}
      <span className={loading ? 'opacity-90' : ''}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
}

export function IconButton({
  loading = false,
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  disabled,
  ...props
}: LoadingButtonProps) {
  const isDisabled = loading || disabled;

  const iconSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={`
        relative inline-flex items-center justify-center
        rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981]
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant]}
        ${iconSizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <InlineSpinner
          size="sm"
          variant={variant === 'primary' || variant === 'danger' ? 'white' : 'primary'}
        />
      ) : (
        children
      )}
    </button>
  );
}
