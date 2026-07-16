'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Globe, Sun, Moon, AlertCircle, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import background from '../../public/backgound3.png';
import logo1_dark from '../../public/logo-blanc.png';
import logo1_light from '../../public/logoSTE-removebg-preview.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const { language, setLanguage, darkMode, setDarkMode } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (err: unknown) {
      let message = language === 'fr' ? 'Erreur réseau' : 'Network error';
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes('aucun compte')) {
          message = language === 'fr'
            ? "Aucun compte n'est associé à cet e-mail"
            : "No account is associated with this email";
        } else {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">

      {/* Background */}
      <Image src={background} alt="Transport background" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

      {/* Back to login */}
      <button
        onClick={() => router.push('/signin')}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10 text-white/90"
        title={language === 'fr' ? 'Retour à la connexion' : 'Back to login'}
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-semibold">
          {language === 'fr' ? 'Retour' : 'Back'}
        </span>
      </button>

      {/* Top controls */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10"
          title={darkMode ? t(language, 'lightMode') : t(language, 'darkMode')}
        >
          {darkMode
            ? <Sun size={18} className="text-yellow-300" />
            : <Moon size={18} className="text-white/80" />}
        </button>
        <button
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10"
        >
          <Globe size={16} className="text-white/80" />
          <span className="text-sm font-semibold text-white/90">{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="bg-card/95 backdrop-blur-md rounded-3xl shadow-2xl border border-border/50 overflow-hidden">

          {/* Card top accent */}
          <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-52 h-20 relative flex items-center justify-center">
                <Image
                  src={darkMode ? logo1_dark : logo1_light}
                  alt="FleetVision TUNISIE"
                  fill
                  sizes="208px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-foreground">
                {t(language, 'forgotPasswordTitle')}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {t(language, 'forgotPasswordSubtitle')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {t(language, 'email')}
                </label>
                <div className="relative">
                  <input
                    type="email" value={email} required
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                    {t(language, 'codeSentSuccess')}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? t(language, 'loading') : t(language, 'sendCode')}
              </button>

              {/* Link to Login */}
              <p className="text-center text-xs text-muted-foreground pt-1">
                <button
                  type="button"
                  onClick={() => router.push('/signin')}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  {t(language, 'backToLogin')}
                </button>
              </p>

            </form>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-white/40 mt-5">
          © {new Date().getFullYear()} FleetVision — {language === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}
        </p>
      </div>
    </div>
  );
}
