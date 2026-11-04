import React from 'react';
import { Link } from 'react-router-dom';
import { useGoogleCalendar } from '../contexts/GoogleCalendarContext';

const REMINDER_OPTIONS = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 10, label: '10 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' }
];

interface GoogleSyncFieldsProps {
  syncEnabled: boolean;
  onSyncChange: (value: boolean) => void;
  reminderMinutes: number;
  onReminderChange: (value: number) => void;
  idPrefix: string;
}

export default function GoogleSyncFields({
  syncEnabled,
  onSyncChange,
  reminderMinutes,
  onReminderChange,
  idPrefix
}: GoogleSyncFieldsProps) {
  const { isConfigured, isConnected } = useGoogleCalendar();

  if (!isConfigured) {
    return null;
  }

  return (
    <div className="sync-section">
      <label className="checkbox-label">
        <input
          id={`${idPrefix}SyncGoogle`}
          type="checkbox"
          checked={syncEnabled && isConnected}
          disabled={!isConnected}
          onChange={(e) => onSyncChange(e.target.checked)}
        />
        📅 Agregar a Google Calendar
      </label>

      {!isConnected && (
        <p className="help-text">
          Conecta tu cuenta de Google Calendar desde <Link to="/profile">Mi Perfil</Link> para poder sincronizar.
        </p>
      )}

      {isConnected && syncEnabled && (
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label htmlFor={`${idPrefix}Reminder`}>Recordatorio:</label>
          <select
            id={`${idPrefix}Reminder`}
            value={reminderMinutes}
            onChange={(e) => onReminderChange(parseInt(e.target.value, 10))}
          >
            {REMINDER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
