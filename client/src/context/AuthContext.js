import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check session storage on mount
        const authToken = sessionStorage.getItem('auth');
        setIsAuthenticated(authToken !== null);
    }, []);

    const login = (token) => {
        sessionStorage.setItem('auth', token);
        setIsAuthenticated(true);
    };

    const logout = () => {
        sessionStorage.removeItem('auth');
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
