'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { pageview, isGAEnabled } from '@/lib/gtag';

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isGAEnabled) return;

    // Construct full URL with search params
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Send pageview to GA4
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}
