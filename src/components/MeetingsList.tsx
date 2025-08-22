import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/firebaseService';
import { Meeting } from '../types';
import { format, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const firebaseService = FirebaseService.getInstance();

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = firebaseService.subscribeToUserMeetings(
      currentUser.uid,
      (meetingsData) => {
        setMeetings(meetingsData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const updateMeetingStatus = async (meetingId: string, status: 'pending' | 'completed' | 'cancelled') => {
    try {
      await firebaseService.updateMeeting(meetingId, { status });
    } catch (error) {
      console.error('Error updating meeting status:', error);
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
                {meeting.status === 'pending' && (
                  <div className="action-buttons">
                    <button 
                      onClick={() => updateMeetingStatus(meeting.id, 'completed')}
                      className="btn-success"
                    >
                      ✓ Completar
                    </button>
                    <button 
                      onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}
                      className="btn-danger"
                    >
                      ✗ Cancelar
                    </button>
                  </div>
                )}
                {meeting.status === 'completed' && (
                  <button 
                    onClick={() => updateMeetingStatus(meeting.id, 'pending')}
                    className="btn-secondary"
                  >
                    ↻ Reabrir
                  </button>
                )}
                {meeting.status === 'cancelled' && (
                  <button 
                    onClick={() => updateMeetingStatus(meeting.id, 'pending')}
                    className="btn-secondary"
                  >
                    ↻ Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}