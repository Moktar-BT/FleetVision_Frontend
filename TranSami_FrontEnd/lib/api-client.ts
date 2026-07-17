const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fleetvsionbackend-production.up.railway.app/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.error('Fetch error:', error);
    }
    throw error;
  }

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
    return new Promise(() => { }) as unknown as Promise<T>;
  }

  if (!res.ok) {
    if (res.status === 404) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/404') {
        window.location.href = '/404';
      }
      return new Promise(() => { }) as unknown as Promise<T>;
    }
    const errData = await res.text().catch(() => '');
    throw new Error(errData || `API Error: ${res.status} ${res.statusText}`);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// ============================================
// Camion
// ============================================

export interface MonthlyEntry {
  month: number;
  amount: number;
}

export interface YearlyBreakdown {
  year: number;
  months: MonthlyEntry[];
  annualTotal: number;
}

export interface CamionRequest {
  matricule: string;
  nomChauffeur: string;
  chauffeurId?: number | null;
  truckModel: string;
  mileage?: number | null;
  capacityLiters?: number | null;
  fuelType?: 'DIESEL' | 'ESSENCE' | 'DIESEL_50' | null;
  purchaseDate?: string | null;
  status?: boolean | null;
}

export interface CamionResponse {
  id: number;
  matricule: string;
  nomChauffeur: string;
  chauffeurId: number | null;
  chauffeurNom: string | null;
  truckModel: string;
  mileage: number | null;
  capacityLiters: number | null;
  fuelType: 'DIESEL' | 'ESSENCE' | 'DIESEL_50' | null;
  purchaseDate: string | null;
  adminId: number;
  status: boolean;
  revenueBreakdown: YearlyBreakdown[];
  fuelCostBreakdown: YearlyBreakdown[];
  repairCostBreakdown: YearlyBreakdown[];
  chargeCostBreakdown: YearlyBreakdown[]; // ← nouveau
  lastMaintenanceDate: string | null;
  fuelConsumption: number | null;
  remorqueId: number | null;
  remorqueMatricule: string | null;
  remorqueType: string | null;
}

export const camionApi = {
  getAll: (): Promise<CamionResponse[]> => request('/camions'),
  getAllByStatus: (status: boolean): Promise<CamionResponse[]> =>
    request(`/camions?status=${status}`),
  getById: (id: number): Promise<CamionResponse> => request(`/camions/${id}`),
  create: (data: CamionRequest): Promise<CamionResponse> =>
    request('/camions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: CamionRequest): Promise<CamionResponse> =>
    request(`/camions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: boolean): Promise<CamionResponse> =>
    request(`/camions/${id}/status?status=${status}`, { method: 'PATCH' }),
  delete: (id: number): Promise<void> =>
    request(`/camions/${id}`, { method: 'DELETE' }),
};

// ============================================
// Client
// ============================================

export interface ClientRequest {
  nom: string;
  localisation: string;
  matF?: string;
}

export interface ClientResponse {
  id: number;
  nom: string;
  localisation: string;
  matF?: string;
  monthlyTurnover: number;
  annualTurnover: number;
}

export const clientApi = {
  getAll: (): Promise<ClientResponse[]> => request('/clients'),
  getById: (id: number): Promise<ClientResponse> => request(`/clients/${id}`),
  create: (data: ClientRequest): Promise<ClientResponse> => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ClientRequest): Promise<ClientResponse> => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/clients/${id}`, { method: 'DELETE' }),
};

// ============================================
// Fournisseur
// ============================================

export interface FournisseurRequest {
  nom: string;
  localisation: string;
}

export interface FournisseurResponse {
  id: number;
  nom: string;
  localisation: string;
}

export const fournisseurApi = {
  getAll: (): Promise<FournisseurResponse[]> => request('/fournisseurs'),
  getById: (id: number): Promise<FournisseurResponse> => request(`/fournisseurs/${id}`),
  create: (data: FournisseurRequest): Promise<FournisseurResponse> => request('/fournisseurs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: FournisseurRequest): Promise<FournisseurResponse> => request(`/fournisseurs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/fournisseurs/${id}`, { method: 'DELETE' }),
};

// ============================================
// Auth
// ============================================

export const authApi = {
  logout: (): Promise<void> => request('/auth/logout', { method: 'POST' }),

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('user');
    }
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.erreur || data.message || `Erreur ${res.status}`);
    }
    return res.json();
  },

  verifyOtp: async (email: string, otp: string): Promise<{ verified: boolean }> => {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.erreur || data.message || `Erreur ${res.status}`);
    }
    return res.json();
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.erreur || data.message || `Erreur ${res.status}`);
    }
    return res.json();
  },
};

