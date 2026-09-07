import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/committees', label: 'Committees' },
    { to: '/contributions', label: 'Contributions' },
    { to: '/users', label: 'Members' },
];

// Past committees are readable by anyone, like the dashboard.
const PUBLIC_LINKS = [{ to: '/archive', label: 'Archive' }];

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    // Guests only ever see the dashboard, so the rest of the nav is hidden.
    const links = isAuthenticated
        ? [...LINKS, ...PUBLIC_LINKS]
        : [...LINKS.slice(0, 1), ...PUBLIC_LINKS];

    const linkClass = ({ isActive }) =>
        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'
        }`;

    return (
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-ink-100 safe-top">
            <nav className="max-w-7xl mx-auto safe-x sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-4">
                    <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMenuOpen(false)}>
                        <span className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                            C
                        </span>
                        <span className="font-bold text-ink-900 hidden sm:block">Committee</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1 flex-1">
                        {links.map((link) => (
                            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                                {link.label}
                            </NavLink>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                <span className="text-sm text-ink-500">
                                    Signed in as <span className="font-medium text-ink-700">{user?.username}</span>
                                </span>
                                <button onClick={logout} className="btn-secondary">Sign out</button>
                            </>
                        ) : (
                            <Link to="/login" className="btn-primary">Sign in</Link>
                        )}
                    </div>

                    <button
                        onClick={() => setMenuOpen((open) => !open)}
                        className="md:hidden btn-ghost p-2"
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                            />
                        </svg>
                    </button>
                </div>
            </nav>

            {menuOpen && (
                <div className="md:hidden border-t border-ink-100 bg-white px-4 py-3 space-y-1 animate-fade-in">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) =>
                                `block px-3 py-2.5 rounded-lg text-sm font-medium ${
                                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-100'
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                    <div className="pt-2 border-t border-ink-100">
                        {isAuthenticated ? (
                            <button onClick={() => { setMenuOpen(false); logout(); }} className="btn-secondary w-full">
                                Sign out
                            </button>
                        ) : (
                            <Link to="/login" state={{ from: location }} onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
