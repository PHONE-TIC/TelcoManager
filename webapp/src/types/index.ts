// Types partagés pour l'application TelcoManager

export interface Client {
  id: string;
  nom: string;
  sousLieu?: string;
  rue: string;
  codePostal: string;
  ville: string;
  contact: string;
  telephone: string;
  email?: string;
  notes?: string;
  adresse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  dataUrl: string;
  type: "before" | "after" | "other";
  caption?: string;
  timestamp: Date;
}

export interface Technicien {
  id: string;
  nom: string;
  username: string;
  role: "admin" | "gestionnaire" | "technicien";
  active: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  id: string;
  nomMateriel: string;
  marque?: string;
  modele?: string;
  reference: string;
  numeroSerie: string;
  codeBarre?: string;
  categorie: string;
  fournisseur?: string;
  statut: "courant" | "hs" | "retour_fournisseur";
  quantite: number;
  lowStockThreshold?: number;
  dateEntree: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  technicianStocks?: TechnicianStock[];
  clientEquipements?: ClientEquipment[];
}

export interface TechnicianStock {
  id: string;
  technicienId: string;
  stockId: string;
  quantite: number;
  etat: "ok" | "hs";
  clientId?: string;
  assignedAt?: string;
  technicien?: Technicien;
  stock?: Stock;
  client?: Client;
}

export interface ClientEquipment {
  id: string;
  clientId: string;
  clientNom?: string;
  stockId: string;
  referenceMateriel: string;
  dateInstallation: string;
  statut: "installe" | "retire" | "hs";
  notes?: string;
  client?: Client;
  stock?: Stock;
}

export interface Intervention {
  id: string;
  numero: string;
  compteur: number;
  clientId: string;
  clientNom?: string;
  technicienId?: string;
  technicienNom?: string;
  titre: string;
  description?: string;
  datePlanifiee: string;
  datePriseEnCharge?: string;
  heureArrivee?: string;
  heureDepart?: string;
  dateRealisee?: string;
  statut: "planifiee" | "en_cours" | "terminee" | "annulee";
  type: "SAV" | "Installation";
  notes?: string;
  signature?: string;
  signatureTechnicien?: string;
  commentaireTechnicien?: string;
  lockedAt?: string;
  lockedBy?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  technicien?: Technicien;
  equipements?: InterventionEquipment[];
  [key: string]: any;
}

export interface InterventionEquipment {
  id: string;
  interventionId: string;
  stockId?: string;
  action: "installe" | "retire" | "remplace" | string;
  quantite: number;
  nom?: string;
  marque?: string;
  modele?: string;
  serialNumber?: string;
  etat?: string;
  notes?: string;
  stock?: Stock;
}

export interface StockMovement {
  id: string;
  stockId: string;
  type: "entree" | "sortie" | "transfert" | "ajustement" | "hs";
  quantite: number;
  quantiteAvant: number;
  quantiteApres: number;
  reason?: string;
  technicienId?: string;
  performedById?: string;
  createdAt: string;
  stock?: Stock;
  technicien?: Technicien;
  performedBy?: Technicien;
}

export interface InventorySession {
  id: string;
  date: string;
  status: "draft" | "completed";
  notes?: string;
  items?: InventoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  sessionId: string;
  stockId: string;
  expectedQuantity: number;
  countedQuantity?: number;
  notes?: string;
  stock?: Stock;
}

export interface User {
  id: string;
  nom: string;
  username: string;
  role: "admin" | "gestionnaire" | "technicien";
  active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StockListResponse {
  stock: Stock[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TechniciensListResponse {
  techniciens: Technicien[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ClientsListResponse {
  clients: Client[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InterventionsListResponse {
  interventions: Intervention[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
