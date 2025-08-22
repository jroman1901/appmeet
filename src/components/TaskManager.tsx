import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('createdBy', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Task[];

      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading tasks:', error);
      setError('Error al cargar las tareas');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const taskData = {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        category: category || null,
        status: 'pending' as const,
        createdBy: currentUser?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'tasks'), taskData);
      
      // Limpiar formulario
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setCategory('');
      setShowForm(false);
      
    } catch (error: any) {
      console.error('Error creating task:', error);
      setError('Error al crear la tarea: ' + error.message);
    }

    setSubmitting(false);
  };

  const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed') => {
    try {
      setError('');
      setUpdating(taskId);
      
      await updateDoc(doc(db, 'tasks', taskId), {
        status,
        updatedAt: new Date()
      });
      
      setTimeout(() => {
        setUpdating(null);
      }, 1000);
      
    } catch (error) {
      console.error('Error updating task status:', error);
      setError('Error al actualizar el estado de la tarea');
      setUpdating(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.')) {
      try {
        setError('');
        setUpdating(taskId);
        
        await deleteDoc(doc(db, 'tasks', taskId));
        
        setUpdating(null);
        
      } catch (error) {
        console.error('Error deleting task:', error);
        setError('Error al eliminar la tarea');
        setUpdating(null);
      }
    }
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      default:
        return tasks;
    }
  };

  if (loading) {
    return <div className="loading">Cargando tus tareas...</div>;
  }

  return (
    <div className="task-manager">
      <div className="task-header">
        <h2>Gestión de Tareas</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancelar' : 'Nueva Tarea'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="taskTitle">Título:</label>
            <input
              id="taskTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="taskDescription">Descripción:</label>
            <textarea
              id="taskDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="taskDueDate">Fecha límite (opcional):</label>
            <input
              id="taskDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="taskPriority">Prioridad:</label>
            <select
              id="taskPriority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              required
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="taskCategory">Categoría (opcional):</label>
            <input
              id="taskCategory"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Trabajo, Personal, Proyecto..."
            />
          </div>
          
          <button 
            type="submit" 
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Creando...' : 'Crear Tarea'}
          </button>
        </form>
      )}

      <div className="filter-buttons">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Todas ({tasks.length})
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pendientes ({tasks.filter(t => t.status === 'pending').length})
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completadas ({tasks.filter(t => t.status === 'completed').length})
        </button>
      </div>

      {getFilteredTasks().length === 0 ? (
        <p>No hay tareas que coincidan con el filtro seleccionado.</p>
      ) : (
        <div className="tasks-list">
          {getFilteredTasks().map(task => (
            <div key={task.id} className={`task-card ${task.status}`}>
              <div className="task-content">
                <div className="task-title-row">
                  <h3>{task.title}</h3>
                  <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
                {task.description && <p>{task.description}</p>}
                {task.category && (
                  <p className="task-category">
                    <strong>Categoría:</strong> {task.category}
                  </p>
                )}
                {task.dueDate && (
                  <p className="due-date">
                    <strong>Vence:</strong> {format(task.dueDate, 'dd/MM/yyyy', { locale: es })}
                  </p>
                )}
                <p className="created-date">
                  Creada: {format(task.createdAt, 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
              
              <div className="task-actions">
                <span className={`status-badge ${task.status}`}>
                  {task.status === 'pending' ? 'Pendiente' : 'Completada'}
                </span>
                
                {updating === task.id ? (
                  <div className="updating-message">
                    ✓ Actualizando...
                  </div>
                ) : (
                  <div className="action-buttons">
                    {task.status === 'pending' ? (
                      <button 
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="btn-success"
                        title="Marcar como completada"
                      >
                        ✅ Completar
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateTaskStatus(task.id, 'pending')}
                        className="btn-secondary"
                        title="Reabrir tarea"
                      >
                        🔄 Reabrir
                      </button>
                    )}
                    
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="btn-danger"
                      title="Eliminar tarea"
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}