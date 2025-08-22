import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export default function FirstAdminSetup() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  const createAdminProfile = async () => {
    if (!currentUser) {
      setError('No hay usuario autenticado');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addDoc(collection(db, 'users'), {
        id: currentUser.uid,
        email: currentUser.email,
        role: 'admin',
        isActive: true,
        createdAt: serverTimestamp()
      });

      setSuccess(`¡Usuario administrador creado exitosamente!
      
Usuario ID: ${currentUser.uid}
Email: ${currentUser.email}
Rol: Administrador

Ahora recarga la página y deberías ver el menú "Administración".`);

    } catch (error: any) {
      console.error('Error creating admin profile:', error);
      setError('Error al crear el perfil de administrador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-setup">
      <div className="setup-card">
        <h2>🔧 Configuración Inicial</h2>
        <p>Configura el primer usuario administrador del sistema:</p>
        
        {currentUser && (
          <div className="user-info-setup">
            <p><strong>Usuario actual:</strong> {currentUser.email}</p>
            <p><strong>ID:</strong> {currentUser.uid}</p>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success" style={{whiteSpace: 'pre-line'}}>{success}</div>}

        <button 
          onClick={createAdminProfile}
          disabled={loading || !currentUser}
          className="btn-primary"
          style={{marginTop: '1rem'}}
        >
          {loading ? 'Creando administrador...' : 'Convertir en Administrador'}
        </button>

        <div className="setup-note" style={{marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '4px'}}>
          <small>
            <strong>Nota:</strong> Esto creará tu perfil de usuario como administrador en la base de datos.
            Solo necesitas hacer esto UNA VEZ para el primer admin.
          </small>
        </div>
      </div>
    </div>
  );
}