import React, { createContext, useState, useContext, useEffect } from 'react';
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
        // Vérifier si  l'utilisateur est déjà connecté
        const token = localStorage.getItem('token');
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
            localStorage.removeItem('token');
            apiService.setToken('');
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username: string, password: string) => {
        const data = await apiService.login(username, password);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        apiService.setToken(data.token);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
        apiService.setToken('');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
