import { useState, useCallback, FormEvent } from 'react';

interface UseFormSubmitOptions<T = any> {
  onSubmit: (data?: T) => Promise<{ success?: boolean; error?: string } | void>;
  onSuccess?: (result?: any) => void;
  onError?: (error: string) => void;
  resetOnSuccess?: boolean;
}

export function useFormSubmit<T = any>(options: UseFormSubmitOptions<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e?: FormEvent, data?: T) => {
      if (e) {
        e.preventDefault();
      }

      // Clear previous states
      setError('');
      setSuccess(false);

      // Set loading state IMMEDIATELY (before any async work)
      setIsSubmitting(true);

      try {
        const result = await options.onSubmit(data);

        if (result && 'error' in result && result.error) {
          setError(result.error);
          options.onError?.(result.error);
        } else {
          setSuccess(true);
          options.onSuccess?.(result);

          // Auto-clear success after 3 seconds
          if (options.resetOnSuccess !== false) {
            setTimeout(() => {
              setSuccess(false);
            }, 3000);
          }
        }
      } catch (err: any) {
        const errorMessage = err.message || 'An error occurred';
        setError(errorMessage);
        options.onError?.(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setError('');
    setSuccess(false);
    setIsSubmitting(false);
  }, []);

  return {
    isSubmitting,
    error,
    success,
    setError,
    setSuccess,
    handleSubmit,
    reset,
  };
}
