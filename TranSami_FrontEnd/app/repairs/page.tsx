'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { reparationApi, camionApi, rappelVidangeApi } from '@/lib/api-client';
import type { ReparationResponse, CamionResponse, RappelVidangeResponse } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';
import RepairsSection from './Components/RepairsSection';
import RappelsVidangeSection from './Components/RappelsVidangeSection';

type ActiveTab = 'REPARATIONS' | 'RAPPELS_VIDANGE';

export default function RepairsPage() {
  const { language } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>('REPARATIONS');

  const [repairs, setRepairs] = useState<ReparationResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [rappels, setRappels] = useState<RappelVidangeResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRepairs = async () => {
    try { setRepairs(await reparationApi.getAll()); } catch { }
  };

  const loadRappels = async () => {
    try { setRappels(await rappelVidangeApi.getAll()); } catch { }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rep, trucks, rapp] = await Promise.all([
          reparationApi.getAll(),
          camionApi.getAll(),
          rappelVidangeApi.getAll(),
        ]);
        setRepairs(rep);
        setCamions(trucks);
        setRappels(rapp);
      } catch (err: any) {
        setError(err.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <Loading fullScreen text={language === 'fr' ? 'Chargement...' : 'Loading...'} />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-destructive text-sm">Erreur : {error}</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">

        {/* ── Navigation par onglets ── */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('REPARATIONS')}
            className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 ${activeTab === 'REPARATIONS'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {language === 'fr' ? 'Réparations' : 'Repairs'}
          </button>
          <button
            onClick={() => setActiveTab('RAPPELS_VIDANGE')}
            className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 ${activeTab === 'RAPPELS_VIDANGE'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {language === 'fr' ? 'Rappels de vidange' : 'Oil Change Reminders'}
          </button>
        </div>

        {/* ── Contenu ── */}
        {activeTab === 'REPARATIONS' && (
          <RepairsSection
            repairs={repairs}
            camions={camions}
            language={language}
            loadRepairs={loadRepairs}
          />
        )}

        {activeTab === 'RAPPELS_VIDANGE' && (
          <RappelsVidangeSection
            rappels={rappels}
            camions={camions}
            language={language}
            loadRappels={loadRappels}
            loadRepairs={loadRepairs}
          />
        )}

      </div>
    </ProtectedRoute>
  );
}