import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getRole, getProfile, clearAuth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(getToken);
    const [role, setRole] = useState(getRole);
    const [profile, setProfile] = useState(getProfile);

    // Sync from localStorage whenever token changes (e.g. after login in LoginPage)
    useEffect(() => {
        setToken(getToken());
        setRole(getRole());
        setProfile(getProfile());
    }, []);

    const refreshAuth = () => {
        setToken(getToken());
        setRole(getRole());
        setProfile(getProfile());
    };

    const logout = () => {
        clearAuth();
        setToken(null);
        setRole(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ token, role, profile, refreshAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
