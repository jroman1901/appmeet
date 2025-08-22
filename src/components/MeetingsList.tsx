import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Meeting } from '../types';
import { format, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const meetingsQuery = query(
      collection(db, 'meetings'),
      where('createdBy', '==', currentUser.uid)
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
                <p><strong>Email:</strong> {meeting.clientEmail}</p>
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
              </div>

              <div className="meeting-actions">
                {updating === meeting.id && (
                  <div className="updating-message">
                    ✓ Actualizando...
                  </div>
                )}
                {updating !== meeting.id && (
                  <>
                    {meeting.status === 'pending' && (
                      <div className="action-buttons">
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
                      </div>
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}