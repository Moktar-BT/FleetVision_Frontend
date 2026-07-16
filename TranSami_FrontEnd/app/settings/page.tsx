'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import {
  Lock, Building2, Edit, Save, X, Upload,
  CheckCircle, User, Phone, MapPin, Mail,
  Sun, Moon, Globe, Shield, Camera, Plus, Trash2,
  Eye, EyeOff, RefreshCw, AlertCircle, Settings2,
} from 'lucide-react';
import { adminApi, AdminProfile } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50 shadow-sm';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const disabledInp = 'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-background border border-border text-foreground/80 text-sm cursor-not-allowed shadow-sm';

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden ${className}`}>
      <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Icon size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { language, setLanguage, darkMode, setDarkMode } = useApp();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [editForm, setEditForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephones: [] as string[],
    adresse: '',
    nomEntreprise: '',
    matriculeFiscale: '',
  });

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getProfile();
      setProfile(data);
      setEditForm({
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephones: data.telephones ? [...data.telephones] : [''],
        adresse: data.adresse,
        nomEntreprise: data.nomEntreprise,
        matriculeFiscale: data.matriculeFiscale || '',
      });
      setLogoPreview(data.cheminLogoEntreprise || null);
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...editForm.telephones];
    newPhones[index] = value;
    setEditForm({ ...editForm, telephones: newPhones });
  };

  const addPhone = () => setEditForm({ ...editForm, telephones: [...editForm.telephones, ''] });

  const removePhone = (index: number) => {
    if (editForm.telephones.length === 1) return;
    setEditForm({ ...editForm, telephones: editForm.telephones.filter((_, i) => i !== index) });
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateProfile({
        nom: editForm.nom,
        prenom: editForm.prenom,
        telephones: editForm.telephones.filter(p => p.trim() !== ''),
        adresse: editForm.adresse,
        nomEntreprise: editForm.nomEntreprise,
        matriculeFiscale: editForm.matriculeFiscale,
        language: profile.language,
        theme: profile.theme,
      });
      setProfile(updated);
      // 🔄 Notifie le Header pour qu'il se rafraîchisse
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setEditMode(false);
      setSuccessMessage(language === 'fr' ? 'Profil mis à jour avec succès' : 'Profile updated successfully');
      setShowSuccessModal(true);
    } catch {
      setErrorMessage(language === 'fr' ? 'Erreur lors de la mise à jour' : 'Update failed');
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        telephones: profile.telephones ? [...profile.telephones] : [''],
        adresse: profile.adresse,
        nomEntreprise: profile.nomEntreprise,
        matriculeFiscale: profile.matriculeFiscale || '',
      });
    }
    setEditMode(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await adminApi.uploadLogo(file);
      await loadProfile();
      // 🔄 Notifie le Header pour qu'il se rafraîchisse
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setSuccessMessage(language === 'fr' ? 'Logo mis à jour avec succès' : 'Logo updated successfully');
      setShowSuccessModal(true);
    } catch {
      setErrorMessage(language === 'fr' ? "Erreur lors de l'upload" : 'Upload failed');
      setShowErrorModal(true);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!profile) return;
    setUploadingLogo(true);
    try {
      const updated = await adminApi.updateProfile({
        nom: editForm.nom,
        prenom: editForm.prenom,
        telephones: editForm.telephones.filter(p => p.trim() !== ''),
        adresse: editForm.adresse,
        nomEntreprise: editForm.nomEntreprise,
        matriculeFiscale: editForm.matriculeFiscale,
        cheminLogoEntreprise: '',
        language: profile.language,
        theme: profile.theme,
      });
      setProfile(updated);
      setLogoPreview(null);
      // 🔄 Notifie le Header pour qu'il se rafraîchisse
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setSuccessMessage(language === 'fr' ? 'Logo supprimé avec succès' : 'Logo removed successfully');
      setShowSuccessModal(true);
    } catch {
      setErrorMessage(language === 'fr' ? 'Erreur lors de la suppression' : 'Failed to remove logo');
      setShowErrorModal(true);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setErrorMessage(language === 'fr' ? 'Les nouveaux mots de passe ne correspondent pas' : 'New passwords do not match');
      setShowErrorModal(true);
      return;
    }
    if (passwordForm.new.length < 6) {
      setErrorMessage(language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters');
      setShowErrorModal(true);
      return;
    }
    if (!passwordForm.current) {
      setErrorMessage(language === 'fr' ? 'Veuillez saisir votre mot de passe actuel' : 'Please enter your current password');
      setShowErrorModal(true);
      return;
    }
    setChangingPassword(true);
    try {
      await adminApi.changePassword(passwordForm.current, passwordForm.new, passwordForm.confirm);
      // 🔄 Notifie le Header pour qu'il se rafraîchisse
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setSuccessMessage(language === 'fr' ? 'Mot de passe modifié avec succès' : 'Password changed successfully');
      setShowSuccessModal(true);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      const isWrongOld = error.message?.toLowerCase().includes('old') || error.message?.toLowerCase().includes('ancien');
      setErrorMessage(isWrongOld
        ? (language === 'fr' ? 'Ancien mot de passe incorrect' : 'Old password is incorrect')
        : (language === 'fr' ? 'Erreur lors du changement de mot de passe' : 'Failed to change password'));
      setShowErrorModal(true);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return (
    <ProtectedRoute>
      <Loading fullScreen text={t(language, 'loading')} />
    </ProtectedRoute>
  );

  if (!profile) return (
    <ProtectedRoute>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Profil introuvable' : 'Profile not found'}</p>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>

      <div className="p-6 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {language === 'fr' ? 'Paramètres du compte' : 'Account Settings'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {language === 'fr' ? 'Gérez votre profil, préférences et sécurité' : 'Manage your profile, preferences and security'}
            </p>
          </div>
          {/* Le bouton Refresh a été supprimé */}
        </div>

        {/* ── Main grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── Left column ─────────────────────────────────────────── */}
          <div className="xl:col-span-1 space-y-5">

            {/* Logo */}
            <SectionCard>
              <SectionHeader
                icon={Camera}
                title={language === 'fr' ? 'Logo Entreprise' : 'Company Logo'}
                subtitle={language === 'fr' ? 'Apparaît sur vos documents PDF' : 'Appears on your PDF documents'}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-28 h-28 rounded-2xl bg-secondary/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <Building2 size={36} className="text-muted-foreground/30" />
                    )}
                  </div>
                  {logoPreview && (
                    <button
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <label className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                  <Upload size={14} />
                  {uploadingLogo
                    ? (language === 'fr' ? 'Envoi...' : 'Uploading...')
                    : (language === 'fr' ? 'Changer le logo' : 'Change logo')}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
                <p className="text-[10px] text-muted-foreground text-center">JPG, PNG — max 2 Mo</p>
              </div>
            </SectionCard>

            {/* Preferences */}
            <SectionCard>
              <SectionHeader
                icon={Globe}
                title={language === 'fr' ? 'Préférences' : 'Preferences'}
                subtitle={language === 'fr' ? 'Langue et apparence' : 'Language and appearance'}
              />
              <div className="space-y-4">
                <div>
                  <label className={lbl}>{t(language, 'languagePreference')}</label>
                  <div className="flex gap-2 bg-white dark:bg-background border border-border p-2 rounded-xl shadow-sm">
                    {(['fr', 'en'] as const).map((lang) => (
                      <button key={lang} onClick={() => setLanguage(lang)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm border ${language === lang ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-card text-muted-foreground border-border hover:text-foreground hover:bg-slate-50 dark:hover:bg-secondary/50'}`}>
                        {lang === 'fr' ? 'Français' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={lbl}>{t(language, 'darkModePreference')}</label>
                  <div className="flex gap-2 bg-white dark:bg-background border border-border p-2 rounded-xl shadow-sm">
                    <button onClick={() => setDarkMode(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm border ${!darkMode ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-card text-muted-foreground border-border hover:text-foreground hover:bg-slate-50 dark:hover:bg-secondary/50'}`}>
                      <Sun size={13} className={!darkMode ? 'text-white' : ''} />
                      {language === 'fr' ? 'Clair' : 'Light'}
                    </button>
                    <button onClick={() => setDarkMode(true)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm border ${darkMode ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-card text-muted-foreground border-border hover:text-foreground hover:bg-slate-50 dark:hover:bg-secondary/50'}`}>
                      <Moon size={13} className={darkMode ? 'text-white' : ''} />
                      {language === 'fr' ? 'Sombre' : 'Dark'}
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>

          </div>

          {/* ── Right column ────────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Personal Information */}
            <SectionCard>
              <SectionHeader
                icon={User}
                title={language === 'fr' ? 'Informations Personnelles' : 'Personal Information'}
                subtitle={language === 'fr' ? 'Vos coordonnées et informations d\'entreprise' : 'Your contact details and company info'}
                action={
                  !editMode ? (
                    <button onClick={() => setEditMode(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-white text-xs font-semibold transition-colors cursor-pointer">
                      <Edit size={13} />
                      {language === 'fr' ? 'Modifier' : 'Edit'}
                    </button>
                  ) : undefined
                }
              />

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>{language === 'fr' ? 'Nom' : 'Last name'}</label>
                    {editMode
                      ? <input type="text" value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} className={inp} />
                      : <input type="text" value={editForm.nom} readOnly className={disabledInp} />
                    }
                  </div>
                  <div>
                    <label className={lbl}>{language === 'fr' ? 'Prénom' : 'First name'}</label>
                    {editMode
                      ? <input type="text" value={editForm.prenom} onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })} className={inp} />
                      : <input type="text" value={editForm.prenom} readOnly className={disabledInp} />
                    }
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}><span className="flex items-center gap-1"><Mail size={10} />{t(language, 'email')}</span></label>
                    <input type="email" value={editForm.email} readOnly className={disabledInp} />
                  </div>
                  <div>
                    <label className={lbl}><span className="flex items-center gap-1"><Building2 size={10} />{language === 'fr' ? 'Matricule fiscal' : 'Tax reg. number'}</span></label>
                    {editMode
                      ? <input type="text" value={editForm.matriculeFiscale} onChange={(e) => setEditForm({ ...editForm, matriculeFiscale: e.target.value })} placeholder="1234567X" className={inp} />
                      : <input type="text" value={editForm.matriculeFiscale || '—'} readOnly className={disabledInp} />
                    }
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}><span className="flex items-center gap-1"><Building2 size={10} />{language === 'fr' ? "Nom de l'entreprise" : 'Company name'}</span></label>
                    {editMode
                      ? <input type="text" value={editForm.nomEntreprise} onChange={(e) => setEditForm({ ...editForm, nomEntreprise: e.target.value })} className={inp} />
                      : <input type="text" value={editForm.nomEntreprise} readOnly className={disabledInp} />
                    }
                  </div>
                  <div>
                    <label className={lbl}><span className="flex items-center gap-1"><MapPin size={10} />{language === 'fr' ? 'Adresse' : 'Address'}</span></label>
                    {editMode
                      ? <input type="text" value={editForm.adresse} onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })} className={inp} />
                      : <input type="text" value={editForm.adresse} readOnly className={disabledInp} />
                    }
                  </div>
                </div>

                <div>
                  <label className={lbl}><span className="flex items-center gap-1"><Phone size={10} />{language === 'fr' ? 'Numéros de téléphone' : 'Phone numbers'}</span></label>
                  {!editMode ? (
                    <div className={disabledInp}>
                      {profile.telephones && profile.telephones.length > 0
                        ? profile.telephones.join(' / ')
                        : (language === 'fr' ? 'Aucun numéro' : 'No number')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editForm.telephones.map((phone, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="tel" value={phone}
                            onChange={(e) => handlePhoneChange(idx, e.target.value)}
                            placeholder="+216 XX XXX XXX"
                            className={`${inp} flex-1`} />
                          {editForm.telephones.length > 1 && (
                            <button onClick={() => removePhone(idx)}
                              className="p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={addPhone}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer mt-1">
                        <Plus size={13} />{language === 'fr' ? 'Ajouter un numéro' : 'Add a number'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editMode && (
                <div className="flex gap-3 mt-5 pt-5 border-t border-border">
                  <button onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <RefreshCw size={13} className="animate-spin" />}
                    {saving
                      ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
                      : (language === 'fr' ? 'Enregistrer les modifications' : 'Save changes')}
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Security */}
            <SectionCard>
              <SectionHeader
                icon={Shield}
                title={language === 'fr' ? 'Sécurité' : 'Security'}
                subtitle={language === 'fr' ? 'Modifiez votre mot de passe' : 'Update your password'}
              />

              <div className="space-y-4">
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Mot de passe actuel' : 'Current password'}</label>
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      placeholder="••••••••" className={inp} />
                    <button onClick={() => setShowCurrentPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>{language === 'fr' ? 'Nouveau mot de passe' : 'New password'}</label>
                    <div className="relative">
                      <input type={showNewPassword ? 'text' : 'password'} value={passwordForm.new}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                        placeholder="••••••••" className={inp} />
                      <button onClick={() => setShowNewPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>{language === 'fr' ? 'Confirmer le nouveau' : 'Confirm new'}</label>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        placeholder="••••••••" className={inp} />
                      <button onClick={() => setShowConfirmPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordForm.new && passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                    <X size={12} strokeWidth={3} />
                    {language === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.'}
                  </div>
                )}

                <div className="flex gap-3 pt-1 border-t border-border mt-2">
                  <button onClick={() => setPasswordForm({ current: '', new: '', confirm: '' })}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                    {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                  </button>
                  <button onClick={handlePasswordChange} disabled={changingPassword}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {changingPassword && <RefreshCw size={13} className="animate-spin" />}
                    <Lock size={13} />
                    {changingPassword
                      ? (language === 'fr' ? 'Modification...' : 'Changing...')
                      : t(language, 'changePassword')}
                  </button>
                </div>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>

      {/* ── Success Modal ──────────────────────────────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-emerald-500/60 to-emerald-500/20" />
            <div className="p-7 flex flex-col items-center text-center">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl mb-4">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">{successMessage}</h3>
              <p className="text-xs text-muted-foreground mb-6">
                {language === 'fr' ? 'Les modifications ont été enregistrées.' : 'Changes have been saved successfully.'}
              </p>
              <button onClick={() => setShowSuccessModal(false)}
                className="w-full py-2.5 bg-primary hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">
                {language === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Modal ────────────────────────────────────────────── */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
            <div className="p-7 flex flex-col items-center text-center">
              <div className="p-4 bg-destructive/10 rounded-2xl mb-4">
                <AlertCircle size={28} className="text-destructive" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">
                {language === 'fr' ? 'Une erreur est survenue' : 'An error occurred'}
              </h3>
              <p className="text-xs text-muted-foreground mb-6">{errorMessage}</p>
              <button onClick={() => setShowErrorModal(false)}
                className="w-full py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold rounded-xl transition-colors cursor-pointer">
                {language === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}