// Google Analytics 4 measurement ID from environment variable
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Check if GA is enabled
export const isGAEnabled = !!GA_MEASUREMENT_ID;

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

// Track pageviews
export const pageview = (url: string) => {
  if (!isGAEnabled) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

// Set user ID for authenticated users
export const setUserId = (userId: string) => {
    if (!isGAEnabled || !userId) return;

   window.gtag('set', 'user_properties', {
        user_id: userId
    });

    // 2. Update the configuration to include the user_id
    window.gtag('config', GA_MEASUREMENT_ID, {
        user_id: userId,
        update: true // This is the key! It updates the current session config
    });
};

// Track custom events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (!isGAEnabled) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
