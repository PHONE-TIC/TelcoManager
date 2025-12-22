import axios from 'axios';

const API_URL = '/api';

class ApiService {
    private api;

    constructor() {
        this.api = axios.create({
            baseURL: API_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Interceptor pour gérer les sessions expirées (401)
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    // Ne pas rediriger pour les endpoints d'authentification
                    const url = error.config?.url || '';
                    const isAuthEndpoint = url.includes('/auth/');

                    // Si on n'est pas déjà sur la page de login ET ce n'est pas un endpoint d'auth
                    if (!window.location.pathname.includes('/login') && !isAuthEndpoint) {
                        console.warn('Session expirée, redirection vers login...');
                        sessionStorage.removeItem('token');
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    setToken(token: string) {
        if (token) {
            this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.api.defaults.headers.common['Authorization'];
        }
    }

    // Auth
    async login(username: string, password: string) {
        const response = await this.api.post('/auth/login', { username, password });
        return response.data;
    }

    async getCurrentUser() {
        const response = await this.api.get('/auth/me');
        return response.data;
    }

    // Clients
    async getClients(params?: any) {
        const response = await this.api.get('/clients', { params });
        return response.data;
    }

    async getClientById(id: string) {
        const response = await this.api.get(`/clients/${id}`);
        return response.data;
    }

    async getClientInterventions(id: string, limit = 5) {
        const response = await this.api.get(`/clients/${id}/interventions`, { params: { limit } });
        return response.data;
    }

    async createClient(data: any) {
        const response = await this.api.post('/clients', data);
        return response.data;
    }

    async updateClient(id: string, data: any) {
        const response = await this.api.put(`/clients/${id}`, data);
        return response.data;
    }

    async deleteClient(id: string) {
        await this.api.delete(`/clients/${id}`);
    }

    // Techniciens
    async getTechniciens(params?: any) {
        const response = await this.api.get('/techniciens', { params });
        return response.data;
    }

    async getTechnicienById(id: string) {
        const response = await this.api.get(`/techniciens/${id}`);
        return response.data;
    }

    async createTechnicien(data: any) {
        const response = await this.api.post('/techniciens', data);
        return response.data;
    }

    async updateTechnicien(id: string, data: any) {
        const response = await this.api.put(`/techniciens/${id}`, data);
        return response.data;
    }

    async deleteTechnicien(id: string) {
        await this.api.delete(`/techniciens/${id}`);
    }

    // Interventions
    async getInterventions(params?: any) {
        const response = await this.api.get('/interventions', { params });
        return response.data;
    }

    async getInterventionById(id: string) {
        const response = await this.api.get(`/interventions/${id}`);
        return response.data;
    }

    async createIntervention(data: any) {
        const response = await this.api.post('/interventions', data);
        return response.data;
    }

    async updateIntervention(id: string, data: any) {
        const response = await this.api.put(`/interventions/${id}`, data);
        return response.data;
    }

    async deleteIntervention(id: string) {
        await this.api.delete(`/interventions/${id}`);
    }

    async lockIntervention(id: string) {
        const response = await this.api.post(`/interventions/${id}/lock`);
        return response.data;
    }

    async unlockIntervention(id: string) {
        const response = await this.api.post(`/interventions/${id}/unlock`);
        return response.data;
    }

    // Intervention Workflow
    async updateInterventionStatus(id: string, data: { statut: string; datePriseEnCharge?: string; commentaireTechnicien?: string }) {
        const response = await this.api.put(`/interventions/${id}/status`, data);
        return response.data;
    }

    async validateInterventionHours(id: string, data: { heureArrivee: string; heureDepart: string }) {
        const response = await this.api.put(`/interventions/${id}/hours`, data);
        return response.data;
    }

    async signIntervention(id: string, data: { type: 'client' | 'technicien'; signature: string }) {
        const response = await this.api.put(`/interventions/${id}/sign`, data);
        return response.data;
    }

    async manageInterventionEquipment(id: string, data: {
        stockId?: string;
        nom?: string;
        action: 'install' | 'retrait';
        quantite?: number;
        etat?: 'ok' | 'hs';
        notes?: string;
        serialNumber?: string;
    }) {
        const response = await this.api.post(`/interventions/${id}/equipement`, data);
        return response.data;
    }


    // Stock
    async getStock(params?: any) {
        const response = await this.api.get('/stock', { params });
        return response.data;
    }

    async getStockById(id: string) {
        const response = await this.api.get(`/stock/${id}`);
        return response.data;
    }

    async getStockByBarcode(codeBarre: string) {
        const response = await this.api.get(`/stock/barcode/${codeBarre}`);
        return response.data;
    }

    async createStock(data: any) {
        const response = await this.api.post('/stock', data);
        return response.data;
    }

    async updateStock(id: string, data: any) {
        const response = await this.api.put(`/stock/${id}`, data);
        return response.data;
    }

    async moveToHS(id: string, data: any) {
        const response = await this.api.post(`/stock/${id}/move-to-hs`, data);
        return response.data;
    }

    async getStockStats() {
        const response = await this.api.get('/stock/stats/summary');
        return response.data;
    }

    async deleteStock(id: string) {
        await this.api.delete(`/stock/${id}`);
    }

    // Stock Movements
    async getStockMovements(stockId: string, params?: any) {
        const response = await this.api.get(`/stock/${stockId}/movements`, { params });
        return response.data;
    }

    async getAllStockMovements(params?: any) {
        const response = await this.api.get('/stock-movements', { params });
        return response.data;
    }

    async transferStockToTechnician(stockId: string, data: { technicienId: string; quantite: number; reason?: string }) {
        const response = await this.api.post(`/stock/${stockId}/transfer`, data);
        return response.data;
    }

    async bulkImportStock(items: any[]) {
        const response = await this.api.post('/stock/import', { items });
        return response.data;
    }

    // Inventaire
    async scanBarcode(codeBarre: string) {
        const response = await this.api.post('/inventaire/scan', { codeBarre });
        return response.data;
    }

    async startInventorySession() {
        const response = await this.api.post('/inventaire/session/start');
        return response.data;
    }

    async addToInventorySession(sessionId: string, codeBarre: string, quantite = 1) {
        const response = await this.api.post(`/inventaire/session/${sessionId}/add`, { codeBarre, quantite });
        return response.data;
    }

    async finishInventorySession(sessionId: string) {
        const response = await this.api.post(`/inventaire/sessions/${sessionId}/finish`);
        return response.data;
    }

    // Technician Stock (Vehicle Stock)
    async getTechnicianStock(technicienId: string) {
        const response = await this.api.get(`/technician-stock/${technicienId}`);
        return response.data;
    }

    async addItemToVehicle(technicienId: string, data: { stockId: string; quantite: number }) {
        const response = await this.api.post(`/technician-stock/${technicienId}`, data);
        return response.data;
    }

    async updateVehicleItemQuantity(technicienId: string, stockId: string, quantite: number) {
        const response = await this.api.put(`/technician-stock/${technicienId}/${stockId}`, { quantite });
        return response.data;
    }

    async removeItemFromVehicle(technicienId: string, stockId: string) {
        const response = await this.api.delete(`/technician-stock/${technicienId}/${stockId}`);
        return response.data;
    }

    async deleteTechnicianStock(id: string) {
        const response = await this.api.delete(`/technician-stock/${id}`);
        return response.data;
    }

    // Inventaires
    async getInventorySessions() {
        const response = await this.api.get('/inventaire/sessions');
        return response.data;
    }

    async getInventorySession(id: string) {
        const response = await this.api.get(`/inventaire/sessions/${id}`);
        return response.data;
    }

    async createInventorySession(data: any) {
        const response = await this.api.post('/inventaire/sessions', data);
        return response.data;
    }

    async updateInventoryItems(sessionId: string, items: any[]) {
        const response = await this.api.put(`/inventaire/sessions/${sessionId}/items`, { items });
        return response.data;
    }

    async finalizeInventorySession(id: string) {
        const response = await this.api.post(`/inventaire/sessions/${id}/finalize`);
        return response.data;
    }

    async deleteInventorySession(id: string) {
        const response = await this.api.delete(`/inventaire/sessions/${id}`);
        return response.data;
    }

    // Global Search
    async globalSearch(params: {
        q: string;
        entities?: string[];
        filters?: any
    }) {
        const response = await this.api.get('/search/global', {
            params: {
                ...params,
                filters: JSON.stringify(params.filters || {})
            }
        });
        return response.data;
    }

    // UNYC Integration
    async testUnycConnection() {
        const response = await this.api.get('/unyc/test-connection');
        return response.data;
    }

    async syncUnycCustomers() {
        const response = await this.api.post('/unyc/sync-customers');
        return response.data;
    }
}

export const apiService = new ApiService();
