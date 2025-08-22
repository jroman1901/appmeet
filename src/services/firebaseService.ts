import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Meeting, Task } from '../types';

export class FirebaseService {
  private static instance: FirebaseService;

  private constructor() {}

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  // Meeting operations
  async createMeeting(meetingData: Partial<Meeting>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'meetings'), {
        ...meetingData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw new Error('Error al crear la reunión');
    }
  }

  async updateMeeting(meetingId: string, updateData: Partial<Meeting>): Promise<void> {
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw new Error('Error al actualizar la reunión');
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw new Error('Error al eliminar la reunión');
    }
  }

  subscribeToUserMeetings(userId: string, callback: (meetings: Meeting[]) => void): () => void {
    const meetingsQuery = query(
      collection(db, 'meetings'),
      where('createdBy', '==', userId),
      orderBy('startTime', 'desc')
    );

    return onSnapshot(meetingsQuery, (snapshot) => {
      const meetings = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Meeting;
      });
      callback(meetings);
    }, (error) => {
      console.error('Error fetching meetings:', error);
    });
  }

  // Task operations
  async createTask(taskData: Partial<Task>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Error al crear la tarea');
    }
  }

  async updateTask(taskId: string, updateData: Partial<Task>): Promise<void> {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Error al actualizar la tarea');
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Error al eliminar la tarea');
    }
  }

  subscribeToUserTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dueDate: data.dueDate?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Task;
      });
      callback(tasks);
    }, (error) => {
      console.error('Error fetching tasks:', error);
    });
  }

  // Analytics and statistics
  async getUserStats(userId: string): Promise<{
    totalMeetings: number;
    pendingMeetings: number;
    completedMeetings: number;
    overdueMeetings: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
  }> {
    try {
      const [meetingsSnapshot, tasksSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'meetings'), where('createdBy', '==', userId))),
        getDocs(query(collection(db, 'tasks'), where('createdBy', '==', userId)))
      ]);

      const meetings = meetingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime || new Date())
        };
      }) as Meeting[];

      const tasks = tasksSnapshot.docs.map(doc => doc.data()) as Task[];

      const now = new Date();
      const pendingMeetings = meetings.filter(m => m.status === 'pending' && m.startTime > now).length;
      const overdueMeetings = meetings.filter(m => m.status === 'pending' && m.startTime <= now).length;
      const completedMeetings = meetings.filter(m => m.status === 'completed').length;

      return {
        totalMeetings: meetings.length,
        pendingMeetings,
        completedMeetings,
        overdueMeetings,
        totalTasks: tasks.length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        completedTasks: tasks.filter(t => t.status === 'completed').length
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalMeetings: 0,
        pendingMeetings: 0,
        completedMeetings: 0,
        overdueMeetings: 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0
      };
    }
  }

  // Utility functions
  async getTasksForMeeting(meetingId: string): Promise<Task[]> {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'tasks'), where('relatedMeetingId', '==', meetingId))
      );
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Task[];
    } catch (error) {
      console.error('Error fetching meeting tasks:', error);
      return [];
    }
  }

  async updateOverdueMeetings(userId: string): Promise<void> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'meetings'), 
          where('createdBy', '==', userId),
          where('status', '==', 'pending')
        )
      );

      const now = new Date();
      const batch = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Handle both Timestamp and Date objects
        const startTime = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
        
        if (startTime < now) {
          batch.push(
            updateDoc(doc(db, 'meetings', docSnap.id), {
              status: 'overdue',
              updatedAt: serverTimestamp()
            })
          );
        }
      }

      await Promise.all(batch);
    } catch (error) {
      console.error('Error updating overdue meetings:', error);
    }
  }
}