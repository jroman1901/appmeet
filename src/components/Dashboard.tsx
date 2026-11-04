import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/firebaseService';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMeetings: 0,
    pendingMeetings: 0,
    completedMeetings: 0,
    overdueMeetings: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const { currentUser, logout } = useAuth();
  const firebaseService = FirebaseService.getInstance();

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        // Cargar estadísticas
        const statsData = await firebaseService.getUserStats(currentUser.uid);
        setStats(statsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, firebaseService]);


  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Panel de Control - Agenda de Reuniones</h1>
        <div className="user-info">
          <span>Bienvenido, {currentUser?.email}</span>
          <button onClick={logout} className="btn-secondary">Cerrar Sesión</button>
        </div>
      </header>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Reuniones Pendientes</h3>
          <div className="stat-number">{stats.pendingMeetings}</div>
        </div>
        <div className="stat-card overdue">
          <h3>Reuniones Atrasadas</h3>
          <div className="stat-number">{stats.overdueMeetings}</div>
        </div>
        <div className="stat-card completed">
          <h3>Reuniones Completadas</h3>
          <div className="stat-number">{stats.completedMeetings}</div>
        </div>
        <div className="stat-card">
          <h3>Tareas Pendientes</h3>
          <div className="stat-number">{stats.pendingTasks}</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="section">
          <h2>Acciones Rápidas</h2>
          <div className="quick-actions">
            <a href="/schedule" className="btn-primary">
              + Programar Reunión
            </a>
            <a href="/tasks" className="btn-secondary">
              + Nueva Tarea
            </a>
          </div>
        </div>

        <div className="section">
          <h2>Resumen</h2>
          <p>Bienvenido a tu panel de control de reuniones.</p>
          <p>Usa el menú de navegación para:</p>
          <ul>
            <li>📅 <strong>Programar Reunión:</strong> Crear nuevas citas con clientes</li>
            <li>📋 <strong>Mis Reuniones:</strong> Ver y gestionar todas tus reuniones</li>
            <li>✅ <strong>Mis Tareas:</strong> Organizar tus pendientes</li>
          </ul>
        </div>

        <div className="section">
          <h2>Estadísticas</h2>
          <div className="stats-summary">
            <p>Total de reuniones: <strong>{stats.totalMeetings}</strong></p>
            <p>Total de tareas: <strong>{stats.totalTasks}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}