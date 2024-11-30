import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomeManagement from './pages/HomeManagement';
import UserManagement from './pages/UserManagement';
import CommitteeManagement from './pages/CommitteeManagement';
import ContributionManagement from './pages/ContributionManagement';
import Login from './pages/Login';
import { AuthContext } from './context/AuthContext';

const App = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Router>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/users"
            element={isAuthenticated ? <UserManagement /> : <Navigate to="/login" />}
          />
          <Route
            path="/committees"
            element={isAuthenticated ? <CommitteeManagement /> : <Navigate to="/login" />}
          />
          <Route
            path="/contributions"
            element={isAuthenticated ? <ContributionManagement /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<HomeManagement />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
