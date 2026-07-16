# Module Carburant - Intégration Frontend

## ✅ Fichiers Créés

### Types et API
- `lib/fuel.types.ts` - Types TypeScript pour le module carburant
- `lib/api-client.ts` - Endpoints API ajoutés (prixCarburantApi, stationApi, bonCarburantApi)
- `lib/i18n.ts` - Traductions FR/EN ajoutées

### Pages
- `app/fuel/page.tsx` - Page principale avec statistiques globales et par camion
- `app/fuel/components/PriceConfig.tsx` - Composant de configuration des prix
- `app/fuel/components/AddBonCarburantModal.tsx` - Modal pour ajouter un bon de carburant
- `app/stations/page.tsx` - Page de gestion des stations

### Composants Camions
- `app/trucks/components/FuelTab.tsx` - Onglet carburant simplifié (liste uniquement)
- `app/trucks/components/TruckTabs.tsx` - Modifié pour ajouter l'onglet carburant
- `app/trucks/page.tsx` - Modifié pour supporter l'onglet carburant

### Navigation
- `components/sidebar.tsx` - Ajout des liens Carburant et Stations

## 🎯 Fonctionnalités Implémentées

### 1. Page Stations (`/stations`)
- ✅ Liste des stations avec statistiques
- ✅ Création/Modification/Suppression de stations
- ✅ Affichage des totaux mensuels et annuels
- ✅ Détails par type de carburant (Diesel, Diesel 50, Essence)
- ✅ Design responsive avec light/dark mode

### 2. Page Carburant (`/fuel`)
- ✅ Configuration des prix du carburant (Diesel, Diesel 50, Essence)
- ✅ Statistiques globales (total bons, coût mensuel, consommation moyenne, station favorite)
- ✅ Statistiques détaillées par camion avec:
  - Consommation moyenne
  - Coût mensuel
  - Nombre de bons
  - Statut de consommation avec badge coloré
- ✅ Bouton pour ouvrir le modal d'ajout de bon
- ✅ Toutes les données proviennent des APIs (pas de données fictives)

