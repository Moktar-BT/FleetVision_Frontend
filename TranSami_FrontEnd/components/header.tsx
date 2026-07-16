'use client';

import { Moon, Sun, Settings, LogOut, AlertTriangle, Check, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { useState, useEffect, useRef } from 'react';
import { adminApi, AdminProfile, authApi } from '@/lib/api-client';
import adminAvatar from '../public/admin.png';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { language, darkMode, setDarkMode } = useApp();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Récupération du profil admin + écoute des mises à jour
  useEffect(() => {
    const loadProfile = () => {
      adminApi.getProfile()
        .then(setAdmin)
        .catch(console.error);
    };

    loadProfile();

    // Écoute de l'événement personnalisé déclenché depuis les paramètres
    const handleProfileUpdate = () => {
      loadProfile();
    };
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  // Fermeture du menu en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const roleLabel = language === 'fr' ? 'Gérant' : 'Manager';

  // Gestion de la déconnexion
  const handleLogoutClick = () => {
    setShowMenu(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setShowLogoutModal(false);
      router.push('/signin');   // ← changé depuis '/'
    }
  };

  const cancelLogout = () => setShowLogoutModal(false);

  const goToSettings = () => {
    setShowMenu(false);
    router.push('/settings');
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-2xl font-bold text-foreground">
            {title}
            <p className="text-sm text-muted-foreground">{today}</p>
          </h2>

          <div className="flex items-center gap-4">
            {/* Bouton thème */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
              title={t(language, 'darkMode')}
            >
              {darkMode ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} className="text-foreground" />
              )}
            </button>

            {/* Avatar admin avec menu déroulant */}
            <div className="relative" ref={menuRef}>
              <div
                className="flex items-center gap-3 ml-4 pl-4 border-l border-border cursor-pointer"
                onClick={() => setShowMenu(!showMenu)}
              >
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {admin ? `${admin.prenom} ${admin.nom}` : 'Chargement...'}
                  </p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  <Image
                    src={adminAvatar}
                    alt={admin ? `${admin.prenom} ${admin.nom}` : 'Admin'}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              {/* Menu déroulant */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-fadeIn">
                  <button
                    onClick={goToSettings}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Settings size={16} />
                    <span>{t(language, 'settings')}</span>
                  </button>
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer border-t border-border"
                  >
                    <LogOut size={16} />
                    <span>{t(language, 'logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal de confirmation de déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-7 border border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {language === 'fr' ? 'Déconnexion' : 'Logout'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {language === 'fr' ? 'Confirmez votre déconnexion' : 'Confirm your logout'}
                </p>
              </div>
            </div>
            <div className="mb-8">
              <p className="text-foreground">
                {language === 'fr'
                  ? 'Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à nouveau à votre compte.'
                  : 'Are you sure you want to log out? You will need to log in again to access your account.'}
              </p>
            </div>
            <div className="flex gap-3 pt-6 border-t border-border">
              <button
                onClick={cancelLogout}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer"
              >
                <XCircle size={18} />
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-destructive to-destructive/90 hover:shadow-lg text-white font-semibold transition-all cursor-pointer"
              >
                <Check size={18} />
                {language === 'fr' ? 'Confirmer' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}