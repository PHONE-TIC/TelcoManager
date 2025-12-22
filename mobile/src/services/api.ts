import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL de base
// Remplacez 192.168.1.66 par votre IP locale si différente
const SERVER_IP = '192.168.1.65';
const BASE_URL = `http://${SERVER_IP}:3001/api`;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', { username, password });
        return response.data;
    },

    logout: async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    }
};

export const interventionService = {
    getAll: async (params?: { clientId?: string; technicienId?: string; statut?: string; page?: number, limit?: number }) => {
        const response = await api.get('/interventions', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/interventions/${id}`);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/interventions/${id}`, data);
        return response.data;
    },

    updateStatus: async (id: string, data: { statut: string; datePriseEnCharge?: string; commentaireTechnicien?: string }) => {
        const response = await api.put(`/interventions/${id}/status`, data);
        return response.data;
    },

    validateHours: async (id: string, data: { heureArrivee: string; heureDepart: string }) => {
        const response = await api.put(`/interventions/${id}/hours`, data);
        return response.data;
    },

    sign: async (id: string, data: { type: 'technicien' | 'client'; signature: string }) => {
        const response = await api.put(`/interventions/${id}/sign`, data);
        return response.data;
    },

    manageEquipment: async (id: string, data: { stockId: string; action: 'install' | 'retrait'; etat?: 'ok' | 'hs'; quantite?: number; notes?: string }) => {
        const response = await api.post(`/interventions/${id}/equipements`, data);
        return response.data;
    },

    lock: async (id: string) => {
        const response = await api.post(`/interventions/${id}/lock`);
        return response.data;
    },

    unlock: async (id: string) => {
        const response = await api.post(`/interventions/${id}/unlock`);
        return response.data;
    }
};

export const technicianStockService = {
    getTechnicianStock: async (technicienId: string) => {
        const response = await api.get(`/technician-stock/${technicienId}`);
        return response.data;
    }
};

export const stockService = {
    getAll: async () => {
        const response = await api.get('/stock');
        return response.data;
    }
};

export const inventoryService = {
    getSessions: async () => {
        const response = await api.get('/inventory');
        return response.data;
    },

    getSession: async (id: string) => {
        const response = await api.get(`/inventory/${id}`);
        return response.data;
    },

    createSession: async (notes?: string) => {
        const response = await api.post('/inventory', { notes });
        return response.data;
    },

    updateItems: async (sessionId: string, items: any[]) => {
        const response = await api.put(`/inventory/${sessionId}/items`, { items });
        return response.data;
    },

    finalizeSession: async (sessionId: string) => {
        const response = await api.post(`/inventory/${sessionId}/finalize`);
        return response.data;
    },

    deleteSession: async (sessionId: string) => {
        const response = await api.delete(`/inventory/${sessionId}`);
        return response.data;
    }
};

export default api;