### 3. Modal Ajout Bon de Carburant
- ✅ **Modal avec arrière-plan transparent flou** (même style que les autres modals)
- ✅ Formulaire complet pour ajouter un bon
- ✅ Sélection de la date
- ✅ Sélection du camion (pré-sélectionné si ouvert depuis l'onglet camion)
- ✅ Sélection de la station
- ✅ Saisie du kilométrage actuel
- ✅ Saisie de la quantité en litres
- ✅ Sélection du type de carburant
- ✅ Prix par litre (pré-rempli depuis la configuration)
- ✅ Commentaire optionnel
- ✅ Calcul automatique du montant total
- ✅ Validation des données
- ✅ Accessible depuis:
  - Page `/fuel` (bouton "Nouveau Bon")
  - Onglet Carburant de chaque camion (bouton "Ajouter Carburant")

### 4. Onglet Carburant dans Page Camions
- ✅ Liste des bons de carburant du camion
- ✅ Tableau avec:
  - Date, Station, Kilométrage
  - Quantité, Type de carburant
  - Montant total
  - Consommation calculée (L/100km)
  - Distance parcourue
  - Statut avec badge coloré
- ✅ Bouton pour ouvrir le modal d'ajout (camion pré-sélectionné)
- ✅ **Statistiques supprimées** (disponibles dans la page `/fuel`)

## 🎨 Design

- ✅ Cohérent avec le reste de l'application
- ✅ Support du light mode et dark mode
- ✅ Responsive (mobile, tablet, desktop)
- ✅ Badges colorés pour les statuts
- ✅ Badges colorés pour les types de carburant
- ✅ Animations et transitions fluides
- ✅ Icons Lucide React
- ✅ Design professionnel et épuré
- ✅ **Modal avec arrière-plan flou transparent** (backdrop-blur-sm bg-black/30)

## 🌐 Traductions

Toutes les traductions ont été ajoutées dans `lib/i18n.ts` :
- Français (fr)
- Anglais (en)
- Terminologie: "Bon de carburant" / "Fuel receipt" (pas "plein")

## 📡 API Endpoints Intégrés

### Prix Carburant
- `POST /api/prix-carburant` - Créer/Mettre à jour les prix
- `GET /api/prix-carburant` - Obtenir les prix configurés

### Stations
- `GET /api/stations` - Liste toutes les stations
- `GET /api/stations/{id}` - Obtenir une station
- `POST /api/stations` - Créer une station
- `PUT /api/stations/{id}` - Modifier une station
- `DELETE /api/stations/{id}` - Supprimer une station

### Bons de Carburant
- `GET /api/bons-carburant` - Liste tous les bons (avec filtres optionnels)
- `GET /api/bons-carburant/{id}` - Obtenir un bon
- `POST /api/bons-carburant` - Créer un bon
- `PUT /api/bons-carburant/{id}` - Modifier un bon
- `DELETE /api/bons-carburant/{id}` - Supprimer un bon
- `GET /api/bons-carburant/camion/{camionId}/stats` - Statistiques d'un camion

## 🔄 Calculs Automatiques

Le backend calcule automatiquement :
- Distance parcourue = kilométrage actuel - kilométrage précédent
- Consommation réelle = (quantité litres / distance parcourue) × 100
- Statut de consommation :
  - ≤ 25 L/100km → BONNE (vert)
  - 25-35 L/100km → MOYENNE (orange)
  - > 35 L/100km → MAUVAISE (rouge)
  - Pas de données → INSUFFISANT (gris)
- Montant total = quantité × prix/litre

## 🚀 Utilisation

1. **Configurer les prix** : Aller sur `/fuel` et configurer les prix du carburant
2. **Ajouter des stations** : Aller sur `/stations` et créer les stations de carburant
3. **Enregistrer un ajout de carburant** : 
   - Cliquer sur le bouton "Nouveau Bon" dans `/fuel` → Modal s'ouvre
   - OU aller sur `/trucks`, sélectionner un camion, onglet "Carburant", cliquer sur "Ajouter Carburant" → Modal s'ouvre avec le camion pré-sélectionné
   - Remplir le formulaire dans le modal
4. **Consulter les statistiques** : 
   - Statistiques globales et par camion sur `/fuel`
   - Liste des bons par camion dans l'onglet "Carburant" de chaque camion
5. **Navigation rapide** :
   - Cliquer sur une carte de camion dans `/fuel` → Redirige vers `/trucks` avec le camion sélectionné et l'onglet "Carburant" ouvert automatiquement

## ⚠️ Notes Importantes

- Le kilométrage doit toujours être supérieur au kilométrage précédent
- La consommation n'est calculée qu'à partir du deuxième bon
- Les totaux des stations sont mis à jour automatiquement
- Chaque admin voit uniquement ses propres données (isolation automatique)
- Toutes les données affichées proviennent des APIs (pas de données fictives)
- Le modal utilise le même style que les autres modals de l'application (arrière-plan flou transparent)

## 🎯 Architecture

- **Page `/fuel`** : Vue d'ensemble avec statistiques globales et par camion + bouton pour ouvrir le modal
  - Cliquer sur une carte de camion → Redirige vers `/trucks?camionId={id}&tab=fuel`
- **Modal `AddBonCarburantModal`** : Formulaire d'ajout de bon (réutilisable, avec ou sans camion pré-sélectionné)
- **Page `/trucks`** : 
  - Gère les paramètres URL `camionId` et `tab` pour sélectionner automatiquement un camion et ouvrir l'onglet carburant
  - Onglet Carburant : Liste des bons du camion sélectionné + bouton pour ouvrir le modal
- **Page `/stations`** : Gestion des stations de carburant

## 🔗 Navigation Intelligente

Le système de navigation permet de passer facilement entre les pages :
1. **Depuis `/fuel`** : Cliquer sur un camion → Ouvre `/trucks` avec ce camion et l'onglet carburant
2. **URL avec paramètres** : `/trucks?camionId=1&tab=fuel` sélectionne automatiquement le camion #1 et ouvre l'onglet carburant
3. **Nettoyage automatique** : Les paramètres URL sont supprimés après utilisation pour garder l'URL propre
