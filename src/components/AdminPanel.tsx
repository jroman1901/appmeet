import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { User } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { currentUser } = useAuth();
  const userService = UserService.getInstance();

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      if (!currentUser) return;

      try {
        const adminStatus = await userService.isAdmin(currentUser.uid);
        setIsAdmin(adminStatus);

        if (adminStatus) {
          const allUsers = await userService.getAllUsers();
          setUsers(allUsers);
        }
      } catch (error) {
        console.error('Error loading admin panel:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await userService.createUser(email, password, role, currentUser?.uid || '');
      
      // Recargar lista de usuarios
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
      
      setSuccess(`Usuario ${role === 'admin' ? 'administrador' : 'usuario'} creado exitosamente`);
      setEmail('');
      setPassword('');
      setRole('user');
      setShowCreateForm(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await userService.toggleUserStatus(userId, !currentStatus);
      
      // Actualizar lista local
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ));
      
      setSuccess(`Usuario ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await userService.updateUserRole(userId, newRole);
      
      // Actualizar lista local
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setSuccess(`Rol de usuario actualizado a ${newRole === 'admin' ? 'administrador' : 'usuario'}`);
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return <div className="loading">Verificando permisos de administrador...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          {showCreateForm ? 'Cancelar' : '+ Crear Usuario'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showCreateForm && (
        <div className="create-user-form">
          <h2>Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreateUser}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="userEmail">Email:</label>
                <input
                  id="userEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="userPassword">Contraseña:</label>
                <input
                  id="userPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="userRole">Rol:</label>
              <select
                id="userRole"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                required
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creando...' : 'Crear Usuario'}
            </button>
          </form>
        </div>
      )}

      <div className="users-list">
        <h2>Usuarios del Sistema ({users.length})</h2>
        
        {users.length === 0 ? (
          <p>No hay usuarios registrados.</p>
        ) : (
          <div className="users-table">
            {users.map(user => (
              <div key={user.id} className={`user-card ${!user.isActive ? 'inactive' : ''}`}>
                <div className="user-info">
                  <h3>{user.email}</h3>
                  <p>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </p>
                  <p className="user-meta">
                    Creado: {format(user.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                
                <div className="user-actions">
                  {user.id !== currentUser?.uid && (
                    <>
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        className={user.isActive ? 'btn-danger' : 'btn-success'}
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value as 'admin' | 'user')}
                        className="role-select"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </>
                  )}
                  {user.id === currentUser?.uid && (
                    <span className="current-user">Tú</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}