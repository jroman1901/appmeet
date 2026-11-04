import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, or } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/firebaseService';
import { Meeting, Task } from '../types';
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

type AgendaItem = (Meeting & { type: 'meeting' }) | (Task & { type: 'task' });

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
  const [upcomingItems, setUpcomingItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, logout } = useAuth();
  const firebaseService = FirebaseService.getInstance();

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        const statsData = await firebaseService.getUserStats(currentUser.uid);
        setStats(statsData);

        // Se usa el inicio del día (no la hora exacta actual) como límite inferior
        // para que algo programado "hoy" temprano no quede excluido por ya haber
        // pasado esa hora en el momento de cargar el panel.
        const todayStart = startOfDay(new Date());
        const weekAhead = endOfDay(addDays(todayStart, 7));

        const meetingsQuery = query(
          collection(db, 'meetings'),
          where('createdBy', '==', currentUser.uid),
          where('startTime', '>=', todayStart),
          where('startTime', '<=', weekAhead),
          orderBy('startTime', 'asc')
        );
        const meetingsSnap = await getDocs(meetingsQuery);
        const meetings: AgendaItem[] = meetingsSnap.docs
          .map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            startTime: docSnap.data().startTime?.toDate(),
            endTime: docSnap.data().endTime?.toDate()
          }) as Meeting)
          .filter(meeting => meeting.status === 'pending')
          .map(meeting => ({ ...meeting, type: 'meeting' as const }));

        const tasksQuery = query(
          collection(db, 'tasks'),
          or(
            where('createdBy', '==', currentUser.uid),
            where('sharedWith', 'array-contains', currentUser.uid),
            where('isPublic', '==', true)
          )
        );
        const tasksSnap = await getDocs(tasksQuery);
        const tasks: AgendaItem[] = tasksSnap.docs
          .map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            dueDate: docSnap.data().dueDate?.toDate()
          }) as Task)
          .filter(task => task.status === 'pending' && task.dueDate && task.dueDate >= todayStart && task.dueDate <= weekAhead)
          .map(task => ({ ...task, type: 'task' as const }));

        const combined = [...meetings, ...tasks].sort((a, b) => {
          const dateA = a.type === 'meeting' ? a.startTime : (a.dueDate as Date);
          const dateB = b.type === 'meeting' ? b.startTime : (b.dueDate as Date);
          return dateA.getTime() - dateB.getTime();
        }).slice(0, 8);

        setUpcomingItems(combined);
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, firebaseService]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    return format(date, "EEE d MMM", { locale: es });
  };

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
        <Link to="/meetings?filter=pending" className="stat-card stat-card-link">
          <h3>Reuniones Pendientes</h3>
          <div className="stat-number">{stats.pendingMeetings}</div>
        </Link>
        <Link to="/meetings?filter=overdue" className="stat-card stat-card-link overdue">
          <h3>Reuniones Atrasadas</h3>
          <div className="stat-number">{stats.overdueMeetings}</div>
        </Link>
        <Link to="/meetings?filter=completed" className="stat-card stat-card-link completed">
          <h3>Reuniones Completadas</h3>
          <div className="stat-number">{stats.completedMeetings}</div>
        </Link>
        <Link to="/tasks?filter=pending" className="stat-card stat-card-link">
          <h3>Tareas Pendientes</h3>
          <div className="stat-number">{stats.pendingTasks}</div>
        </Link>
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

        <div className="section agenda-section">
          <div className="agenda-header">
            <h2>📅 Próximos 7 días</h2>
            <Link to="/calendar" className="agenda-link">Ver calendario completo →</Link>
          </div>

          {upcomingItems.length === 0 ? (
            <p className="agenda-empty">No tienes reuniones ni tareas programadas en los próximos 7 días.</p>
          ) : (
            <ul className="agenda-list">
              {upcomingItems.map(item => (
                <li key={`${item.type}-${item.id}`} className={`agenda-item ${item.type} priority-${item.priority}`}>
                  <div className="agenda-date">
                    {getDateLabel(item.type === 'meeting' ? item.startTime : (item.dueDate as Date))}
                  </div>
                  <div className="agenda-icon">{item.type === 'meeting' ? '📅' : '📋'}</div>
                  <div className="agenda-details">
                    <span className="agenda-title">{item.title}</span>
                    {item.type === 'meeting' && <span className="agenda-sub">{item.clientName}</span>}
                  </div>
                  <div className="agenda-time">
                    {format(item.type === 'meeting' ? item.startTime : (item.dueDate as Date), 'HH:mm')}
                  </div>
                </li>
              ))}
            </ul>
          )}
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
