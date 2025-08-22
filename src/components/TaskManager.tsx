import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    console.log('TaskManager: Iniciando carga de tareas para usuario:', currentUser.uid);
    
    // Por ahora, solo inicializamos sin listener para evitar errores de Firestore
    const loadInitialTasks = async () => {
      try {
        console.log('TaskManager: Carga básica completada');
        setTasks([]); // Iniciar vacío por ahora
        setLoading(false);
      } catch (error) {
        console.error('TaskManager: Error cargando tareas:', error);
        setLoading(false);
      }
    };

    loadInitialTasks();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      console.log('TaskManager: Creando nueva tarea directamente en Firestore...');
      
      const taskData = {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        category: category || null,
        status: 'pending',
        createdBy: currentUser?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('TaskManager: Datos de la tarea:', taskData);
      
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      
      console.log('TaskManager: Tarea creada exitosamente con ID:', docRef.id);
      
      // Agregar la nueva tarea a la lista local
      const newTask = {
        id: docRef.id,
        ...taskData,
        dueDate: taskData.dueDate,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Task;
      
      setTasks([newTask, ...tasks]);
      
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setCategory('');
      setShowForm(false);
      
      alert('¡Tarea creada exitosamente!');
      
    } catch (error: any) {
      console.error('TaskManager: Error creando tarea:', error);
      alert('Error al crear la tarea: ' + error.message);
    }

    setSubmitting(false);
  };

  const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed') => {
    try {
      // Por ahora, solo actualizar localmente
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status } : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.')) {
      try {
        // Por ahora, solo eliminar localmente
        setTasks(tasks.filter(task => task.id !== taskId));
      } catch (error) {
        console.error('Error deleting task:', error);
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
                
                <div className="action-buttons">
                  {task.status === 'pending' ? (
                    <button 
                      onClick={() => updateTaskStatus(task.id, 'completed')}
                      className="btn-success"
                    >
                      ✓ Completar
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateTaskStatus(task.id, 'pending')}
                      className="btn-secondary"
                    >
                      ↻ Reabrir
                    </button>
                  )}
                  
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="btn-danger"
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}