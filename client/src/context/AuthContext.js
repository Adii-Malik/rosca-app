import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // Use null initially to show loading state

    useEffect(() => {
        // Check sessionStorage on mount to verify if user is logged in
        const authToken = sessionStorage.getItem("auth");

        // Simulate async call or setup before the state is ready
        setTimeout(() => {
            setIsAuthenticated(authToken !== null); // Set isAuthenticated only after checking sessionStorage
        }, 0); // Execute immediately after render
    }, []);

    const login = (token) => {
        sessionStorage.setItem("auth", token);
        setIsAuthenticated(true);
    };

    const logout = () => {
        sessionStorage.removeItem("auth");
        setIsAuthenticated(false);
    };

    if (isAuthenticated === null) {
        // Optionally, render a loading spinner while the auth state is being determined
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
