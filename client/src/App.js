import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomeManagement from './pages/HomeManagement';
import UserManagement from './pages/UserManagement';
import CommitteeManagement from './pages/CommitteeManagement';
import ContributionManagement from './pages/ContributionManagement';
import Login from './pages/Login';
import Archive from './pages/Archive';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { PageLoader } from './components/ui/Primitives';

/**
 * Gates a route behind authentication. While the stored token is still being
 * verified isAuthenticated is null, and rendering the redirect then would bounce
 * a signed-in user to /login on every refresh.
 */
const RequireAuth = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (isAuthenticated === null) return <PageLoader label="Checking your session…" />;
    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
};

const App = () => (
    <ToastProvider>
        <Router>
            <div className="min-h-screen bg-ink-50">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<HomeManagement />} />
                        <Route path="/archive" element={<Archive />} />
                        <Route path="/users" element={<RequireAuth><UserManagement /></RequireAuth>} />
                        <Route path="/committees" element={<RequireAuth><CommitteeManagement /></RequireAuth>} />
                        <Route path="/contributions" element={<RequireAuth><ContributionManagement /></RequireAuth>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    </ToastProvider>
);

export default App;
