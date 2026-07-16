// ============================================
// FUEL MODULE - Types
// ============================================

export type FuelType = 'DIESEL' | 'DIESEL_50' | 'ESSENCE';

export interface PrixCarburantRequest {
  prixEssence: number;
  prixDiesel: number;
  prixDiesel50: number;
}

export interface PrixCarburantResponse {
  id: number;
  prixEssence: number;
  prixDiesel: number;
  prixDiesel50: number;
}

export interface StationRequest {
  nom: string;
  localisation?: string | null;
}

export interface StationResponse {
  id: number;
  nom: string;
  localisation: string | null;
  totalQuantite?: number | null;
  totalMontant?: number | null;
  totalMensuelle: number;
  totalAnnuelle: number;
  totalDieselMois: number;
  totalDiesel50Mois: number;
  totalEssenceMois: number;
}

export interface BonCarburantRequest {
  numero?: string;
  date: string;                  // YYYY-MM-DD
  camionId: number;
  stationId: number;
  kilometrageActuel: number;
  quantiteLitres: number;
  typCarburant: FuelType;
  prixLitre: number;
}

export interface BonCarburantResponse {
  id: number;
  date: string;                  // YYYY-MM-DD
  camionId: number;
  camionMatricule: string;
  stationId: number;
  stationNom: string;
  numero: string | null;
  kilometrageActuel: number;
  quantiteLitres: number;
  typCarburant: FuelType;
  prixLitre: number;
  montantTotal: number;
  distanceParcourue: number | null;
  consommationReelle: number | null;
  consommationStatut: string;
  consommationMessage: string;
}

export interface CamionFuelStatsResponse {
  matricule: string;
  nomChauffeur: string;
  consommationMoyenne: number | null;
  consommationDernier: number | null;
  coutTotalCarburant: number;
  coutMensuelCarburant: number;
  nombreBons: number;
  statut: 'BONNE' | 'MOYENNE' | 'MAUVAISE' | 'INSUFFISANT';
  message: string;
}

export interface EtatCarburantParams {
  dateFrom: string;             // YYYY-MM-DD (required)
  dateTo: string;               // YYYY-MM-DD (required)
  stationId?: number | null;
  camionId?: number | null;
}