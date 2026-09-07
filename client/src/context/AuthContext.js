import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { login as loginRequest, fetchCurrentUser } from '../services/api';
import { TOKEN_KEY, setUnauthorizedHandler } from '../services/axiosInstance';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const readToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(readToken);
    const [user, setUser] = useState(null);
    // null = still determining, true/false = known
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
            /* storage unavailable */
        }
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    // Any 401 from the API tears the session down.
    useEffect(() => {
        setUnauthorizedHandler(logout);
        return () => setUnauthorizedHandler(null);
    }, [logout]);

    // A stored token is only trusted once the server confirms it is still valid,
    // rather than assuming "a token exists" means "signed in".
    useEffect(() => {
        let cancelled = false;

        if (!token) {
            setIsAuthenticated(false);
            return undefined;
        }

        fetchCurrentUser()
            .then(({ user: confirmed }) => {
                if (cancelled) return;
                setUser(confirmed);
                setIsAuthenticated(true);
            })
            .catch(() => {
                if (!cancelled) logout();
            });

        return () => {
            cancelled = true;
        };
    }, [token, logout]);

    const login = useCallback(async (username, password) => {
        const { token: issued, user: authenticated } = await loginRequest(username, password);
        try {
            localStorage.setItem(TOKEN_KEY, issued);
        } catch {
            /* storage unavailable — the session lasts until reload */
        }
        setToken(issued);
        setUser(authenticated);
        setIsAuthenticated(true);
        return authenticated;
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
