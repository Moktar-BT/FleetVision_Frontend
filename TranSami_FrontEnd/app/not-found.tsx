'use client';

import Link from 'next/link';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  const { language } = useApp();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <AlertCircle size={64} className="text-primary" />
        </div>
        
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">{t(language, 'pageNotFound')}</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {language === 'fr' 
            ? 'La page que vous recherchez n\'existe pas ou a été supprimée.' 
            : 'The page you are looking for does not exist or has been removed.'}
        </p>

        <Link
          href="/dashboard"
          className="inline-block bg-primary hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
        >
          {t(language, 'backHome')}
        </Link>
      </div>
    </div>
  );
}
