import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api.service';

interface User {
    id: string;
    nom: string;
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Vérifier si l'utilisateur est déjà connecté (session par onglet)
        const token = sessionStorage.getItem('token');
        if (token) {
            apiService.setToken(token);
            loadUser();
        } else {
            setIsLoading(false);
        }
    }, []);

    const loadUser = async () => {
        try {
            const userData = await apiService.getCurrentUser();
            setUser(userData.user);
        } catch (error) {
            console.error('Erreur lors du chargement de l\'utilisateur:', error);
            sessionStorage.removeItem('token');
            apiService.setToken('');
        } finally {
            setIsLoading(false);
        }
    };

    const login = useCallback(async (username: string, password: string) => {
        const data = await apiService.login(username, password);
        setUser(data.user);
        sessionStorage.setItem('token', data.token);
        apiService.setToken(data.token);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem('token');
        apiService.setToken('');
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        user,
        login,
        logout,
        isLoading
    }), [user, login, logout, isLoading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
