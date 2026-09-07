import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import { Spinner } from '../components/ui/Primitives';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();

    // Send the user back where they were headed before the redirect to /login.
    const destination = location.state?.from?.pathname || '/';

    if (isAuthenticated) return <Navigate to={destination} replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(username, password);
            navigate(destination, { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Unable to sign in.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <span className="inline-flex w-12 h-12 rounded-2xl bg-brand-600 text-white items-center justify-center font-bold text-xl">
                        C
                    </span>
                    <h1 className="mt-4 text-2xl font-bold text-ink-900">Welcome back</h1>
                    <p className="mt-1 text-sm text-ink-500">Sign in to manage committees and draws.</p>
                </div>

                <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                    <div>
                        <label htmlFor="username" className="label">Username</label>
                        <input
                            id="username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="label">Password</label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    {error && (
                        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <button type="submit" className="btn-primary w-full" disabled={submitting}>
                        {submitting && <Spinner className="w-4 h-4" />}
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-ink-400">
                    Viewing the dashboard does not require an account.
                </p>
            </div>
        </div>
    );
};

export default Login;
