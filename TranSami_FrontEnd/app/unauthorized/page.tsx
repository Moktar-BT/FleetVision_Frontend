'use client';

import Link from 'next/link';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Lock } from 'lucide-react';

export default function UnauthorizedPage() {
  const { language } = useApp();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Lock size={64} className="text-red-500" />
        </div>
        
        <h1 className="text-6xl font-bold text-foreground mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">{t(language, 'unauthorized')}</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {language === 'fr' 
            ? 'Vous n\'avez pas les autorisations nécessaires pour accéder à cette page.' 
            : 'You do not have the necessary permissions to access this page.'}
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
