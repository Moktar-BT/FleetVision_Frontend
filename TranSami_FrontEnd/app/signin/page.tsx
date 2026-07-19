'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Globe, Eye, EyeOff, Sun, Moon, AlertCircle, ArrowLeft } from 'lucide-react';
import background from '../../public/backgound3.png';
import logo1_dark from '../../public/logo-blanc.png';
import logo1_light from '../../public/logoSTE-removebg-preview.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { language, setLanguage, darkMode, setDarkMode } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fleetvsionbackend-production.up.railway.app/api';
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse: password }),
      });
      const data = await response.json();
      if (!response.ok) {
        let msg = 'Erreur de connexion';
        if (data.message) msg = data.message;
        else if (data.error) msg = data.error;
        else if (data.erreur) msg = data.erreur;
        else if (data.detail) msg = data.detail;
        else if (typeof data === 'string') msg = data;
        else if (data.errors?.length) msg = data.errors.map((e: any) => e.defaultMessage || e.message).join(', ');
        else msg = JSON.stringify(data);
        throw new Error(msg);
      }
      const { access_token, refresh_token, email: userEmail, nom, prenom, nomEntreprise, cheminLogoEntreprise } = data;

      // Stockage selon la case à cocher
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('access_token', access_token);
      storage.setItem('refresh_token', refresh_token);
      storage.setItem('user', JSON.stringify({ email: userEmail, nom, prenom, nomEntreprise, cheminLogoEntreprise }));

      // Nettoyer l'autre stockage pour éviter les conflits
      if (rememberMe) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user');
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">

      {/* Background */}
      <Image src={background} alt="Transport background" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

      {/* Back to landing */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10 text-white/90"
        title={language === 'fr' ? "Retour à l'accueil" : 'Back to home'}
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
                {language === 'fr' ? 'Connexion' : 'Sign in'}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'fr' ? 'Accédez à votre espace de gestion' : 'Access your management space'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {t(language, 'email')}
                </label>
                <input
                  type="email" value={email} required
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {t(language, 'password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} required minLength={6}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Se souvenir de moi' : 'Remember me'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-xs text-primary font-semibold hover:underline transition-colors cursor-pointer"
                >
                  {t(language, 'forgotPassword')}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? t(language, 'loading') : t(language, 'loginButton')}
              </button>

              {/* Link to Register */}
              <p className="text-center text-xs text-muted-foreground pt-1">
                {language === 'fr' ? "Pas encore de compte ?" : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  {language === 'fr' ? "S'inscrire" : 'Register'}
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
