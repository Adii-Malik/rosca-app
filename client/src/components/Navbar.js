import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
    const { isAuthenticated, logout } = useContext(AuthContext);
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen(!menuOpen);

    return (
        <nav className="bg-blue-600 shadow-lg fixed w-full z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/" className="text-xl font-bold text-white">
                            Committee App
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        {isAuthenticated ? (
                            <>
                                <Link to="/" className="text-white hover:text-gray-200">
                                    Home
                                </Link>
                                <Link to="/users" className="text-white hover:text-gray-200">
                                    Users
                                </Link>
                                <Link to="/committees" className="text-white hover:text-gray-200">
                                    Committees
                                </Link>
                                <Link to="/contributions" className="text-white hover:text-gray-200">
                                    Contributions
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-white bg-red-500 px-4 py-2 rounded-md hover:bg-red-600"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="text-white bg-green-500 px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                                Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={toggleMenu}
                            className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg
                                className="h-6 w-6"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d={
                                        menuOpen
                                            ? "M6 18L18 6M6 6l12 12"
                                            : "M4 6h16M4 12h16M4 18h16"
                                    }
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {menuOpen && (
                <div className="md:hidden bg-blue-600 border-t border-blue-500">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/users"
                                    className="block text-white hover:bg-blue-700 px-3 py-2 rounded-md"
                                >
                                    Users
                                </Link>
                                <Link
                                    to="/committees"
                                    className="block text-white hover:bg-blue-700 px-3 py-2 rounded-md"
                                >
                                    Committees
                                </Link>
                                <Link
                                    to="/contributions"
                                    className="block text-white hover:bg-blue-700 px-3 py-2 rounded-md"
                                >
                                    Contributions
                                </Link>
                                <button
                                    onClick={logout}
                                    className="block w-full text-white bg-red-500 px-3 py-2 rounded-md hover:bg-red-600"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="block text-white bg-green-500 px-3 py-2 rounded-md hover:bg-blue-700"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
