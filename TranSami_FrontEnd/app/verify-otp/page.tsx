'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Globe, Sun, Moon, AlertCircle, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import background from '../../public/backgound3.png';
import logo1_dark from '../../public/logo-blanc.png';
import logo1_light from '../../public/logoSTE-removebg-preview.png';

const OTP_TIMER_SECONDS = 600; // 10 minutes

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { language, setLanguage, darkMode, setDarkMode } = useApp();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMER_SECONDS);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password');
    }
  }, [email, router]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const formatTime = useCallback((s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, []);

  const handleOtpChange = (value: string) => {
    // Only allow digits, max 6
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSecondsLeft(OTP_TIMER_SECONDS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (language === 'fr' ? 'Erreur réseau' : 'Network error');
      setError(message);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const result = await authApi.verifyOtp(email, otp);
      if (result.verified) {
        router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
      } else {
        setError(language === 'fr' ? 'Code invalide' : 'Invalid code');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (language === 'fr' ? 'Code invalide ou expiré' : 'Invalid or expired code');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center">

      {/* Background */}
      <Image src={background} alt="Transport background" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

      {/* Back to forgot-password */}
      <button
        onClick={() => router.push('/forgot-password')}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10 text-white/90"
        title={language === 'fr' ? 'Retour' : 'Back'}
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
                {t(language, 'verifyOtpTitle')}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {t(language, 'otpSentTo')}{' '}
                <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* OTP Input */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {language === 'fr' ? 'Code de vérification' : 'Verification code'}
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground/30 placeholder:tracking-[0.5em]"
                />
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {secondsLeft > 0 ? (
                    <>
                      {t(language, 'codeExpiresIn')}{' '}
                      <span className="font-bold text-foreground">{formatTime(secondsLeft)}</span>
                    </>
                  ) : (
                    <span className="text-red-500 font-semibold">
                      {language === 'fr' ? 'Code expiré' : 'Code expired'}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={secondsLeft > 0 || resending}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {resending && <RefreshCw size={12} className="animate-spin" />}
                  {t(language, 'resendCode')}
                </button>
              </div>

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
                disabled={loading || otp.length !== 6}
                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? t(language, 'loading') : t(language, 'verifyButton')}
              </button>

              {/* Link back */}
              <p className="text-center text-xs text-muted-foreground pt-1">
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  {language === 'fr' ? 'Changer l\'adresse e-mail' : 'Change email address'}
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
