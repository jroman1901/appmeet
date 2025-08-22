import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, or, getDocs, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Meeting, User } from '../types';
import { format, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue' | 'cancelled' | 'mine' | 'shared'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  
  // Estados del formulario de edición
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
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const meetingsQuery = query(
      collection(db, 'meetings'),
      or(
        where('createdBy', '==', currentUser.uid),
        where('sharedWith', 'array-contains', currentUser.uid),
        where('isPublic', '==', true)
      )
    );

    const unsubscribe = onSnapshot(meetingsQuery, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Meeting[];

      setMeetings(meetingsData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading meetings:', error);
      setError('Error al cargar las reuniones');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

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

  const updateMeetingStatus = async (meetingId: string, status: 'pending' | 'completed' | 'cancelled') => {
    try {
      setError('');
      setUpdating(meetingId);
      
      await updateDoc(doc(db, 'meetings', meetingId), {
        status,
        updatedAt: new Date()
      });
      
      // Mostrar mensaje de éxito temporal
      setTimeout(() => {
        setUpdating(null);
      }, 1000);
      
    } catch (error) {
      console.error('Error updating meeting status:', error);
      setError('Error al actualizar el estado de la reunión');
      setUpdating(null);
    }
  };

  const startEditingMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setTitle(meeting.title);
    setDescription(meeting.description);
    setClientName(meeting.clientName);
    setClientEmail(meeting.clientEmail || '');
    setClientPhone(meeting.clientPhone || '');
    setStartDate(format(meeting.startTime, 'yyyy-MM-dd'));
    setStartTime(format(meeting.startTime, 'HH:mm'));
    setEndTime(format(meeting.endTime, 'HH:mm'));
    setPriority(meeting.priority);
    setNotes(meeting.notes || '');
    
    // Convertir emails a IDs de usuarios
    const userIds = meeting.sharedWith ? meeting.sharedWith.map(email => {
      const user = users.find(u => u.email === email);
      return user ? user.id : '';
    }).filter(id => id) : [];
    setSelectedUsers(userIds);
    
    setIsPublic(meeting.isPublic || false);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !currentUser) return;

    setSubmitting(true);
    setError('');

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${startDate}T${endTime}`);

      if (endDateTime <= startDateTime) {
        setError('La hora de fin debe ser posterior a la hora de inicio');
        setSubmitting(false);
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
        priority,
        isPublic: isPublic,
        updatedAt: new Date()
      };

      // Manejar campos opcionales: agregar si tienen valor, eliminar si están vacíos
      if (clientEmail && clientEmail.trim()) {
        meetingData.clientEmail = clientEmail.trim();
      } else if (editingMeeting?.clientEmail) {
        // Si había email antes pero ahora está vacío, eliminarlo
        meetingData.clientEmail = deleteField();
      }

      if (clientPhone && clientPhone.trim()) {
        meetingData.clientPhone = clientPhone.trim();
      } else if (editingMeeting?.clientPhone) {
        // Si había teléfono antes pero ahora está vacío, eliminarlo
        meetingData.clientPhone = deleteField();
      }

      if (notes && notes.trim()) {
        meetingData.notes = notes.trim();
      } else if (editingMeeting?.notes) {
        // Si había notas antes pero ahora está vacío, eliminarlas
        meetingData.notes = deleteField();
      }

      if (sharedWithEmails.length > 0) {
        meetingData.sharedWith = sharedWithEmails;
      } else if (editingMeeting?.sharedWith) {
        // Si había usuarios compartidos antes pero ahora no hay, eliminar el campo
        meetingData.sharedWith = deleteField();
      }

      await updateDoc(doc(db, 'meetings', editingMeeting.id), meetingData);
      
      cancelEditing();
      
    } catch (error: any) {
      console.error('Error updating meeting:', error);
      setError('Error al actualizar la reunión: ' + error.message);
    }

    setSubmitting(false);
  };

  const cancelEditing = () => {
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
    setEditingMeeting(null);
    setShowEditModal(false);
    setError('');
  };

  const shareMeeting = async (meetingId: string, shareWithEmail: string) => {
    try {
      setError('');
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) return;
      
      const currentShared = meeting.sharedWith || [];
      if (currentShared.includes(shareWithEmail)) {
        setError('Esta reunión ya está compartida con este usuario');
        return;
      }
      
      await updateDoc(doc(db, 'meetings', meetingId), {
        sharedWith: [...currentShared, shareWithEmail],
        updatedAt: new Date()
      });
      
      setShowShareModal(null);
    } catch (error) {
      console.error('Error sharing meeting:', error);
      setError('Error al compartir la reunión');
    }
  };

  const unshareMeeting = async (meetingId: string, unshareWithEmail: string) => {
    try {
      setError('');
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) return;
      
      const currentShared = meeting.sharedWith || [];
      const newShared = currentShared.filter(email => email !== unshareWithEmail);
      
      await updateDoc(doc(db, 'meetings', meetingId), {
        sharedWith: newShared.length > 0 ? newShared : undefined,
        updatedAt: new Date()
      });
      
    } catch (error) {
      console.error('Error unsharing meeting:', error);
      setError('Error al dejar de compartir la reunión');
    }
  };

  const toggleMeetingPublic = async (meetingId: string) => {
    try {
      setError('');
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) return;
      
      await updateDoc(doc(db, 'meetings', meetingId), {
        isPublic: !meeting.isPublic,
        updatedAt: new Date()
      });
      
    } catch (error) {
      console.error('Error toggling meeting public status:', error);
      setError('Error al cambiar la visibilidad de la reunión');
    }
  };

  const getFilteredMeetings = () => {
    const now = new Date();
    
    switch (filter) {
      case 'pending':
        return meetings.filter(meeting => 
          meeting.status === 'pending' && isAfter(meeting.startTime, now)
        );
      case 'completed':
        return meetings.filter(meeting => meeting.status === 'completed');
      case 'overdue':
        return meetings.filter(meeting => 
          meeting.status === 'pending' && isBefore(meeting.startTime, now)
        );
      case 'cancelled':
        return meetings.filter(meeting => meeting.status === 'cancelled');
      case 'mine':
        return meetings.filter(meeting => meeting.createdBy === currentUser?.uid);
      case 'shared':
        return meetings.filter(meeting => meeting.createdBy !== currentUser?.uid);
      default:
        return meetings;
    }
  };

  const getMeetingStatusClass = (meeting: Meeting) => {
    const now = new Date();
    if (meeting.status === 'completed') return 'completed';
    if (meeting.status === 'cancelled') return 'cancelled';
    if (meeting.status === 'pending' && isBefore(meeting.startTime, now)) return 'overdue';
    return 'pending';
  };

  const getStatusText = (meeting: Meeting) => {
    const now = new Date();
    if (meeting.status === 'completed') return 'Completada';
    if (meeting.status === 'cancelled') return 'Cancelada';
    if (meeting.status === 'pending' && isBefore(meeting.startTime, now)) return 'Atrasada';
    return 'Pendiente';
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  if (loading) {
    return <div className="loading">Cargando tus reuniones...</div>;
  }

  return (
    <div className="meetings-list-container">
      <h2>Mis Reuniones</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div className="filter-buttons">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Todas ({meetings.length})
        </button>
        <button 
          className={filter === 'mine' ? 'active' : ''}
          onClick={() => setFilter('mine')}
        >
          Mías ({meetings.filter(m => m.createdBy === currentUser?.uid).length})
        </button>
        <button 
          className={filter === 'shared' ? 'active' : ''}
          onClick={() => setFilter('shared')}
        >
          Compartidas ({meetings.filter(m => m.createdBy !== currentUser?.uid).length})
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pendientes
        </button>
        <button 
          className={filter === 'overdue' ? 'active' : ''}
          onClick={() => setFilter('overdue')}
        >
          Atrasadas
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completadas
        </button>
        <button 
          className={filter === 'cancelled' ? 'active' : ''}
          onClick={() => setFilter('cancelled')}
        >
          Canceladas
        </button>
      </div>

      {getFilteredMeetings().length === 0 ? (
        <p>No hay reuniones que coincidan con el filtro seleccionado.</p>
      ) : (
        <div className="meetings-grid">
          {getFilteredMeetings().map(meeting => (
            <div key={meeting.id} className={`meeting-card ${getMeetingStatusClass(meeting)}`}>
              <div className="meeting-header">
                <h3>{meeting.title}</h3>
                <div className="meeting-badges">
                  <span className={`status-badge ${getMeetingStatusClass(meeting)}`}>
                    {getStatusText(meeting)}
                  </span>
                  <span className={`priority-badge ${getPriorityClass(meeting.priority)}`}>
                    {meeting.priority === 'high' ? 'Alta' : 
                     meeting.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
              </div>
              
              <div className="meeting-details">
                <p><strong>Cliente:</strong> {meeting.clientName}</p>
                {meeting.clientEmail && <p><strong>Email:</strong> {meeting.clientEmail}</p>}
                {meeting.clientPhone && (
                  <p><strong>Teléfono:</strong> {meeting.clientPhone}</p>
                )}
                <p><strong>Fecha y hora:</strong></p>
                <p>
                  {format(meeting.startTime, 'dd/MM/yyyy HH:mm', { locale: es })} - 
                  {format(meeting.endTime, 'HH:mm', { locale: es })}
                </p>
                {meeting.description && (
                  <div>
                    <p><strong>Descripción:</strong></p>
                    <p>{meeting.description}</p>
                  </div>
                )}
                {meeting.notes && (
                  <div>
                    <p><strong>Notas:</strong></p>
                    <p>{meeting.notes}</p>
                  </div>
                )}
                
                {meeting.createdBy !== currentUser?.uid && (
                  <p className="shared-indicator">👥 <strong>Reunión compartida</strong></p>
                )}
                {meeting.isPublic && (
                  <p className="public-indicator">🌐 <strong>Reunión pública</strong></p>
                )}
                {meeting.sharedWith && meeting.sharedWith.length > 0 && (
                  <p className="shared-with">
                    👥 <strong>Compartida con:</strong> {meeting.sharedWith.join(', ')}
                  </p>
                )}
              </div>

              <div className="meeting-actions">
                {updating === meeting.id && (
                  <div className="updating-message">
                    ✓ Actualizando...
                  </div>
                )}
                {updating !== meeting.id && (
                  <div className="action-buttons">
                    {meeting.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => updateMeetingStatus(meeting.id, 'completed')}
                          className="btn-success"
                          title="Marcar como completada"
                        >
                          ✅ Completar
                        </button>
                        <button 
                          onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}
                          className="btn-danger"
                          title="Cancelar reunión"
                        >
                          ❌ Cancelar
                        </button>
                      </>
                    )}
                    {meeting.status === 'completed' && (
                      <button 
                        onClick={() => updateMeetingStatus(meeting.id, 'pending')}
                        className="btn-secondary"
                        title="Reabrir reunión"
                      >
                        🔄 Reabrir
                      </button>
                    )}
                    {meeting.status === 'cancelled' && (
                      <button 
                        onClick={() => updateMeetingStatus(meeting.id, 'pending')}
                        className="btn-secondary"
                        title="Reactivar reunión"
                      >
                        🔄 Reactivar
                      </button>
                    )}
                    
                    <button 
                      onClick={() => startEditingMeeting(meeting)}
                      className="btn-secondary"
                      title="Editar reunión"
                    >
                      ✏️ Editar
                    </button>

                    {meeting.createdBy === currentUser?.uid && (
                      <>
                        <button 
                          onClick={() => setShowShareModal(meeting.id)}
                          className="btn-info"
                          title="Gestionar compartir"
                        >
                          👥 Compartir
                        </button>
                        
                        <button 
                          onClick={() => toggleMeetingPublic(meeting.id)}
                          className={meeting.isPublic ? "btn-warning" : "btn-info"}
                          title={meeting.isPublic ? "Hacer privada" : "Hacer pública"}
                        >
                          {meeting.isPublic ? "🔒 Hacer Privada" : "🌐 Hacer Pública"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditModal && editingMeeting && (
        <div className="modal-overlay" onClick={cancelEditing}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Reunión</h2>
              <button onClick={cancelEditing} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              {error && <div className="error">{error}</div>}
              
              <form onSubmit={handleEditSubmit} className="scheduler-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="editTitle">Título de la reunión:</label>
                    <input
                      id="editTitle"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="editDescription">Descripción:</label>
                  <textarea
                    id="editDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="editClientName">Nombre del cliente:</label>
                    <input
                      id="editClientName"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editClientEmail">Email del cliente (opcional):</label>
                    <input
                      id="editClientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editClientPhone">Teléfono del cliente (opcional):</label>
                    <input
                      id="editClientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="editPriority">Prioridad:</label>
                    <select
                      id="editPriority"
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
                    <label htmlFor="editStartDate">Fecha:</label>
                    <input
                      id="editStartDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editStartTime">Hora de inicio:</label>
                    <input
                      id="editStartTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editEndTime">Hora de fin:</label>
                    <input
                      id="editEndTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="editNotes">Notas adicionales (opcional):</label>
                  <textarea
                    id="editNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Notas o comentarios sobre la reunión..."
                  />
                </div>

                {editingMeeting.createdBy === currentUser?.uid && (
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
                )}
                
                <div className="modal-actions">
                  <button type="button" onClick={cancelEditing} className="btn-secondary">
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? 'Actualizando...' : 'Actualizar Reunión'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareMeetingModal 
          meetingId={showShareModal}
          meeting={meetings.find(m => m.id === showShareModal)!}
          users={users}
          onClose={() => setShowShareModal(null)}
          onShare={shareMeeting}
          onUnshare={unshareMeeting}
        />
      )}
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

// Componente modal para gestionar el compartir de reuniones
function ShareMeetingModal({ 
  meetingId, 
  meeting, 
  users,
  onClose, 
  onShare, 
  onUnshare 
}: { 
  meetingId: string;
  meeting: Meeting;
  users: User[];
  onClose: () => void;
  onShare: (meetingId: string, shareWithEmail: string) => void;
  onUnshare: (meetingId: string, unshareWithEmail: string) => void;
}) {
  const [selectedNewUsers, setSelectedNewUsers] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNewUsers.length === 0) {
      setError('Por favor selecciona al menos un usuario');
      return;
    }

    // Compartir con todos los usuarios seleccionados
    selectedNewUsers.forEach(userId => {
      const user = users.find(u => u.id === userId);
      if (user) {
        onShare(meetingId, user.email);
      }
    });
    
    setSelectedNewUsers([]);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gestionar Compartir Reunión</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          <h3>"{meeting.title}"</h3>
          
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={handleShare} className="share-form">
            <UserSelector
              users={users.filter(user => !(meeting.sharedWith || []).includes(user.email))}
              selectedUsers={selectedNewUsers}
              onSelectionChange={setSelectedNewUsers}
              label="Agregar usuarios:"
              helperText="Selecciona los usuarios con los que quieres compartir esta reunión"
            />
            <button type="submit" className="btn-primary" disabled={selectedNewUsers.length === 0}>
              👥 Compartir con seleccionados
            </button>
          </form>

          {meeting.sharedWith && meeting.sharedWith.length > 0 && (
            <div className="shared-users-list">
              <h4>Compartida con:</h4>
              {meeting.sharedWith.map(email => (
                <div key={email} className="shared-user-item">
                  <span>{email}</span>
                  <button 
                    onClick={() => onUnshare(meetingId, email)}
                    className="btn-danger btn-sm"
                    title="Dejar de compartir"
                  >
                    ✕ Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {(!meeting.sharedWith || meeting.sharedWith.length === 0) && (
            <div className="no-shared-users">
              Esta reunión no está compartida con ningún usuario.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}