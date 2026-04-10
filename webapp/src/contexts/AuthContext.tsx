import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api.service';
import { AuthContext, type User } from './auth-context';

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

