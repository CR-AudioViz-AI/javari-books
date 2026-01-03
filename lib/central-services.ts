/**
 * Javari Books - Central Services Integration
 * ============================================
 * 
 * All auth, credits, and analytics go through craudiovizai.com/api
 * This follows the Henderson Standard for all apps.
 * 
 * @version 2.0.0
 * @date January 2, 2026
 */

const CENTRAL_API_BASE = process.env.NEXT_PUBLIC_CENTRAL_API_URL || 'https://craudiovizai.com/api';
const APP_ID = 'javari-books';

interface CentralResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  credits: number;
  plan: string;
}

interface CreditBalance {
  balance: number;
  plan: string;
  expires_at?: string;
}

// Admin emails that get free access to all features
export const ADMIN_EMAILS = [
  'royhenderson@craudiovizai.com',
  'cindyhenderson@craudiovizai.com'
];

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const CentralAuth = {
  async getSession(): Promise<CentralResponse<User>> {
    try {
      const res = await fetch(`${CENTRAL_API_BASE}/auth/session`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async signIn(email: string, password: string): Promise<CentralResponse<User>> {
    try {
      const res = await fetch(`${CENTRAL_API_BASE}/auth/signin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async signOut(): Promise<CentralResponse<void>> {
    try {
      const res = await fetch(`${CENTRAL_API_BASE}/auth/signout`, {
        method: 'POST',
        credentials: 'include'
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getOAuthUrl(provider: 'google' | 'github' | 'discord'): string {
    return `${CENTRAL_API_BASE}/auth/oauth/${provider}?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`;
  },

  getLoginUrl(): string {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    return `https://craudiovizai.com/login?redirect=${encodeURIComponent(currentUrl)}`;
  },

  isAdmin(email: string): boolean {
    return ADMIN_EMAILS.includes(email);
  }
};

// ============================================================================
// CREDITS
// ============================================================================

export const CentralCredits = {
  async getBalance(): Promise<CentralResponse<CreditBalance>> {
    try {
      const res = await fetch(`${CENTRAL_API_BASE}/credits/balance`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async deduct(amount: number, reason: string): Promise<CentralResponse<CreditBalance>> {
    try {
      const res = await fetch(`${CENTRAL_API_BASE}/credits/deduct`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason, app_id: APP_ID })
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async refund(amount: number, reason: string): Promise<CentralResponse<CreditBalance>> {
    try {
      const res = await fetch(`${CENTRAL_API_BASE}/credits/refund`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason, app_id: APP_ID })
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async hasEnough(required: number): Promise<{ hasEnough: boolean; balance: number }> {
    const result = await this.getBalance();
    if (result.success && result.data) {
      return { hasEnough: result.data.balance >= required, balance: result.data.balance };
    }
    return { hasEnough: false, balance: 0 };
  }
};

// ============================================================================
// ANALYTICS
// ============================================================================

export const CentralAnalytics = {
  async track(event: string, properties?: Record<string, any>): Promise<void> {
    try {
      await fetch(`${CENTRAL_API_BASE}/analytics/track`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, properties, app_id: APP_ID })
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  },

  async pageView(page: string): Promise<void> {
    await this.track('page_view', { page, app_id: APP_ID });
  }
};

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

export const CentralActivity = {
  async log(action: string, details?: Record<string, any>): Promise<void> {
    try {
      await fetch(`${CENTRAL_API_BASE}/activity/log`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details, app_id: APP_ID })
      });
    } catch (error) {
      console.warn('Activity logging failed:', error);
    }
  }
};

// ============================================================================
// USER ASSETS
// ============================================================================

export const CentralAssets = {
  async save(asset: {
    name: string;
    type: 'audiobook' | 'ebook';
    storagePath: string;
    publicUrl: string;
    fileSize: number;
    metadata?: Record<string, any>;
  }): Promise<CentralResponse<{ id: string }>> {
    try {
      const res = await fetch(`${CENTRAL_API_BASE}/assets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...asset, app_id: APP_ID })
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async list(type?: 'audiobook' | 'ebook'): Promise<CentralResponse<any[]>> {
    try {
      const url = type 
        ? `${CENTRAL_API_BASE}/assets?type=${type}&app_id=${APP_ID}`
        : `${CENTRAL_API_BASE}/assets?app_id=${APP_ID}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      return res.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

// ============================================================================
// CREDIT COSTS FOR JAVARI BOOKS
// ============================================================================

export const CREDIT_COSTS = {
  EBOOK_TO_AUDIO: 100,
  AUDIO_TO_EBOOK: 75,
  GENERATE_EBOOK: 50,
  SPLIT_AUDIOBOOK: 25,
  SPLIT_EBOOK: 25,
  BULK_CONVERT_PER_ITEM: 100
} as const;

export default {
  CentralAuth,
  CentralCredits,
  CentralAnalytics,
  CentralActivity,
  CentralAssets,
  CREDIT_COSTS,
  ADMIN_EMAILS
};
