import { HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'gray';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
  xl: 'h-16 w-16 border-4',
};

const variantClasses = {
  primary: 'border-[#10b981] border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-gray-300 border-t-transparent',
};

export function Spinner({
  size = 'md',
  variant = 'primary',
  className = '',
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function InlineSpinner({ size = 'sm', variant = 'primary', className = '' }: SpinnerProps) {
  return <Spinner size={size} variant={variant} className={`inline-block ${className}`} />;
}
