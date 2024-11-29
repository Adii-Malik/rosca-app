// src/components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav className="bg-blue-600 p-4">
            <div className="container mx-auto">
                <ul className="flex space-x-4">
                    <li>
                        <Link to="/" className="text-white hover:text-gray-200">Home</Link>
                    </li>
                    <li>
                        <Link to="/users" className="text-white hover:text-gray-200">Users</Link>
                    </li>
                    <li>
                        <Link to="/committees" className="text-white hover:text-gray-200">Committees</Link>
                    </li>
                    <li>
                        <Link to="/contributions" className="text-white hover:text-gray-200">Contributions</Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;