import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, deleteDoc, or, getDocs, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Task, User } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class TaskManagerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TaskManager Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Algo salió mal con el gestor de tareas</h2>
          <p>Se ha producido un error inesperado. Por favor, recarga la página.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Detalles del error (para desarrolladores)</summary>
            {this.state.error && this.state.error.toString()}
          </details>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="btn-primary"
            style={{ marginTop: '10px' }}
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'mine' | 'shared'>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Cargar tareas del usuario y tareas compartidas con él
    const tasksQuery = query(
      collection(db, 'tasks'),
      or(
        where('createdBy', '==', currentUser.uid),
        where('sharedWith', 'array-contains', currentUser.uid),
        where('isPublic', '==', true)
      )
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
    if (!currentUser) {
      setError('Usuario no autenticado');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Validaciones básicas
      if (!title.trim()) {
        setError('El título es requerido');
        setSubmitting(false);
        return;
      }

      // Convertir IDs de usuarios a emails con manejo de errores mejorado
      const sharedWithEmails = selectedUsers
        .map(userId => {
          try {
            if (!userId || typeof userId !== 'string') {
              console.warn('Invalid userId:', userId);
              return '';
            }
            const user = users.find(u => u && u.id === userId);
            return user && user.email ? user.email : '';
          } catch (e) {
            console.warn('Error finding user:', userId, e);
            return '';
          }
        })
        .filter(email => email && typeof email === 'string' && email.trim());
      
      const taskData: any = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'pending' as const,
        createdBy: currentUser.uid,
        isPublic: isPublic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Solo agregar campos opcionales si tienen valor válido
      if (dueDate && dueDate.trim()) {
        try {
          const dueDateObj = new Date(dueDate);
          if (!isNaN(dueDateObj.getTime())) {
            taskData.dueDate = dueDateObj;
          }
        } catch (e) {
          console.warn('Invalid date:', dueDate, e);
        }
      }
      
      if (category && category.trim()) {
        taskData.category = category.trim();
      }

      if (sharedWithEmails.length > 0) {
        taskData.sharedWith = sharedWithEmails;
      }

      console.log('Creating task with data:', taskData);
      await addDoc(collection(db, 'tasks'), taskData);
      console.log('Task created successfully');
      
      // Limpiar formulario
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setCategory('');
      setSelectedUsers([]);
      setIsPublic(false);
      setShowForm(false);
      
    } catch (error: any) {
      console.error('Error creating task:', error);
      setError('Error al crear la tarea: ' + (error.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed') => {
    try {
      setError('');
      setUpdating(taskId);
      
      await updateDoc(doc(db, 'tasks', taskId), {
        status,
        updatedAt: serverTimestamp()
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

  const shareTask = async (taskId: string, shareWithEmail: string) => {
    try {
      setError('');
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const currentShared = task.sharedWith || [];
      if (currentShared.includes(shareWithEmail)) {
        setError('Esta tarea ya está compartida con este usuario');
        return;
      }
      
      await updateDoc(doc(db, 'tasks', taskId), {
        sharedWith: [...currentShared, shareWithEmail],
        updatedAt: serverTimestamp()
      });
      
      setShowShareModal(null);
    } catch (error) {
      console.error('Error sharing task:', error);
      setError('Error al compartir la tarea');
    }
  };

  const unshareTask = async (taskId: string, unshareWithEmail: string) => {
    try {
      setError('');
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const currentShared = task.sharedWith || [];
      const newShared = currentShared.filter(email => email !== unshareWithEmail);
      
      await updateDoc(doc(db, 'tasks', taskId), {
        sharedWith: newShared.length > 0 ? newShared : undefined,
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error unsharing task:', error);
      setError('Error al dejar de compartir la tarea');
    }
  };

  const toggleTaskPublic = async (taskId: string) => {
    try {
      setError('');
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      await updateDoc(doc(db, 'tasks', taskId), {
        isPublic: !task.isPublic,
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error toggling task public status:', error);
      setError('Error al cambiar la visibilidad de la tarea');
    }
  };

  const startEditingTask = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate && task.dueDate instanceof Date ? format(task.dueDate, 'yyyy-MM-dd') : '');
    setPriority(task.priority);
    setCategory(task.category || '');
    
    // Convertir emails a IDs de usuarios
    const userIds = task.sharedWith ? task.sharedWith.map(email => {
      const user = users.find(u => u.email === email);
      return user ? user.id : '';
    }).filter(id => id) : [];
    setSelectedUsers(userIds);
    
    setIsPublic(task.isPublic || false);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !currentUser) {
      setError('No hay tarea para editar o usuario no autenticado');
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Validaciones básicas
      if (!title.trim()) {
        setError('El título es requerido');
        setSubmitting(false);
        return;
      }

      // Convertir IDs de usuarios a emails con manejo de errores mejorado
      const sharedWithEmails = selectedUsers
        .map(userId => {
          try {
            if (!userId || typeof userId !== 'string') {
              console.warn('Invalid userId:', userId);
              return '';
            }
            const user = users.find(u => u && u.id === userId);
            return user && user.email ? user.email : '';
          } catch (e) {
            console.warn('Error finding user:', userId, e);
            return '';
          }
        })
        .filter(email => email && typeof email === 'string' && email.trim());
      
      const taskData: any = {
        title: title.trim(),
        description: description.trim(),
        priority,
        isPublic: isPublic,
        updatedAt: serverTimestamp()
      };

      // Manejar dueDate: agregar si tiene valor válido, eliminar si está vacía
      if (dueDate && dueDate.trim()) {
        try {
          const dueDateObj = new Date(dueDate);
          if (!isNaN(dueDateObj.getTime())) {
            taskData.dueDate = dueDateObj;
          }
        } catch (e) {
          console.warn('Invalid date:', dueDate, e);
        }
      } else if (editingTask?.dueDate) {
        taskData.dueDate = deleteField();
      }

      // Manejar categoria: agregar si tiene valor, eliminar si está vacía
      if (category && category.trim()) {
        taskData.category = category.trim();
      } else if (editingTask?.category) {
        taskData.category = deleteField();
      }

      // Manejar sharedWith: agregar si hay usuarios, eliminar si no hay
      if (sharedWithEmails.length > 0) {
        taskData.sharedWith = sharedWithEmails;
      } else if (editingTask?.sharedWith) {
        taskData.sharedWith = deleteField();
      }

      console.log('Updating task with data:', taskData);
      await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
      console.log('Task updated successfully');
      
      // Limpiar formulario y cerrar modal
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setCategory('');
      setSelectedUsers([]);
      setIsPublic(false);
      setEditingTask(null);
      setShowEditModal(false);
      
    } catch (error: any) {
      console.error('Error updating task:', error);
      setError('Error al actualizar la tarea: ' + (error.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEditing = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setCategory('');
    setSelectedUsers([]);
    setIsPublic(false);
    setEditingTask(null);
    setShowEditModal(false);
    setError('');
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'mine':
        return tasks.filter(task => task.createdBy === currentUser?.uid);
      case 'shared':
        return tasks.filter(task => task.createdBy !== currentUser?.uid);
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

          <div className="sharing-section">
            <h4>Opciones de Compartir</h4>
            
            <UserSelector
              users={users}
              selectedUsers={selectedUsers}
              onSelectionChange={setSelectedUsers}
              label="Compartir con usuarios:"
              helperText="Opcional: Los usuarios seleccionados podrán ver y editar esta tarea"
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
          className={filter === 'mine' ? 'active' : ''}
          onClick={() => setFilter('mine')}
        >
          Mías ({tasks.filter(t => t.createdBy === currentUser?.uid).length})
        </button>
        <button 
          className={filter === 'shared' ? 'active' : ''}
          onClick={() => setFilter('shared')}
        >
          Compartidas ({tasks.filter(t => t.createdBy !== currentUser?.uid).length})
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
                    <strong>Vence:</strong> {task.dueDate instanceof Date ? format(task.dueDate, 'dd/MM/yyyy', { locale: es }) : 'Fecha inválida'}
                  </p>
                )}
                <p className="created-date">
                  Creada: {task.createdAt instanceof Date ? format(task.createdAt, 'dd/MM/yyyy', { locale: es }) : 'Fecha inválida'}
                  {task.createdBy !== currentUser?.uid && (
                    <span className="shared-indicator"> (Compartida)</span>
                  )}
                </p>
                {task.isPublic && (
                  <p className="public-indicator">🌐 Pública - Visible para todos</p>
                )}
                {task.sharedWith && task.sharedWith.length > 0 && (
                  <p className="shared-with">
                    👥 Compartida con: {task.sharedWith.join(', ')}
                  </p>
                )}
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
                      onClick={() => startEditingTask(task)}
                      className="btn-secondary"
                      title="Editar tarea"
                    >
                      ✏️ Editar
                    </button>

                    {task.createdBy === currentUser?.uid && (
                      <>
                        <button 
                          onClick={() => setShowShareModal(task.id)}
                          className="btn-info"
                          title="Gestionar compartir"
                        >
                          👥 Compartir
                        </button>
                        
                        <button 
                          onClick={() => toggleTaskPublic(task.id)}
                          className={task.isPublic ? "btn-warning" : "btn-info"}
                          title={task.isPublic ? "Hacer privada" : "Hacer pública"}
                        >
                          {task.isPublic ? "🔒 Hacer Privada" : "🌐 Hacer Pública"}
                        </button>
                      </>
                    )}
                    
                    {task.createdBy === currentUser?.uid && (
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="btn-danger"
                        title="Eliminar tarea"
                      >
                        🗑 Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showShareModal && (
        <ShareTaskModal 
          taskId={showShareModal}
          task={tasks.find(t => t.id === showShareModal)!}
          users={users}
          onClose={() => setShowShareModal(null)}
          onShare={shareTask}
          onUnshare={unshareTask}
        />
      )}

      {showEditModal && editingTask && (
        <div className="modal-overlay" onClick={cancelEditing}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Tarea</h2>
              <button onClick={cancelEditing} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              {error && <div className="error">{error}</div>}
              
              <form onSubmit={handleEditSubmit} className="task-form">
                <div className="form-group">
                  <label htmlFor="editTaskTitle">Título:</label>
                  <input
                    id="editTaskTitle"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="editTaskDescription">Descripción:</label>
                  <textarea
                    id="editTaskDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="editTaskDueDate">Fecha límite (opcional):</label>
                  <input
                    id="editTaskDueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="editTaskPriority">Prioridad:</label>
                  <select
                    id="editTaskPriority"
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
                  <label htmlFor="editTaskCategory">Categoría (opcional):</label>
                  <input
                    id="editTaskCategory"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ej: Trabajo, Personal, Proyecto..."
                  />
                </div>

                {editingTask.createdBy === currentUser?.uid && (
                  <div className="sharing-section">
                    <h4>Opciones de Compartir</h4>
                    
                    <UserSelector
                      users={users}
                      selectedUsers={selectedUsers}
                      onSelectionChange={setSelectedUsers}
                      label="Compartir con usuarios:"
                      helperText="Opcional: Los usuarios seleccionados podrán ver y editar esta tarea"
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
                    {submitting ? 'Actualizando...' : 'Actualizar Tarea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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

// Componente modal para gestionar el compartir de tareas
function ShareTaskModal({ 
  taskId, 
  task, 
  users,
  onClose, 
  onShare, 
  onUnshare 
}: { 
  taskId: string;
  task: Task;
  users: User[];
  onClose: () => void;
  onShare: (taskId: string, shareWithEmail: string) => void;
  onUnshare: (taskId: string, unshareWithEmail: string) => void;
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
        onShare(taskId, user.email);
      }
    });
    
    setSelectedNewUsers([]);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gestionar Compartir Tarea</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          <h3>"{task.title}"</h3>
          
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={handleShare} className="share-form">
            <UserSelector
              users={users.filter(user => !(task.sharedWith || []).includes(user.email))}
              selectedUsers={selectedNewUsers}
              onSelectionChange={setSelectedNewUsers}
              label="Agregar usuarios:"
              helperText="Selecciona los usuarios con los que quieres compartir esta tarea"
            />
            <button type="submit" className="btn-primary" disabled={selectedNewUsers.length === 0}>
              👥 Compartir con seleccionados
            </button>
          </form>

          {task.sharedWith && task.sharedWith.length > 0 && (
            <div className="shared-users-list">
              <h4>Compartida con:</h4>
              {task.sharedWith.map(email => (
                <div key={email} className="shared-user-item">
                  <span>{email}</span>
                  <button 
                    onClick={() => onUnshare(taskId, email)}
                    className="btn-danger btn-sm"
                    title="Dejar de compartir"
                  >
                    ✕ Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {(!task.sharedWith || task.sharedWith.length === 0) && (
            <div className="no-shared-users">
              Esta tarea no está compartida con ningún usuario.
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

export default function TaskManagerWithErrorBoundary() {
  return (
    <TaskManagerErrorBoundary>
      <TaskManager />
    </TaskManagerErrorBoundary>
  );
}