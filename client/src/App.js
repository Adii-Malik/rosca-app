import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Updated import for react-router-dom v6
import Navbar from './components/Navbar';
import HomeManagement from './pages/HomeManagement';
import UserManagement from './pages/UserManagement';
import CommitteeManagement from './pages/CommitteeManagement';
import ContributionManagement from './pages/ContributionManagement';

const App = () => {
  return (
    <Router>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes> {/* Changed from Switch to Routes for react-router-dom v6 */}
          <Route path="/users" element={<UserManagement />} />
          <Route path="/committees" element={<CommitteeManagement />} />
          <Route path="/contributions" element={<ContributionManagement />} />
          <Route path="/" element={<HomeManagement />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
