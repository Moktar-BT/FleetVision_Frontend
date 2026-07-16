'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { Language } from './i18n';
import { adminApi } from './api-client'; // à importer

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');
  const [darkMode, setDarkModeState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Charger depuis localStorage et backend
  useEffect(() => {
    const loadPreferences = async () => {
      // D'abord charger depuis localStorage pour un affichage immédiat
      const savedLang = localStorage.getItem('language') as Language | null;
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedLang) setLanguageState(savedLang);
      if (savedDarkMode) {
        const isDark = JSON.parse(savedDarkMode);
        setDarkModeState(isDark);
        if (isDark) document.documentElement.classList.add('dark');
      }

      // Ensuite, si un token existe, on récupère le profil pour écraser
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (token) {
        try {
          const profile = await adminApi.getProfile();
          // Mettre à jour l'état avec les valeurs du backend
          if (profile.language) {
            const backendLang = profile.language === 'FRANCAIS' ? 'fr' : 'en';
            setLanguageState(backendLang);
            localStorage.setItem('language', backendLang);
          }
          if (profile.theme) {
            const isDark = profile.theme === 'DARK';
            setDarkModeState(isDark);
            localStorage.setItem('darkMode', JSON.stringify(isDark));
            if (isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
          }
        } catch (error) {
          console.error('Failed to load admin profile for preferences', error);
        }
      }
      setMounted(true);
    };
    loadPreferences();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // Si l'utilisateur est connecté, on met à jour le backend
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
      const backendLang = lang === 'fr' ? 'FRANCAIS' : 'ANGLAIS';
      adminApi.updateProfile({ language: backendLang }).catch(console.error);
    }
  };

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
    localStorage.setItem('darkMode', JSON.stringify(dark));
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    // Mettre à jour le backend si connecté
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
      const backendTheme = dark ? 'DARK' : 'LIGHT';
      adminApi.updateProfile({ theme: backendTheme }).catch(console.error);
    }
  };

  if (!mounted) return null; // éviter un flash

  return (
    <AppContext.Provider value={{ language, setLanguage, darkMode, setDarkMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}