import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import MeetingScheduler from './components/MeetingScheduler';
import MeetingsList from './components/MeetingsList';
import TaskManager from './components/TaskManager';
import AdminPanel from './components/AdminPanel';
import FirstAdminSetup from './components/FirstAdminSetup';
import Calendar from './components/Calendar';
import './App.css';

function App() {

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <Navigate to="/dashboard" />
                  </main>
                </div>
              </PrivateRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <Dashboard />
                  </main>
                </div>
              </PrivateRoute>
            } />
            <Route path="/schedule" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <MeetingScheduler />
                  </main>
                </div>
              </PrivateRoute>
            } />
            <Route path="/meetings" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <MeetingsList />
                  </main>
                </div>
              </PrivateRoute>
            } />
            <Route path="/tasks" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <TaskManager />
                  </main>
                </div>
              </PrivateRoute>
            } />
            <Route path="/calendar" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <Calendar />
                  </main>
                </div>
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <AdminPanel />
                  </main>
                </div>
              </PrivateRoute>
            } />
            <Route path="/setup-admin" element={
              <PrivateRoute>
                <div className="app-layout">
                  <Navigation />
                  <main className="main-content">
                    <FirstAdminSetup />
                  </main>
                </div>
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
