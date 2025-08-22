import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, addDoc, doc, updateDoc, or } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Meeting, Task, User } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  endOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

type CalendarView = 'month' | 'week' | 'day';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState<(Meeting & { type: 'meeting' }) | (Task & { type: 'task' }) | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, [currentUser, currentDate, view]);

  const loadData = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      switch (view) {
        case 'month':
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
          break;
        case 'week':
          startDate = startOfWeek(currentDate, { locale: es });
          endDate = endOfWeek(currentDate, { locale: es });
          break;
        case 'day':
          startDate = startOfDay(currentDate);
          endDate = endOfDay(currentDate);
          break;
      }

      // Cargar reuniones
      const meetingsQuery = query(
        collection(db, 'meetings'),
        where('createdBy', '==', currentUser.uid),
        where('startTime', '>=', startDate),
        where('startTime', '<=', endDate),
        orderBy('startTime', 'asc')
      );

      const meetingsSnapshot = await getDocs(meetingsQuery);
      const meetingsData = meetingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Meeting[];

      // Cargar tareas con fechas de vencimiento (propias, compartidas y públicas)
      const tasksQuery = query(
        collection(db, 'tasks'),
        or(
          where('createdBy', '==', currentUser.uid),
          where('sharedWith', 'array-contains', currentUser.uid),
          where('isPublic', '==', true)
        )
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Task[];

      // Filtrar tareas que tienen fecha de vencimiento en el rango
      const filteredTasks = tasksData.filter(task => 
        task.dueDate && task.dueDate >= startDate && task.dueDate <= endDate
      );

      setMeetings(meetingsData);
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemsForDay = (date: Date) => {
    const dayMeetings = meetings.filter(meeting => 
      isSameDay(meeting.startTime, date)
    ).map(meeting => ({ ...meeting, type: 'meeting' as const }));
    
    const dayTasks = tasks.filter(task => 
      task.dueDate && isSameDay(task.dueDate, date)
    ).map(task => ({ ...task, type: 'task' as const }));
    
    return [...dayMeetings, ...dayTasks].sort((a, b) => {
      const timeA = a.type === 'meeting' ? a.startTime : a.dueDate!;
      const timeB = b.type === 'meeting' ? b.startTime : b.dueDate!;
      return timeA.getTime() - timeB.getTime();
    });
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateModal(true);
  };

  const handleItemRightClick = (e: React.MouseEvent, item: (Meeting & { type: 'meeting' }) | (Task & { type: 'task' })) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedItem(item);
    setShowContextMenu(true);
  };

  const handleItemClick = (e: React.MouseEvent, item: (Meeting & { type: 'meeting' }) | (Task & { type: 'task' })) => {
    e.stopPropagation();
    // Para móviles, usar click normal como menú contextual
    if (window.innerWidth <= 768) {
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setSelectedItem(item);
      setShowContextMenu(true);
    }
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
    setSelectedItem(null);
  };

  const updateItemStatus = async (newStatus: 'pending' | 'completed' | 'cancelled') => {
    if (!selectedItem) return;

    try {
      if (selectedItem.type === 'meeting') {
        await updateDoc(doc(db, 'meetings', selectedItem.id), {
          status: newStatus,
          updatedAt: new Date()
        });
        
        // Actualizar estado local
        setMeetings(meetings.map(meeting => 
          meeting.id === selectedItem.id ? { ...meeting, status: newStatus } : meeting
        ));
      } else {
        await updateDoc(doc(db, 'tasks', selectedItem.id), {
          status: newStatus as 'pending' | 'completed',
          updatedAt: new Date()
        });
        
        // Actualizar estado local
        setTasks(tasks.map(task => 
          task.id === selectedItem.id ? { ...task, status: newStatus as 'pending' | 'completed' } : task
        ));
      }
      
      closeContextMenu();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (view) {
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: es });
    const calendarEnd = endOfWeek(monthEnd, { locale: es });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
      <div className="calendar-month">
        <div className="calendar-header">
          {weekDays.map(day => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            const dayItems = getItemsForDay(day);
            
            return (
              <div 
                key={day.toISOString()} 
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <div className="day-number">
                  {format(day, 'd')}
                  <button className="add-event-btn" title="Agregar reunión">+</button>
                </div>
                <div className="day-items">
                  {dayItems.slice(0, 3).map(item => (
                    <div 
                      key={`${item.type}-${item.id}`} 
                      className={`calendar-item ${item.type} priority-${item.priority} status-${item.status}`}
                      title={item.type === 'meeting' 
                        ? `${item.title} - ${format(item.startTime, 'HH:mm')} (${item.status === 'pending' ? 'Pendiente' : item.status === 'completed' ? 'Completada' : 'Cancelada'})${item.createdBy !== currentUser?.uid ? ' - Compartida' : ''}`
                        : `${item.title} - Vence: ${item.dueDate ? format(item.dueDate, 'HH:mm') : 'Sin hora'} (${item.status === 'pending' ? 'Pendiente' : 'Completada'})${item.createdBy !== currentUser?.uid ? ' - Compartida' : ''}`
                      }
                      onClick={(e) => handleItemClick(e, item)}
                      onContextMenu={(e) => handleItemRightClick(e, item)}
                    >
                      <span className="item-time">
                        {item.type === 'meeting' 
                          ? format(item.startTime, 'HH:mm')
                          : item.dueDate ? format(item.dueDate, 'HH:mm') : 'Todo el día'
                        }
                      </span>
                      <span className="item-title">
                        {item.type === 'task' ? '📋 ' : '📅 '}{item.title}
                        {item.createdBy !== currentUser?.uid && ' 👥'}
                      </span>
                      <span className="item-status">
                        {item.status === 'completed' ? '✅' : item.status === 'cancelled' ? '❌' : '⏳'}
                      </span>
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="more-items">
                      +{dayItems.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: es });
    const weekEnd = endOfWeek(currentDate, { locale: es });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="calendar-week">
        <div className="week-header">
          {days.map(day => (
            <div key={day.toISOString()} className={`week-day-header ${isToday(day) ? 'today' : ''}`}>
              <div className="day-name">
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className="day-number">
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="week-content">
          {days.map(day => {
            const dayItems = getItemsForDay(day);
            
            return (
              <div key={day.toISOString()} className="week-day" onClick={() => handleDayClick(day)}>
                <button className="add-event-btn-week" title="Agregar reunión">+</button>
                {dayItems.map(item => (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    className={`week-item ${item.type} priority-${item.priority} status-${item.status}`}
                    onClick={(e) => handleItemClick(e, item)}
                    onContextMenu={(e) => handleItemRightClick(e, item)}
                  >
                    <div className="item-time">
                      {item.type === 'meeting' 
                        ? `${format(item.startTime, 'HH:mm')} - ${format(item.endTime, 'HH:mm')}`
                        : item.dueDate ? format(item.dueDate, 'HH:mm') : 'Todo el día'
                      }
                      <span className="item-status-icon">
                        {item.status === 'completed' ? '✅' : item.status === 'cancelled' ? '❌' : '⏳'}
                      </span>
                    </div>
                    <div className="item-title">
                      {item.type === 'task' ? '📋 ' : '📅 '}{item.title}
                      {item.createdBy !== currentUser?.uid && ' 👥'}
                    </div>
                    {item.type === 'meeting' && (
                      <div className="item-client">{item.clientName}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayItems = getItemsForDay(currentDate);

    return (
      <div className="calendar-day-view">
        <div className="day-header">
          <h3>{format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}</h3>
          <button 
            onClick={() => handleDayClick(currentDate)}
            className="btn-primary"
          >
            + Agregar Reunión
          </button>
        </div>
        <div className="day-items-list">
          {dayItems.length === 0 ? (
            <div className="no-items">
              No hay actividades programadas para este día
            </div>
          ) : (
            dayItems.map(item => (
              <div key={`${item.type}-${item.id}`} className={`day-item-card ${item.type} priority-${item.priority} status-${item.status}`}>
                <div className="item-time-block">
                  <div className="item-type-icon">
                    {item.type === 'task' ? '📋' : '📅'}
                  </div>
                  <div className="start-time">
                    {item.type === 'meeting' 
                      ? format(item.startTime, 'HH:mm')
                      : item.dueDate ? format(item.dueDate, 'HH:mm') : '--:--'
                    }
                  </div>
                  {item.type === 'meeting' && (
                    <div className="end-time">
                      {format(item.endTime, 'HH:mm')}
                    </div>
                  )}
                </div>
                <div className="item-details">
                  <h4>
                    {item.title}
                    {item.createdBy !== currentUser?.uid && ' 👥'}
                  </h4>
                  {item.type === 'meeting' ? (
                    <>
                      <p><strong>Cliente:</strong> {item.clientName}</p>
                      {item.clientEmail && <p><strong>Email:</strong> {item.clientEmail}</p>}
                      {item.clientPhone && (
                        <p><strong>Teléfono:</strong> {item.clientPhone}</p>
                      )}
                      {item.description && (
                        <p><strong>Descripción:</strong> {item.description}</p>
                      )}
                      <div className={`status-badge status-${item.status}`}>
                        {item.status === 'pending' ? 'Pendiente' : 
                         item.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </div>
                    </>
                  ) : (
                    <>
                      <p><strong>Descripción:</strong> {item.description}</p>
                      {item.category && (
                        <p><strong>Categoría:</strong> {item.category}</p>
                      )}
                      <div className={`status-badge status-${item.status}`}>
                        {item.status === 'pending' ? 'Pendiente' : 'Completada'}
                      </div>
                    </>
                  )}
                </div>
                <div className="item-actions">
                  {item.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => {
                          setSelectedItem(item);
                          updateItemStatus('completed');
                        }}
                        className="btn-success"
                        title="Marcar como completada"
                      >
                        ✅ Completar
                      </button>
                      {item.type === 'meeting' && (
                        <button 
                          onClick={() => {
                            setSelectedItem(item);
                            updateItemStatus('cancelled');
                          }}
                          className="btn-danger"
                          title="Cancelar reunión"
                        >
                          ❌ Cancelar
                        </button>
                      )}
                    </>
                  )}
                  {item.status !== 'pending' && (
                    <button 
                      onClick={() => {
                        setSelectedItem(item);
                        updateItemStatus('pending');
                      }}
                      className="btn-secondary"
                      title="Reactivar"
                    >
                      🔄 Reactivar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: es });
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: es });
        const weekEnd = endOfWeek(currentDate, { locale: es });
        return `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
      case 'day':
        return format(currentDate, 'EEEE, d MMMM yyyy', { locale: es });
    }
  };

  if (loading) {
    return <div className="loading">Cargando calendario...</div>;
  }

  return (
    <div className="calendar-container">
      <div className="calendar-controls">
        <div className="calendar-navigation">
          <button onClick={() => navigateDate('prev')} className="nav-btn">
            ← Anterior
          </button>
          <h2 className="calendar-title">{getViewTitle()}</h2>
          <button onClick={() => navigateDate('next')} className="nav-btn">
            Siguiente →
          </button>
        </div>
        
        <div className="view-controls">
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="btn-secondary"
          >
            Hoy
          </button>
          <div className="view-buttons">
            {(['month', 'week', 'day'] as CalendarView[]).map(viewType => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className={`view-btn ${view === viewType ? 'active' : ''}`}
              >
                {viewType === 'month' ? 'Mes' : 
                 viewType === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="calendar-content" onClick={closeContextMenu}>
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {showCreateModal && selectedDate && (
        <QuickMeetingModal 
          selectedDate={selectedDate}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDate(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedDate(null);
            loadData(); // Recargar datos después de crear la reunión
          }}
        />
      )}

      {showContextMenu && selectedItem && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            zIndex: 1001
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <strong>{selectedItem.title}</strong>
            <span className="current-status">
              {selectedItem.status === 'pending' ? '⏳ Pendiente' : 
               selectedItem.status === 'completed' ? '✅ Completada' : '❌ Cancelada'}
            </span>
          </div>
          
          {selectedItem.status === 'pending' && (
            <>
              <button 
                onClick={() => updateItemStatus('completed')}
                className="context-menu-item success"
              >
                ✅ Marcar como completada
              </button>
              {selectedItem.type === 'meeting' && (
                <button 
                  onClick={() => updateItemStatus('cancelled')}
                  className="context-menu-item danger"
                >
                  ❌ Cancelar reunión
                </button>
              )}
            </>
          )}
          
          {selectedItem.status !== 'pending' && (
            <button 
              onClick={() => updateItemStatus('pending')}
              className="context-menu-item secondary"
            >
              🔄 Reactivar
            </button>
          )}
          
          <button 
            onClick={closeContextMenu}
            className="context-menu-item cancel"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

// Componente modal para creación rápida de reuniones
function QuickMeetingModal({ 
  selectedDate, 
  onClose, 
  onSuccess 
}: { 
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [startTime, setStartTime] = useState(format(selectedDate, 'HH:mm'));
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

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
    if (!currentUser) return;

    setLoading(true);
    setError('');

    try {
      const [startHour, startMin] = startTime.split(':');
      const [endHour, endMin] = endTime.split(':');
      
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(parseInt(startHour), parseInt(startMin));
      
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(parseInt(endHour), parseInt(endMin));

      if (endDateTime <= startDateTime) {
        setError('La hora de fin debe ser posterior a la hora de inicio');
        return;
      }

      // Convertir IDs de usuarios a emails
      const sharedWithEmails = selectedUsers.map(userId => {
        const user = users.find(u => u.id === userId);
        return user ? user.email : '';
      }).filter(email => email);

      await addDoc(collection(db, 'meetings'), {
        title,
        description: '',
        clientName,
        clientEmail: clientEmail || undefined,
        clientPhone: undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        status: 'pending',
        priority,
        notes: undefined,
        createdBy: currentUser.uid,
        sharedWith: sharedWithEmails.length > 0 ? sharedWithEmails : undefined,
        isPublic: isPublic,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      onSuccess();
    } catch (error: any) {
      setError('Error al crear la reunión: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Reunión</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          <p className="selected-date">
            📅 {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
          </p>
          
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Hora inicio:</label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">Hora fin:</label>
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
              <label htmlFor="priority">Prioridad:</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
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

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creando...' : 'Crear Reunión'}
              </button>
            </div>
          </form>
        </div>
      </div>
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