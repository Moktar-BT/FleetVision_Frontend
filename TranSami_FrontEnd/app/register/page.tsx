'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Globe, Eye, EyeOff, Sun, Moon, AlertCircle, CheckCircle2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Background from '@/public/backgound3.png';
import logo1_dark from '@/public/logo-blanc.png';
import logo1_light from '@/public/logoSTE-removebg-preview.png';

interface FormData {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  confirmMotDePasse: string;
  telephones: string[];
  adresse: string;
  nomEntreprise: string;
  matriculeFiscale: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    confirmMotDePasse: '',
    telephones: [''],
    adresse: '',
    nomEntreprise: '',
    matriculeFiscale: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { language, setLanguage, darkMode, setDarkMode } = useApp();

  const label = (fr: string, en: string) => (language === 'fr' ? fr : en);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...form.telephones];
    newPhones[index] = value;
    setForm((prev) => ({ ...prev, telephones: newPhones }));
  };

  const addPhone = () => {
    setForm((prev) => ({ ...prev, telephones: [...prev.telephones, ''] }));
  };

  const removePhone = (index: number) => {
    if (form.telephones.length === 1) return;
    const newPhones = form.telephones.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, telephones: newPhones }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.motDePasse !== form.confirmMotDePasse) {
      setError(label('Les mots de passe ne correspondent pas.', 'Passwords do not match.'));
      return;
    }

    const nonEmptyPhones = form.telephones.filter((phone) => phone.trim() !== '');
    if (nonEmptyPhones.length === 0) {
      setError(label('Au moins un numéro de téléphone est requis.', 'At least one phone number is required.'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          motDePasse: form.motDePasse,
          telephones: nonEmptyPhones,
          adresse: form.adresse,
          nomEntreprise: form.nomEntreprise,
          matriculeFiscale: form.matriculeFiscale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = label("Erreur d'inscription", 'Registration error');
        if (data.message) msg = data.message;
        else if (data.error) msg = data.error;
        else if (data.erreur) msg = data.erreur;
        else if (data.detail) msg = data.detail;
        else if (typeof data === 'string') msg = data;
        else if (data.errors?.length)
          msg = data.errors.map((e: any) => e.defaultMessage || e.message).join(', ');
        else msg = JSON.stringify(data);
        throw new Error(msg);
      }

      // Compte créé avec succès → on ne connecte PAS automatiquement l'utilisateur,
      // on affiche un message de succès puis on redirige vers la page de connexion.
      setSuccess(
        label(
          'Compte créé avec succès ! Redirection vers la connexion...',
          'Account created successfully! Redirecting to sign in...'
        )
      );
      setTimeout(() => {
        router.push('/signin');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-10">
      <Image src={Background} alt="Transport background" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

      {/* Back to sign-in */}
      <button
        onClick={() => router.push('/signin')}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10 text-white/90"
        title={label('Retour à la connexion', 'Back to sign in')}
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-semibold">
          {label('Retour', 'Back')}
        </span>
      </button>

      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10"
          title={darkMode ? t(language, 'lightMode') : t(language, 'darkMode')}
        >
          {darkMode ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} className="text-white/80" />}
        </button>
        <button
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-pointer border border-white/10"
        >
          <Globe size={16} className="text-white/80" />
          <span className="text-sm font-semibold text-white/90">{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Container élargi : max-w-4xl au lieu de max-w-lg */}
      <div className="relative z-10 w-full max-w-4xl px-4">
        <div className="bg-card/95 backdrop-blur-md rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary  to-primary/50" />
          <div className="p-8">
            <div className="flex justify-center mb-6">
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

            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-foreground">{label('Créer un compte', 'Create an account')}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {label('Remplissez les informations pour vous inscrire', 'Fill in the information to register')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Grille 2 colonnes pour la majorité des champs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {label('Nom', 'Last name')}
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={form.nom}
                    required
                    onChange={handleChange}
                    placeholder={label('Nom', 'last name')}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                {/* Prénom */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {label('Prénom', 'First name')}
                  </label>
                  <input
                    type="text"
                    name="prenom"
                    value={form.prenom}
                    required
                    onChange={handleChange}
                    placeholder={label('Prénom', 'First name')}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {t(language, 'email')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    required
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                {/* Nom entreprise */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {label("Nom de l'entreprise", 'Company name')}
                  </label>
                  <input
                    type="text"
                    name="nomEntreprise"
                    value={form.nomEntreprise}
                    required
                    onChange={handleChange}
                    placeholder="Entreprise"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                {/* Matricule fiscal */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {label('Matricule fiscal', 'Tax registration number')}
                  </label>
                  <input
                    type="text"
                    name="matriculeFiscale"
                    value={form.matriculeFiscale}
                    required
                    onChange={handleChange}
                    placeholder="1234567X"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                {/* Adresse */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {label('Adresse', 'Address')}
                  </label>
                  <input
                    type="text"
                    name="adresse"
                    value={form.adresse}
                    onChange={handleChange}
                    placeholder="Sfax, Tunisie"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {/* Téléphones : occupe les 2 colonnes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {label('Numéros de téléphone', 'Phone numbers')}
                </label>
                {form.telephones.map((phone, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(idx, e.target.value)}
                      placeholder="+216 XX XXX XXX"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    {form.telephones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhone(idx)}
                        className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPhone}
                  className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                >
                  <Plus size={16} /> {label('Ajouter un numéro', 'Add a number')}
                </button>
              </div>

              {/* Mot de passe + Confirmation : 2 colonnes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {t(language, 'password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="motDePasse"
                      value={form.motDePasse}
                      required
                      minLength={6}
                      onChange={handleChange}
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

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {label('Confirmer le mot de passe', 'Confirm password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmMotDePasse"
                      value={form.confirmMotDePasse}
                      required
                      minLength={6}
                      onChange={handleChange}
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
              </div>

              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? t(language, 'loading') : label('Créer mon compte', 'Create my account')}
              </button>

              <p className="text-center text-xs text-muted-foreground pt-1">
                {label('Vous avez déjà un compte ?', 'Already have an account?')}{' '}
                <button
                  type="button"
                  onClick={() => router.push('/signin')}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  {label('Se connecter', 'Sign in')}
                </button>
              </p>
            </form>
          </div>
        </div>
        <p className="text-center text-xs text-white/40 mt-5">
          © {new Date().getFullYear()} FleetVision — {label('Tous droits réservés', 'All rights reserved')}
        </p>
      </div>
    </div>
  );
}