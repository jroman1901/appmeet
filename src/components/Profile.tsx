import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleCalendar } from '../contexts/GoogleCalendarContext';
import { UserService } from '../services/userService';
import { User } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const REMINDER_OPTIONS = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 10, label: '10 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' }
];

export default function Profile() {
  const { currentUser } = useAuth();
  const {
    isConfigured,
    isConnected,
    connecting,
    error: googleError,
    connect,
    disconnect,
    defaultReminderMinutes,
    setDefaultReminderMinutes
  } = useGoogleCalendar();

  const [profile, setProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [canBootstrapAdmin, setCanBootstrapAdmin] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');
  const [bootstrapSuccess, setBootstrapSuccess] = useState('');

  const userService = UserService.getInstance();

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;

      setLoadingProfile(true);
      try {
        const userProfile = await userService.getUserProfile(currentUser.uid);
        setProfile(userProfile);

        if (!userProfile) {
          const anyUserExists = await userService.hasAnyUser();
          setCanBootstrapAdmin(!anyUserExists);
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    load();
  }, [currentUser, userService]);

  const handleBootstrapAdmin = async () => {
    if (!currentUser || !currentUser.email) return;

    setBootstrapping(true);
    setBootstrapError('');
    setBootstrapSuccess('');

    try {
      const anyUserExists = await userService.hasAnyUser();
      if (anyUserExists) {
        setBootstrapError('Ya existe un administrador configurado en el sistema. Pide a un administrador que te dé acceso.');
        setCanBootstrapAdmin(false);
        return;
      }

      await userService.createUserProfile(currentUser.uid, currentUser.email, 'admin');
      const userProfile = await userService.getUserProfile(currentUser.uid);
      setProfile(userProfile);
      setCanBootstrapAdmin(false);
      setBootstrapSuccess('¡Listo! Tu cuenta ahora es administradora. Recarga la página para ver el menú de Administración.');
    } catch (error: any) {
      setBootstrapError(error.message || 'Error al configurar la cuenta de administrador');
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="profile-container">
      <h2>Mi Perfil</h2>

      <div className="profile-card">
        <h3>Datos de la cuenta</h3>
        {loadingProfile ? (
          <p>Cargando perfil...</p>
        ) : (
          <div className="profile-info">
            <p><strong>Email:</strong> {currentUser?.email}</p>
            {profile && (
              <>
                <p>
                  <strong>Rol:</strong>{' '}
                  <span className={`role-badge ${profile.role}`}>
                    {profile.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </p>
                <p>
                  <strong>Estado:</strong>{' '}
                  <span className={`status-badge ${profile.isActive ? 'active' : 'inactive'}`}>
                    {profile.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </p>
                <p className="user-meta">
                  Miembro desde: {format(profile.createdAt, 'dd/MM/yyyy', { locale: es })}
                </p>
              </>
            )}
            {!profile && !canBootstrapAdmin && (
              <p className="help-text">
                Tu cuenta todavía no tiene un perfil asignado. Pide a un administrador que te dé acceso.
              </p>
            )}
          </div>
        )}

        {!loadingProfile && !profile && canBootstrapAdmin && (
          <div className="setup-note" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <p><strong>Configuración inicial:</strong> todavía no hay ningún administrador en el sistema.</p>
            {bootstrapError && <div className="error">{bootstrapError}</div>}
            {bootstrapSuccess && <div className="success">{bootstrapSuccess}</div>}
            <button
              onClick={handleBootstrapAdmin}
              disabled={bootstrapping}
              className="btn-primary"
              style={{ marginTop: '0.5rem' }}
            >
              {bootstrapping ? 'Configurando...' : 'Convertirme en administrador'}
            </button>
            <p style={{ marginTop: '0.5rem' }}>
              <small>Esta opción solo está disponible mientras el sistema no tenga ningún usuario configurado.</small>
            </p>
          </div>
        )}
      </div>

      <div className="profile-card">
        <h3>📅 Google Calendar</h3>

        {!isConfigured ? (
          <p className="help-text">
            La integración con Google Calendar no está configurada en esta instalación. Define{' '}
            <code>REACT_APP_GOOGLE_CLIENT_ID</code> en las variables de entorno para habilitarla.
          </p>
        ) : (
          <>
            <p>
              Estado:{' '}
              {isConnected ? (
                <span className="status-badge active">✅ Conectado</span>
              ) : (
                <span className="status-badge inactive">⚪ No conectado</span>
              )}
            </p>

            {googleError && <div className="error">{googleError}</div>}

            <div className="action-buttons" style={{ marginTop: '0.5rem' }}>
              {isConnected ? (
                <button onClick={disconnect} className="btn-danger">
                  Desconectar Google Calendar
                </button>
              ) : (
                <button onClick={connect} disabled={connecting} className="btn-primary">
                  {connecting ? 'Conectando...' : 'Conectar con Google Calendar'}
                </button>
              )}
            </div>

            <p className="help-text" style={{ marginTop: '0.75rem' }}>
              Al conectar, podrás marcar reuniones y tareas para que se agreguen automáticamente a tu
              Google Calendar con recordatorio.
            </p>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="defaultReminder">Recordatorio por defecto para nuevas reuniones/tareas:</label>
              <select
                id="defaultReminder"
                value={defaultReminderMinutes}
                onChange={(e) => setDefaultReminderMinutes(parseInt(e.target.value, 10))}
              >
                {REMINDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <small className="help-text">
                Puedes cambiar el recordatorio de cada reunión o tarea individualmente al crearla o editarla.
              </small>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