// ============================================
// CodeProduit
// ============================================

export interface CodeProduitRequest {
  code: string;
  description?: string;
  unitPrice: number;
  unit: string;
  vat: number;
}

export interface CodeProduitResponse {
  id: number;
  code: string;
  description: string | null;
  unitPrice: number;
  unit: string;
  vat: number;
}

export const codeProduitApi = {
  getAll: (): Promise<CodeProduitResponse[]> => request('/codes-produit'),
  getById: (id: number): Promise<CodeProduitResponse> => request(`/codes-produit/${id}`),
  create: (data: CodeProduitRequest): Promise<CodeProduitResponse> => request('/codes-produit', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: CodeProduitRequest): Promise<CodeProduitResponse> => request(`/codes-produit/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/codes-produit/${id}`, { method: 'DELETE' }),
};

// ============================================
// BonDeLivraison
// ============================================

export interface BonDeLivraisonRequest {
  numero: string;
  blNumFournisseur?: number | null;
  date: string;
  quantite: number;
  montantHt: number;
  montantTtc: number;
  statut?: 'FACTURE' | 'NON_FACTURE';
  camionId: number;
  clientId: number;
  codeProduitId: number;
  fournisseurId?: number | null;
}

export interface BonDeLivraisonResponse {
  id: number;
  numero: string;
  blNumFournisseur: number | null;
  date: string;
  quantite: number;
  montantHt: number;
  montantTtc: number;
  statut: 'FACTURE' | 'NON_FACTURE';
  camionId: number;
  camionModele: string | null;
  codeProduitId: number;
  codeProduitCode: string;
  codeProduitUnit: string;
  clientId: number;
  clientNom: string;
  fournisseurId?: number | null;
  fournisseurNom?: string | null;
}

