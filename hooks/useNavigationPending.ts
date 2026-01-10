import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationOptions {
  onStart?: () => void;
  onComplete?: () => void;
}

export function useNavigationPending(options?: NavigationOptions) {
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const navigate = useCallback(
    (path: string) => {
      if (isNavigating) return; // Prevent double navigation

      setIsNavigating(true);
      options?.onStart?.();

      startTransition(() => {
        router.push(path);
        // Navigation complete will be handled by Next.js
        // The component will unmount, so we don't need onComplete here
      });
    },
    [router, isNavigating, options, startTransition]
  );

  const replace = useCallback(
    (path: string) => {
      if (isNavigating) return;

      setIsNavigating(true);
      options?.onStart?.();

      startTransition(() => {
        router.replace(path);
      });
    },
    [router, isNavigating, options, startTransition]
  );

  return {
    navigate,
    replace,
    isPending: isPending || isNavigating,
    isNavigating,
  };
}

// Simpler version for programmatic navigation
export function useNavigationState() {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const navigate = useCallback(
    (path: string) => {
      setIsNavigating(true);
      router.push(path);
      // NextTopLoader will show progress, we just need the immediate state
    },
    [router]
  );

  const replace = useCallback(
    (path: string) => {
      setIsNavigating(true);
      router.replace(path);
    },
    [router]
  );

  return {
    navigate,
    replace,
    isNavigating,
    setIsNavigating,
  };
}
