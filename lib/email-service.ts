'use server';

import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { loadTranslations, t } from '@/lib/server-translations';

const mailgun = new Mailgun(formData);

// Mailgun region - support both MAILGUN_REGION and MAILGUN_API_URL
let mailgunUrl = 'https://api.mailgun.net'; // Default US
if (process.env.MAILGUN_API_URL) {
  mailgunUrl = process.env.MAILGUN_API_URL;
} else if (process.env.MAILGUN_REGION === 'eu') {
  mailgunUrl = 'https://api.eu.mailgun.net';
}

// Initialize Mailgun client
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
  url: mailgunUrl,
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';
const FROM_EMAIL_ADDRESS = process.env.MAILGUN_FROM_EMAIL || 'noreply@idir.ai';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const BRAND_NAME = process.env.BRAND_NAME || 'idir.ai';
const MAILGUN_TEMPLATE_NAME = 'forgot-password';

console.log('[EMAIL] Mailgun initialized');
console.log('[EMAIL] API URL:', mailgunUrl);
console.log('[EMAIL] Domain:', MAILGUN_DOMAIN);
console.log('[EMAIL] From email:', FROM_EMAIL_ADDRESS);
console.log('[EMAIL] App URL:', APP_URL);
console.log('[EMAIL] Brand name:', BRAND_NAME);
console.log('[EMAIL] Template:', MAILGUN_TEMPLATE_NAME);
console.log('[EMAIL] API Key (first 10 chars):', process.env.MAILGUN_API_KEY?.substring(0, 10) + '...');

interface PasswordResetEmailParams {
  to: string;
  firstName: string;
  resetUrl: string;
  locale: string;
}

/**
 * Get localized template variables for password reset email using translations
 */
async function getPasswordResetVariables(
  firstName: string,
  resetUrl: string,
  locale: string
) {
  // Normalize locale to match our translation files
  const normalizedLocale = locale.startsWith('es') ? 'es' : 'en';
  const currentYear = new Date().getFullYear().toString();

  // Load translations for the locale
  const translations = await loadTranslations(normalizedLocale);

  // Helper to get translated text with variables
  const translate = (key: string, vars?: Record<string, string>) =>
    t(translations, key, vars);

  return {
    language: normalizedLocale,
    subject: translate('resetPassword.email.subject'),
    preheader: translate('resetPassword.email.preheader'),
    greeting: translate('resetPassword.email.greeting', {
      firstName: firstName || (normalizedLocale === 'es' ? 'Usuario' : 'User')
    }),
    message1: translate('resetPassword.email.message1'),
    message2: translate('resetPassword.email.message2'),
    buttonText: translate('resetPassword.email.buttonText'),
    expiryText: translate('resetPassword.email.expiryText'),
    ignoreText: translate('resetPassword.email.ignoreText'),
    closingText: translate('resetPassword.email.closingText'),
    signature: translate('resetPassword.email.signature'),
    footerText: translate('resetPassword.email.footerText', { year: currentYear }),
    alternativeText: translate('resetPassword.email.alternativeText'),
    resetUrl,
    brandName: BRAND_NAME,
    appUrl: APP_URL,
    year: currentYear,
  };
}

/**
 * Get localized subject line using translations
 */
async function getSubject(locale: string): Promise<string> {
  const normalizedLocale = locale.startsWith('es') ? 'es' : 'en';
  const translations = await loadTranslations(normalizedLocale);
  return t(translations, 'resetPassword.email.subject');
}

/**
 * Get localized sender name and preposition using translations
 */
async function getSenderName(locale: string): Promise<string> {
  const normalizedLocale = locale.startsWith('es') ? 'es' : 'en';
  const translations = await loadTranslations(normalizedLocale);
  const name = t(translations, 'resetPassword.email.senderName');
  const preposition = t(translations, 'resetPassword.email.senderPreposition');
  return `${name} ${preposition} ${BRAND_NAME}`;
}

/**
 * Send password reset email using Mailgun template
 */
export async function sendPasswordResetEmail({
  to,
  firstName,
  resetUrl,
  locale,
}: PasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required environment variables
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.error('[EMAIL] Mailgun not configured. Missing MAILGUN_API_KEY or MAILGUN_DOMAIN');
      return { success: false, error: 'Email service not configured' };
    }

    // Get localized content
    const [templateVariables, subject, senderName] = await Promise.all([
      getPasswordResetVariables(firstName, resetUrl, locale),
      getSubject(locale),
      getSenderName(locale),
    ]);

    // Construct sender with localized preposition: "Idir from idir.ai <noreply@idir.ai>"
    const fromEmail = `${senderName} <${FROM_EMAIL_ADDRESS}>`;

    // Send email via Mailgun using template
    const messageData = {
      from: fromEmail,
      to: [to],
      subject,
      template: MAILGUN_TEMPLATE_NAME,
      'h:X-Mailgun-Variables': JSON.stringify(templateVariables),
    };

    console.log('[EMAIL] Sending email with data:', {
      from: fromEmail,
      to: [to],
      subject,
      template: MAILGUN_TEMPLATE_NAME,
      domain: MAILGUN_DOMAIN,
      locale,
    });

    const response = await mg.messages.create(MAILGUN_DOMAIN, messageData);

    console.log('[EMAIL] Password reset email sent successfully:', {
      to,
      template: MAILGUN_TEMPLATE_NAME,
      locale,
      messageId: response.id,
      status: response.status,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    console.error('[EMAIL] Error details:', {
      message: error.message,
      status: error.status,
      details: error.details,
      type: error.type,
      domain: MAILGUN_DOMAIN,
      apiUrl: mailgunUrl,
    });
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}