export const bonDeLivraisonApi = {
  getAll: (): Promise<BonDeLivraisonResponse[]> => request('/bons-livraison'),
  getById: (id: number): Promise<BonDeLivraisonResponse> => request(`/bons-livraison/${id}`),
  getByCamion: (camionId: number): Promise<BonDeLivraisonResponse[]> => request(`/bons-livraison/camion/${camionId}`),
  getByStatut: (statut: 'FACTURE' | 'NON_FACTURE'): Promise<BonDeLivraisonResponse[]> => request(`/bons-livraison/statut/${statut}`),
  getByClient: (clientId: number): Promise<BonDeLivraisonResponse[]> => request(`/bons-livraison/client/${clientId}`),
  getByDateRange: (from: string, to: string): Promise<BonDeLivraisonResponse[]> => request(`/bons-livraison/periode?from=${from}&to=${to}`),
  create: (data: BonDeLivraisonRequest): Promise<BonDeLivraisonResponse> => request('/bons-livraison', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: BonDeLivraisonRequest): Promise<BonDeLivraisonResponse> => request(`/bons-livraison/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatut: (id: number, statut: 'FACTURE' | 'NON_FACTURE'): Promise<BonDeLivraisonResponse> => request(`/bons-livraison/${id}/statut?statut=${statut}`, { method: 'PATCH' }),
  delete: (id: number): Promise<void> => request(`/bons-livraison/${id}`, { method: 'DELETE' }),
};

// ============================================
// Admin
// ============================================

export interface AdminProfile {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephones: string[];
  adresse: string;
  nomEntreprise: string;
  matriculeFiscale: string;
  cheminLogoEntreprise?: string;
  language: 'FRANCAIS' | 'ANGLAIS';
  theme: 'LIGHT' | 'DARK';
}

export interface AdminProfileUpdate {
  nom?: string;
  prenom?: string;
  telephones?: string[];
  adresse?: string;
  nomEntreprise?: string;
  matriculeFiscale?: string;
  cheminLogoEntreprise?: string;
  language?: 'FRANCAIS' | 'ANGLAIS';
  theme?: 'LIGHT' | 'DARK';
}

export const adminApi = {
  getProfile: (): Promise<AdminProfile> => request('/admin/profile'),
  updateProfile: (data: AdminProfileUpdate): Promise<AdminProfile> => request('/admin/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadLogo: (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_URL}/admin/upload-logo`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Upload failed');
      return res.text();
    });
  },
  changePassword: async (oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/admin/change-password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Erreur ${res.status}`);
    }
    await res.text();
  },
};

// ============================================
// Factures
// ============================================

export type InvoiceStatus = 'Enattente' | 'Payee';

export interface BonDeLivraisonSummary {
  id: number;
  numero: string;
  montantHt: number;
}

export interface FactureRequest {
  date: string;
  clientId: number;
  droitsTimbre: number;
  bonDeLivraisonIds: number[];
}

export interface FactureResponse {
  id: number;
  numero: string;
  date: string;
  clientId: number;
  clientNom: string;
  montantHTVA: number;
  montantTVA: number;
  montantTTC: number;
  statut: InvoiceStatus;
  droitsTimbre: number;
  bonsDeLivraison: BonDeLivraisonSummary[];
}

export const factureApi = {
  getAll: (): Promise<FactureResponse[]> => request('/factures'),
  getById: (id: number): Promise<FactureResponse> => request(`/factures/${id}`),
  create: (data: FactureRequest): Promise<FactureResponse> => request('/factures', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/factures/${id}`, { method: 'DELETE' }),
  updateStatut: (id: number, statut: InvoiceStatus): Promise<FactureResponse> => request(`/factures/${id}/statut?statut=${statut}`, { method: 'PATCH' }),
  downloadDetaillee: async (id: number): Promise<void> => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
      : null;
    const res = await fetch(`${API_URL}/factures/${id}/pdf/detaillee`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Erreur ${res.status} lors du téléchargement du PDF.`);
    }
    triggerDownload(await res.blob(), `facture-detaillee-${id}.pdf`);
  },
  downloadComprimee: async (id: number): Promise<void> => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
      : null;
    const res = await fetch(`${API_URL}/factures/${id}/pdf/comprimee`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Erreur ${res.status} lors du téléchargement du PDF.`);
    }
    triggerDownload(await res.blob(), `facture-comprimee-${id}.pdf`);
  },
};

// ============================================
// État des Bons de Livraison (rapport PDF)
// ============================================

export interface EtatBLParams {
  dateFrom: string;
  dateTo: string;
  clientId?: number | null;
  camionId?: number | null;
  fournisseurId?: number | null;
  statut?: 'FACTURE' | 'NON_FACTURE' | null;
}

export const etatBLApi = {
  downloadPdf: async (params: EtatBLParams): Promise<void> => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token')) : null;
    const query = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
    if (params.clientId != null) query.set('clientId', String(params.clientId));
    if (params.camionId != null) query.set('camionId', String(params.camionId));
    if (params.fournisseurId != null) query.set('fournisseurId', String(params.fournisseurId));
    if (params.statut != null) query.set('statut', params.statut);
    const res = await fetch(`${API_URL}/etat-bl/pdf?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Erreur ${res.status} lors de la génération du PDF`);
    }
    triggerDownload(await res.blob(), `etat-bl-${params.dateFrom}_${params.dateTo}.pdf`);
  },
};

// ============================================
// FUEL MODULE
// ============================================

