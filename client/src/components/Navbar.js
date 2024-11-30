// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();

    const isAuthenticated = () => {
        return sessionStorage.getItem('auth') !== null; // Check if user is authenticated
    };

    const handleLogout = () => {
        sessionStorage.removeItem('auth'); // Clear authentication
        navigate('/login'); // Redirect to login page using react-router
    };

    return (
        <nav className="bg-blue-600 p-4">
            <div className="container mx-auto flex justify-between items-center">
                {/* Left Section */}
                <div className="flex space-x-4">
                    {isAuthenticated() ? (
                        <>
                            <Link className="text-white hover:text-gray-200" to="/">Home</Link>
                            <Link className="text-white hover:text-gray-200" to="/users">User Management</Link>
                            <Link className="text-white hover:text-gray-200" to="/committees">Committee Management</Link>
                            <Link className="text-white hover:text-gray-200" to="/contributions">Contribution Management</Link>
                        </>
                    ) : (
                        <Link className="text-white hover:text-gray-200 font-bold text-lg" to="/">ROSCA App</Link>
                    )}
                </div>

                {/* Right Section */}
                <div>
                    {isAuthenticated() ? (
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            to="/login"
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;