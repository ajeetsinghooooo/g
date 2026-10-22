import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RestaurantSettings, Offer } from '../types';
import { DEFAULT_RESTAURANT_SETTINGS } from '../config/restaurantConfig';
import { LanguageCode, getTranslation } from '../utils/i18n';
import { safeJson, apiFetch } from '../utils/api';

interface SettingsContextType {
  settings: RestaurantSettings;
  offers: Offer[];
  coupons: Offer[];
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_RESTAURANT_SETTINGS);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('kc_language') as LanguageCode;
    return saved || 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('kc_language', lang);
  };

  const t = useCallback(
    (key: string, fallback?: string) => {
      return getTranslation(language, key, fallback);
    },
    [language]
  );

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsRes, offersRes] = await Promise.all([
        apiFetch('/api/settings'),
        apiFetch('/api/offers/active'),
      ]);
      if (settingsRes.ok) {
        const data = await safeJson(settingsRes).catch(() => null);
        if (data) setSettings(data);
      }
      if (offersRes.ok) {
        const offersData = await safeJson(offersRes).catch(() => null);
        if (Array.isArray(offersData)) setOffers(offersData);
      }
    } catch (err) {
      console.warn('Failed to fetch restaurant settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Attach SSE Listener for live real-time sync
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('SETTINGS_UPDATE', (e) => {
      try {
        const updated = JSON.parse(e.data);
        setSettings(updated);
      } catch (err) {
        console.error('Failed to parse SSE settings event', err);
      }
    });

    eventSource.onerror = () => {
      // EventSource reconnects automatically
    };

    return () => {
      eventSource.close();
    };
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        offers,
        coupons: offers,
        language,
        setLanguage,
        t,
        refreshSettings: fetchSettings,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
