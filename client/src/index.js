import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import AuthProvider from './context/AuthContext';

// React 18 root API. The legacy ReactDOM.render used before opted the whole app
// out of concurrent rendering.
const root = createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
);
