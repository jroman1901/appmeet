import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleCalendarProvider } from './contexts/GoogleCalendarContext';
import PrivateRoute from './components/PrivateRoute';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MeetingScheduler from './components/MeetingScheduler';
import MeetingsList from './components/MeetingsList';
import TaskManager from './components/TaskManager';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import Calendar from './components/Calendar';
import './App.css';

// Componente Layout que incluye Navigation y Footer
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        {children}
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-copyright">&copy; 2026 Meeting Scheduler &middot; Sistema de gestión de reuniones y tareas</p>
          <div className="version-info">
            <span className="version-number">v3.0.0</span>
            <span className="version-features">Integración con Google Calendar &amp; Seguridad Reforzada</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {

  return (
    <AuthProvider>
      <GoogleCalendarProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <Navigate to="/dashboard" />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/schedule" element={
              <PrivateRoute>
                <Layout>
                  <MeetingScheduler />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/meetings" element={
              <PrivateRoute>
                <Layout>
                  <MeetingsList />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/tasks" element={
              <PrivateRoute>
                <Layout>
                  <TaskManager />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/calendar" element={
              <PrivateRoute>
                <Layout>
                  <Calendar />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute>
                <Layout>
                  <AdminPanel />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <Layout>
                  <Profile />
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </Router>
      </GoogleCalendarProvider>
    </AuthProvider>
  );
}

export default App;