import type {
  PrixCarburantRequest,
  PrixCarburantResponse,
  StationRequest,
  StationResponse,
  BonCarburantRequest,
  BonCarburantResponse,
  CamionFuelStatsResponse,
  EtatCarburantParams,
} from './fuel.types';

export type {
  PrixCarburantRequest,
  PrixCarburantResponse,
  StationRequest,
  StationResponse,
  BonCarburantRequest,
  BonCarburantResponse,
  CamionFuelStatsResponse,
  EtatCarburantParams,
};

export const prixCarburantApi = {
  createOrUpdate: (data: PrixCarburantRequest): Promise<PrixCarburantResponse> =>
    request('/prix-carburant', { method: 'POST', body: JSON.stringify(data) }),
  get: (): Promise<PrixCarburantResponse> => request('/prix-carburant'),
};

export const stationApi = {
  getAll: (): Promise<StationResponse[]> => request('/stations'),
  getById: (id: number): Promise<StationResponse> => request(`/stations/${id}`),
  create: (data: StationRequest): Promise<StationResponse> =>
    request('/stations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: StationRequest): Promise<StationResponse> =>
    request(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/stations/${id}`, { method: 'DELETE' }),
};

export const bonCarburantApi = {
  getAll: (filters?: { camionId?: number; stationId?: number }): Promise<BonCarburantResponse[]> => {
    const params = new URLSearchParams();
    if (filters?.camionId) params.set('camionId', String(filters.camionId));
    if (filters?.stationId) params.set('stationId', String(filters.stationId));
    const query = params.toString();
    return request(`/bons-carburant${query ? `?${query}` : ''}`);
  },
  getById: (id: number): Promise<BonCarburantResponse> => request(`/bons-carburant/${id}`),
  create: (data: BonCarburantRequest): Promise<BonCarburantResponse> =>
    request('/bons-carburant', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: BonCarburantRequest): Promise<BonCarburantResponse> =>
    request(`/bons-carburant/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/bons-carburant/${id}`, { method: 'DELETE' }),
  getCamionStats: (camionId: number): Promise<CamionFuelStatsResponse> =>
    request(`/bons-carburant/camion/${camionId}/stats`),
  downloadEtat: async (params: EtatCarburantParams): Promise<void> => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token')) : null;
    const query = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
    if (params.stationId != null) query.set('stationId', String(params.stationId));
    if (params.camionId != null) query.set('camionId', String(params.camionId));
    const res = await fetch(`${API_URL}/bons-carburant/etat-pdf?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Erreur ${res.status} lors de la génération du PDF`);
    }
    triggerDownload(await res.blob(), `etat-carburant-${params.dateFrom}_${params.dateTo}.pdf`);
  },
};

// ============================================
// Réparations
// ============================================

export interface ReparationRequest {
  date: string;
  camionId: number;
  typeReparation: string;
  cout: number;
  notes?: string;
}

export interface ReparationResponse {
  id: number;
  date: string;
  camionId: number;
  camionMatricule: string;
  typeReparation: string;
  cout: number;
  notes: string | null;
}

export interface HistoriqueReparationParams {
  dateFrom: string;
  dateTo: string;
  camionId?: number | null;
}

export const reparationApi = {
  getAll: (camionId?: number): Promise<ReparationResponse[]> => {
    const query = camionId ? `?camionId=${camionId}` : '';
    return request(`/reparations${query}`);
  },
  getById: (id: number): Promise<ReparationResponse> => request(`/reparations/${id}`),
  create: (data: ReparationRequest): Promise<ReparationResponse> =>
    request('/reparations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ReparationRequest): Promise<ReparationResponse> =>
    request(`/reparations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/reparations/${id}`, { method: 'DELETE' }),
  downloadHistorique: async (params: HistoriqueReparationParams): Promise<void> => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token')) : null;
    const query = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
    if (params.camionId != null) query.set('camionId', String(params.camionId));
    const res = await fetch(`${API_URL}/reparations/historique-pdf?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Erreur ${res.status} lors de la génération du PDF`);
    }
    triggerDownload(await res.blob(), `historique-reparations-${params.dateFrom}_${params.dateTo}.pdf`);
  },
};

// ============================================
// Shared download helper
// ============================================

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// Rappel Vidange
// ============================================

export interface RappelVidangeRequest {
  camionId: number;
  kmDerniereVidange: number;
  intervalleKm: number;
  dateDerniereVidange?: string | null;
  notes?: string | null;
}

export interface RappelVidangeResponse {
  id: number;
  camionId: number;
  camionMatricule: string;
  camionModele: string;
  kmActuel: number | null;
  kmDerniereVidange: number;
  intervalleKm: number;
  kmProchaineVidange: number;
  dateDerniereVidange: string | null;
  notes: string | null;
  actif: boolean;
  statut: 'OK' | 'PROCHE' | 'DEPASSEE' | 'INCONNU';
  kmRestants: number | null;
  pourcentageAvancement: number | null;
}

export interface RappelVidangeAlerteSummary {
  rappelId: number;
  camionId: number;
  camionMatricule: string;
  kmActuel: number | null;
  kmProchaineVidange: number;
  kmRestants: number | null;
  statut: 'PROCHE' | 'DEPASSEE';
}

export const rappelVidangeApi = {
  getAll: (): Promise<RappelVidangeResponse[]> => request('/rappels-vidange'),
  getById: (id: number): Promise<RappelVidangeResponse> => request(`/rappels-vidange/${id}`),
  create: (data: RappelVidangeRequest): Promise<RappelVidangeResponse> =>
    request('/rappels-vidange', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: RappelVidangeRequest): Promise<RappelVidangeResponse> =>
    request(`/rappels-vidange/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reinitialiser: (id: number, data: RappelVidangeRequest): Promise<RappelVidangeResponse> =>
    request(`/rappels-vidange/${id}/reinitialiser`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/rappels-vidange/${id}`, { method: 'DELETE' }),
  getAlertes: (): Promise<RappelVidangeAlerteSummary[]> => request('/rappels-vidange/alertes'),
};

// ============================================
// Chauffeur
// ============================================

export interface ChauffeurRequest {
  nom: string;
  prenom: string;
  cin: string;
  telephone?: string | null;
  dateEmbauche?: string | null;
  salaire: number;
  camionId?: number | null;
}

export interface ChauffeurResponse {
  id: number;
  adminId: number;
  nom: string;
  prenom: string;
  cin: string;
  telephone: string | null;
  dateEmbauche: string | null;
  salaire: number;
  active: boolean;
  nomComplet: string;
  // Populated by backend — which truck this driver is assigned to (if any)
  camionId: number | null;
  camionMatricule: string | null;
}

export const chauffeurApi = {
  getAll: (active?: boolean): Promise<ChauffeurResponse[]> => {
    const query = active !== undefined ? `?active=${active}` : '';
    return request(`/chauffeurs${query}`);
  },
  getById: (id: number): Promise<ChauffeurResponse> => request(`/chauffeurs/${id}`),
  create: (data: ChauffeurRequest): Promise<ChauffeurResponse> =>
    request('/chauffeurs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ChauffeurRequest): Promise<ChauffeurResponse> =>
    request(`/chauffeurs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleActive: (id: number, active: boolean): Promise<ChauffeurResponse> =>
    request(`/chauffeurs/${id}/active?active=${active}`, { method: 'PATCH' }),
  delete: (id: number): Promise<void> => request(`/chauffeurs/${id}`, { method: 'DELETE' }),
};

// ============================================
// Remorque
// ============================================

export interface RemorqueRequest {
  matricule: string;
  camionId?: number | null;
  typeRemorque?: string | null;
  capaciteTonnes?: number | null;
  dateAchat?: string | null;
}

export interface RemorqueResponse {
  id: number;
  adminId: number;
  matricule: string;
  camionId: number | null;
  camionMatricule: string | null;
  typeRemorque: string | null;
  capaciteTonnes: number | null;
  dateAchat: string | null;
  active: boolean;
}

export const remorqueApi = {
  getAll: (camionId?: number): Promise<RemorqueResponse[]> => {
    const query = camionId ? `?camionId=${camionId}` : '';
    return request(`/remorques${query}`);
  },
  getById: (id: number): Promise<RemorqueResponse> => request(`/remorques/${id}`),
  create: (data: RemorqueRequest): Promise<RemorqueResponse> =>
    request('/remorques', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: RemorqueRequest): Promise<RemorqueResponse> =>
    request(`/remorques/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/remorques/${id}`, { method: 'DELETE' }),
};

// ============================================
// ChargeTemplate
// ============================================

export type TypeCharge = 'FIXE' | 'VARIABLE';
export type CategorieCharge =
  | 'SALAIRE' | 'CNSS' | 'ASSURANCE' | 'VIGNETTE' | 'VISITE_TECHNIQUE'
  | 'VIDANGE' | 'LAVAGE' | 'REPARATION' | 'ASSURANCE_REMORQUE'
  | 'VIGNETTE_REMORQUE' | 'AUTRE';
export type StatutCharge = 'EN_ATTENTE' | 'PAYEE';
export type FrequenceRappel = 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'ANNUEL';

export interface ChargeTemplateRequest {
  libelle: string;
  type: TypeCharge;
  categorie: CategorieCharge;
  montantReference?: number | null;
  camionId?: number | null;
  chauffeurId?: number | null;
  remorqueId?: number | null;
}

export interface ChargeTemplateResponse {
  id: number;
  adminId: number;
  libelle: string;
  type: TypeCharge;
  categorie: CategorieCharge;
  montantReference: number | null;
  camionId: number | null;
  camionMatricule: string | null;
  chauffeurId: number | null;
  chauffeurNom: string | null;
  remorqueId: number | null;
  remorqueMatricule: string | null;
  active: boolean;
}

export const chargeTemplateApi = {
  getAll: (type?: TypeCharge): Promise<ChargeTemplateResponse[]> => {
    const query = type ? `?type=${type}` : '';
    return request(`/charges-templates${query}`);
  },
  getById: (id: number): Promise<ChargeTemplateResponse> => request(`/charges-templates/${id}`),
  create: (data: ChargeTemplateRequest): Promise<ChargeTemplateResponse> =>
    request('/charges-templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ChargeTemplateRequest): Promise<ChargeTemplateResponse> =>
    request(`/charges-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleActive: (id: number, active: boolean): Promise<ChargeTemplateResponse> =>
    request(`/charges-templates/${id}/active?active=${active}`, { method: 'PATCH' }),
  delete: (id: number): Promise<void> => request(`/charges-templates/${id}`, { method: 'DELETE' }),
};

// ============================================
// Charge (dépense réelle)
// ============================================

export interface ChargeRequest {
  templateId: number;
  date: string;
  montant: number;
  statut?: StatutCharge;
  notes?: string | null;
}

export interface ChargeResponse {
  id: number;
  adminId: number;
  date: string;
  montant: number;
  statut: StatutCharge;
  notes: string | null;
  templateId: number;
  templateLibelle: string;
  templateType: TypeCharge;
  templateCategorie: CategorieCharge;
  camionId: number | null;
  camionMatricule: string | null;
  chauffeurId: number | null;
  chauffeurNom: string | null;
}

export interface ChargeStatsResponse {
  totalAnnee: number;
  totalMois: number;
  totalParCategorie: Record<string, number>;
}

export const chargeApi = {
  getAll: (params?: {
    templateId?: number;
    dateFrom?: string;
    dateTo?: string;
    statut?: StatutCharge;
  }): Promise<ChargeResponse[]> => {
    const query = new URLSearchParams();
    if (params?.templateId) query.set('templateId', String(params.templateId));
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.statut) query.set('statut', params.statut);
    const q = query.toString();
    return request(`/charges${q ? `?${q}` : ''}`);
  },
  getBreakdown: (): Promise<YearlyBreakdown[]> => request('/charges/breakdown'),
  // Dans chargeApi
  downloadEtat: async (params: {
    dateFrom: string;
    dateTo: string;
    statut?: StatutCharge;
    type?: TypeCharge;
    camionMatricule?: string | null;
    chauffeurNom?: string | null;
    remorqueMatricule?: string | null;
  }): Promise<void> => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token')) : null;
    const query = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
    if (params.statut) query.set('statut', params.statut);
    if (params.type) query.set('type', params.type);
    if (params.camionMatricule !== undefined && params.camionMatricule !== null) query.set('camionMatricule', params.camionMatricule);
    if (params.chauffeurNom !== undefined && params.chauffeurNom !== null) query.set('chauffeurNom', params.chauffeurNom);
    if (params.remorqueMatricule !== undefined && params.remorqueMatricule !== null) query.set('remorqueMatricule', params.remorqueMatricule);
    const res = await fetch(`${API_URL}/charges/etat-pdf?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Erreur ${res.status} lors de la génération du PDF`);
    }
    triggerDownload(await res.blob(), `etat-depenses-${params.dateFrom}_${params.dateTo}.pdf`);
  },
  getById: (id: number): Promise<ChargeResponse> => request(`/charges/${id}`),
  create: (data: ChargeRequest): Promise<ChargeResponse> =>
    request('/charges', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ChargeRequest): Promise<ChargeResponse> =>
    request(`/charges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatut: (id: number, statut: StatutCharge): Promise<ChargeResponse> =>
    request(`/charges/${id}/statut?statut=${statut}`, { method: 'PATCH' }),
  delete: (id: number): Promise<void> => request(`/charges/${id}`, { method: 'DELETE' }),
  getStats: (year: number): Promise<ChargeStatsResponse> => request(`/charges/stats?year=${year}`),
};


// ============================================
// RappelCharge
// ============================================

export interface RappelChargeRequest {
  templateId: number;
  frequence: FrequenceRappel;
  prochaineDate: string;
  joursAvant?: number;
}

export interface RappelChargeResponse {
  id: number;
  adminId: number;
  frequence: FrequenceRappel;
  prochaineDate: string;
  joursAvant: number;
  actif: boolean;
  templateId: number;
  templateLibelle: string;
  templateCategorie: CategorieCharge;
  templateType: TypeCharge;
  montantReference: number | null;
  camionMatricule: string | null;
  chauffeurNom: string | null;
  joursRestants: number;
  statut: 'OK' | 'PROCHE' | 'DEPASSE';
}

export interface ChargeAlerteSummary {
  rappelId: number;
  templateLibelle: string;
  templateCategorie: CategorieCharge;
  prochaineDate: string;
  joursRestants: number;
  montantReference: number | null;
  camionMatricule: string | null;
  chauffeurNom: string | null;
  statut: 'PROCHE' | 'DEPASSE';
}

export const rappelChargeApi = {
  getAll: (): Promise<RappelChargeResponse[]> => request('/rappels-charge'),
  getById: (id: number): Promise<RappelChargeResponse> => request(`/rappels-charge/${id}`),
  create: (data: RappelChargeRequest): Promise<RappelChargeResponse> =>
    request('/rappels-charge', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: RappelChargeRequest): Promise<RappelChargeResponse> =>
    request(`/rappels-charge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleActif: (id: number, actif: boolean): Promise<RappelChargeResponse> =>
    request(`/rappels-charge/${id}/actif?actif=${actif}`, { method: 'PATCH' }),
  delete: (id: number): Promise<void> => request(`/rappels-charge/${id}`, { method: 'DELETE' }),
  getAlertes: (): Promise<ChargeAlerteSummary[]> => request('/rappels-charge/alertes'),
  avancer: (id: number): Promise<RappelChargeResponse> =>
    request(`/rappels-charge/${id}/avancer`, { method: 'PATCH' }),
};

