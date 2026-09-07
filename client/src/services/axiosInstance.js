import axios from 'axios';

// Where the token lives. Kept here so AuthContext and the interceptors below
// cannot drift apart.
export const TOKEN_KEY = 'rosca.token';

/**
 * localStorage rather than sessionStorage: added to a phone's home screen this
 * runs as its own app, and sessionStorage is emptied every time that app is
 * closed, so signing in again was the first thing anyone had to do on opening
 * it. How long a session lasts is the token's business — it carries an expiry,
 * and any 401 clears it — not a question of which drawer it is kept in.
 */
export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Every request carries the session token, so protected endpoints work without
// each call remembering to add the header.
axiosInstance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// A rejected or expired token logs the user out rather than leaving the UI in a
// state where every action silently fails.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && onUnauthorized) onUnauthorized();
        return Promise.reject(error);
    }
);

export default axiosInstance;
