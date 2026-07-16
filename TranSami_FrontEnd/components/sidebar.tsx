'use client';

import Link from 'next/link';
import Image from 'next/image';
import logo1 from '../public/logo-blanc.png';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  Truck,
  Building,
  Package,
  Navigation,
  FileText,
  Wrench,
  Settings,
  LogOut,
  AlertTriangle,
  Check,
  XCircle,
  Users,
  Fuel,
  Droplets,
  Container,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { authApi } from '@/lib/api-client';

const navItems = [
  { href: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
  { href: '/trucks', label: 'trucks', icon: Truck },
  { href: '/DeliveryNotes', label: 'deliveryNote', icon: Navigation },
  { href: '/fuel', label: 'fuel', icon: Droplets },
  { href: '/repairs', label: 'repairs', icon: Wrench },
  { href: '/chauffeurs', label: 'chauffeurs', icon: UserCheck },
  { href: '/remorques', label: 'remorques', icon: Container },
  { href: '/charges', label: 'charges', icon: DollarSign },
  { href: '/invoices', label: 'invoices', icon: FileText },
  { href: '/clients', label: 'clients', icon: Building },
  { href: '/fournisseurs', label: 'fournisseurs', icon: Users },
  { href: '/stations', label: 'stations', icon: Fuel },
  { href: '/products', label: 'products', icon: Package },
  { href: '/settings', label: 'settings', icon: Settings },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { language, darkMode } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogoutClick = () => setShowLogoutModal(true);

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

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 rounded-lg bg-primary text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-58 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } md:sticky md:top-0`}
      >
        <div className="px-4 py-3 border-b border-sidebar-border flex-shrink-0 flex items-center justify-center">
          <div className="relative w-64 h-28">
            <Image
              src={logo1}
              alt="Logo"
              fill
              sizes="280px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 sidebar-nav-scroll">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-primary text-white font-semibold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
                  }`}
              >
                <Icon size={20} />
                <span>{t(language, item.label as any)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button - Styling depends on theme */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <button
            onClick={handleLogoutClick}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 cursor-pointer ${darkMode
              ? 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-red-900/70 hover:to-red-800/70 text-gray-300 hover:text-white'
              : 'text-sidebar-foreground bg-sidebar-accent/10 border border-sidebar-border hover:bg-destructive/20 hover:text-destructive-foreground'
              }`}
          >
            <LogOut size={20} />
            <span>{t(language, 'logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
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