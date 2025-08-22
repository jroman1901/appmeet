import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/firebaseService';
import { Meeting, User } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function MeetingScheduler() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { currentUser } = useAuth();
  const firebaseService = FirebaseService.getInstance();

  // Cargar usuarios disponibles
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as User[];
        
        // Filtrar el usuario actual
        setUsers(usersData.filter(user => user.id !== currentUser?.uid));
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    
    if (currentUser) {
      loadUsers();
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${startDate}T${endTime}`);

      if (endDateTime <= startDateTime) {
        setError('La hora de fin debe ser posterior a la hora de inicio');
        setLoading(false);
        return;
      }

      // Convertir IDs de usuarios a emails
      const sharedWithEmails = selectedUsers.map(userId => {
        const user = users.find(u => u.id === userId);
        return user ? user.email : '';
      }).filter(email => email);

      const meetingData: any = {
        title,
        description,
        clientName,
        startTime: startDateTime,
        endTime: endDateTime,
        status: 'pending',
        priority,
        createdBy: currentUser?.uid || '',
        isPublic: isPublic
      };

      // Solo agregar campos opcionales si tienen valor
      if (clientEmail) {
        meetingData.clientEmail = clientEmail;
      }
      if (clientPhone) {
        meetingData.clientPhone = clientPhone;
      }
      if (notes) {
        meetingData.notes = notes;
      }
      if (sharedWithEmails.length > 0) {
        meetingData.sharedWith = sharedWithEmails;
      }

      await firebaseService.createMeeting(meetingData);

      setSuccess('Reunión programada exitosamente');
      
      // Reset form
      setTitle('');
      setDescription('');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setStartDate('');
      setStartTime('');
      setEndTime('');
      setPriority('medium');
      setNotes('');
      setSelectedUsers([]);
      setIsPublic(false);
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      setError(error.message || 'Error al programar la reunión');
    }

    setLoading(false);
  };

  return (
    <div className="scheduler-container">
      <h2>Programar Nueva Reunión</h2>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit} className="scheduler-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Título de la reunión:</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Descripción:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="clientName">Nombre del cliente:</label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="clientEmail">Email del cliente (opcional):</label>
            <input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="clientPhone">Teléfono del cliente (opcional):</label>
            <input
              id="clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Prioridad:</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              required
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Fecha:</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="startTime">Hora de inicio:</label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="endTime">Hora de fin:</label>
            <input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notas adicionales (opcional):</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notas o comentarios sobre la reunión..."
          />
        </div>

        <div className="sharing-section">
          <h4>Opciones de Compartir</h4>
          
          <UserSelector
            users={users}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            label="Compartir con usuarios:"
            helperText="Opcional: Los usuarios seleccionados podrán ver y editar esta reunión"
          />

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Hacer pública (todos los usuarios pueden verla)
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Programando...' : 'Programar Reunión'}
        </button>
      </form>
    </div>
  );
}

// Componente selector de usuarios reutilizable
function UserSelector({ 
  users, 
  selectedUsers, 
  onSelectionChange, 
  label,
  helperText 
}: { 
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (users: string[]) => void;
  label: string;
  helperText?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUsers, userId]);
    }
  };

  const getSelectedUserNames = () => {
    return selectedUsers.map(userId => {
      const user = users.find(u => u.id === userId);
      return user ? user.email : '';
    }).filter(email => email);
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="user-selector">
        <div 
          className="selector-display" 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {selectedUsers.length > 0 
            ? `${selectedUsers.length} usuario${selectedUsers.length > 1 ? 's' : ''} seleccionado${selectedUsers.length > 1 ? 's' : ''}`
            : 'Seleccionar usuarios...'
          }
          <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
        </div>
        
        {showDropdown && (
          <div className="selector-dropdown">
            {users.length > 0 ? users.map(user => (
              <div key={user.id} className="selector-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                  />
                  {user.email}
                </label>
              </div>
            )) : (
              <div className="no-users">No hay usuarios disponibles</div>
            )}
          </div>
        )}
        
        {selectedUsers.length > 0 && (
          <div className="selected-users">
            <strong>Seleccionados:</strong> {getSelectedUserNames().join(', ')}
          </div>
        )}
      </div>
      {helperText && <small className="help-text">{helperText}</small>}
    </div>
  );
}