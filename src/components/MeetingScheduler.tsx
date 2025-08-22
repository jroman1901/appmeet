import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/firebaseService';
import { Meeting } from '../types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { currentUser } = useAuth();
  const firebaseService = FirebaseService.getInstance();

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

      const meetingData: Partial<Meeting> = {
        title,
        description,
        clientName,
        clientEmail,
        clientPhone,
        startTime: startDateTime,
        endTime: endDateTime,
        status: 'pending',
        priority,
        notes,
        createdBy: currentUser?.uid || ''
      };

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
            <label htmlFor="clientEmail">Email del cliente:</label>
            <input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
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