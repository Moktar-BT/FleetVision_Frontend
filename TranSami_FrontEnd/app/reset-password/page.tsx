'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Globe, Eye, EyeOff, Sun, Moon, AlertCircle, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import background from '../../public/backgound3.png';
import logo1_dark from '../../public/logo-blanc.png';
import logo1_light from '../../public/logoSTE-removebg-preview.png';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const otp = searchParams.get('otp') || '';
  const { language, setLanguage, darkMode, setDarkMode } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if missing params
  useEffect(() => {
    if (!email || !otp) {
      router.replace('/forgot-password');
    }
  }, [email, otp, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (newPassword.length < 8) {
      setError(t(language, 'passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t(language, 'passwordsDontMatch'));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (language === 'fr' ? 'Erreur réseau' : 'Network error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!email || !otp) return null;

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
                  width={208}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-foreground">
                {t(language, 'resetPasswordTitle')}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {t(language, 'resetPasswordSubtitle')}
              </p>
            </div>

            {/* Success state */}
            {success ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle size={28} className="text-emerald-500" />
                  </div>
                  <h2 className="text-base font-bold text-foreground text-center">
                    {t(language, 'resetSuccessTitle')}
                  </h2>
                  <p className="text-xs text-muted-foreground text-center">
                    {t(language, 'resetSuccessSubtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/signin')}
                  className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  {t(language, 'backToLogin')}
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {t(language, 'newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      required
                      minLength={8}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                    >
                      {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {t(language, 'confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      required
                      minLength={8}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Password mismatch inline warning */}
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {t(language, 'passwordsDontMatch')}
                  </p>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  <Lock size={14} />
                  {loading ? t(language, 'loading') : t(language, 'resetPasswordButton')}
                </button>

                {/* Link back */}
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
            )}
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
