import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';

export default function Navigation() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const userService = UserService.getInstance();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const adminStatus = await userService.isAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      }
    };

    checkAdminStatus();
  }, [currentUser]);

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h3>APIORIENTE</h3>
        <span className="nav-subtitle">Sistema de Reuniones y Tareas</span>
      </div>
      <ul className="nav-links">
        <li>
          <Link to="/dashboard" className={isActive('/dashboard')}>
            Panel de Control
          </Link>
        </li>
        <li>
          <Link to="/schedule" className={isActive('/schedule')}>
            Programar Reunión
          </Link>
        </li>
        <li>
          <Link to="/meetings" className={isActive('/meetings')}>
            Mis Reuniones
          </Link>
        </li>
        <li>
          <Link to="/tasks" className={isActive('/tasks')}>
            Mis Tareas
          </Link>
        </li>
        <li>
          <Link to="/calendar" className={isActive('/calendar')}>
            Calendario
          </Link>
        </li>
        {isAdmin && (
          <li>
            <Link to="/admin" className={isActive('/admin')}>
              Administración
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}