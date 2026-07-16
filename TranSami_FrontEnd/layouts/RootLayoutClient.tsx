'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  const pathname = usePathname();
  const { language, darkMode } = useApp();

  // Apply theme-aware background image on <body> for ALL pages
  useEffect(() => {
    const bgUrl = darkMode
      ? '/DarkmodeBackground.png'
      : '/lightmodeBackground.png';

    document.body.style.backgroundImage = `url(${bgUrl})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
  }, [darkMode]);

  const isPublicPage = pathname === '/' || pathname === '/signin' || pathname === '/register' || pathname === '/unauthorized' || pathname === '/landing' || pathname === '/forgot-password' || pathname === '/verify-otp' || pathname === '/reset-password';

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Get header title based on active path
  const getHeaderTitle = (path: string, lang: 'fr' | 'en') => {
    if (path.startsWith('/dashboard')) return t(lang, 'dashboard');
    if (path.startsWith('/trucks')) return t(lang, 'trucks');
    if (path.startsWith('/DeliveryNotes')) return lang === 'fr' ? 'Bons de Livraison' : 'Delivery Notes';
    if (path.startsWith('/fuel')) return t(lang, 'fuelManagement');
    if (path.startsWith('/repairs')) return lang === 'fr' ? 'Réparations & Vidanges' : 'Repairs & Oil Changes';
    if (path.startsWith('/chauffeurs')) return lang === 'fr' ? 'Chauffeurs' : 'Drivers';
    if (path.startsWith('/remorques')) return lang === 'fr' ? 'Remorques' : 'Trailers';
    if (path.startsWith('/charges')) return lang === 'fr' ? 'Gestion des Charges' : 'Expenses Management';
    if (path.startsWith('/invoices')) return lang === 'fr' ? 'Factures' : 'Invoices';
    if (path.startsWith('/clients')) return t(lang, 'clients');
    if (path.startsWith('/fournisseurs')) return t(lang, 'fournisseurs');
    if (path.startsWith('/stations')) return t(lang, 'stations');
    if (path.startsWith('/products')) return t(lang, 'products');
    if (path.startsWith('/settings')) return t(lang, 'settings');
    return '';
  };

  const headerTitle = getHeaderTitle(pathname, language as 'fr' | 'en');

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto">
        <Header title={headerTitle} />
        {children}
      </main>
    </div>
  );
}
