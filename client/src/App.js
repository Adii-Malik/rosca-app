import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomeManagement from './pages/HomeManagement';
import UserManagement from './pages/UserManagement';
import CommitteeManagement from './pages/CommitteeManagement';
import ContributionManagement from './pages/ContributionManagement';
import Login from './pages/Login';

const App = () => {
  const isAuthenticated = () => {
    return sessionStorage.getItem('auth') !== null;
  };

  return (
    <Router>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/users" element={isAuthenticated() ? <UserManagement /> : <Navigate to="/login" />} />
          <Route path="/committees" element={isAuthenticated() ? <CommitteeManagement /> : <Navigate to="/login" />} />
          <Route path="/contributions" element={isAuthenticated() ? <ContributionManagement /> : <Navigate to="/login" />} />
          <Route path="/" element={<HomeManagement />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
