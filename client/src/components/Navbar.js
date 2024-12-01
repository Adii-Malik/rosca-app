import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { isAuthenticated, logout } = useContext(AuthContext);

    return (
        <nav className="bg-blue-600 p-4 shadow-lg">
            <div className="container mx-auto flex items-center justify-between">
                {/* Left Side - Branding */}
                <div className="text-white text-lg font-bold">
                    <Link to="/" className="hover:text-gray-200">Committee App</Link>
                </div>

                {/* Right Side - Links */}
                <ul className="flex items-center space-x-4">
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/users" className="text-white hover:text-gray-200">Users</Link></li>
                            <li><Link to="/committees" className="text-white hover:text-gray-200">Committees</Link></li>
                            <li><Link to="/contributions" className="text-white hover:text-gray-200">Contributions</Link></li>
                            <li>
                                <button
                                    onClick={logout}
                                    className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 transition duration-200"
                                >
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <li>
                            <Link
                                to="/login"
                                className="bg-green-500 text-white py-1 px-3 rounded hover:bg-blue-700 transition duration-200"
                            >
                                Login
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
