import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (name: string, phone: string, avatarUrl?: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (passwordResetToken: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Authenticate user on initial shell mount by checking session
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Try refreshing access token first
                const tokenData = await apiClient.post<{ access_token: string }>('/auth/refresh');
                apiClient.setAccessToken(tokenData.access_token);

                // Pull user profile
                const userData = await apiClient.get<User>('/auth/me');
                setUser(userData);
            } catch (err) {
                // Safe to swallow: user not authenticated or cookie missing/expired
                apiClient.setAccessToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Register callback for when request triggers an API auth failure (revocation etc)
        apiClient.registerAuthFailureCallback(() => {
            setUser(null);
        });
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const data = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });
            apiClient.setAccessToken(data.access_token);

            const userData = await apiClient.get<User>('/auth/me');
            setUser(userData);
        } catch (err) {
            apiClient.setAccessToken(null);
            setUser(null);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string, phone?: string) => {
        setLoading(true);
        try {
            // Normal signup
            await apiClient.post<User>('/auth/register', { name, email, password, phone });
            setLoading(false);
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (err) {
            // safe to ignore logout endpoint errors
        } finally {
            apiClient.setAccessToken(null);
            setUser(null);
        }
    };

    const updateProfile = async (name: string, phone: string, avatarUrl?: string) => {
        try {
            const updatedUser = await apiClient.patch<User>('/auth/me', { name, phone, avatar_url: avatarUrl });
            setUser(updatedUser);
        } catch (err) {
            throw err;
        }
    };

    const forgotPassword = async (email: string) => {
        try {
            await apiClient.post('/auth/forgot-password', { email });
        } catch (err) {
            throw err;
        }
    };

    const resetPassword = async (passwordResetToken: string, newPassword: string) => {
        try {
            await apiClient.post('/auth/reset-password', { token: passwordResetToken, new_password: newPassword });
        } catch (err) {
            throw err;
        }
    };

    const val: AuthContextType = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        forgotPassword,
        resetPassword,
    };

    return <AuthContext.Provider value={val}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }
    return context;
};
