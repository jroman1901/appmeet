import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { User } from '../types';

export class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // Verificar si el usuario actual es administrador
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const userQuery = query(
        collection(db, 'users'), 
        where('id', '==', userId)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data() as User;
        return userData.role === 'admin' && userData.isActive;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Crear perfil de usuario en Firestore
  async createUserProfile(userId: string, email: string, role: 'admin' | 'user' = 'user', createdBy?: string): Promise<void> {
    try {
      await addDoc(collection(db, 'users'), {
        id: userId,
        email,
        role,
        createdAt: serverTimestamp(),
        createdBy,
        isActive: true
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Error al crear el perfil de usuario');
    }
  }

  // Crear nuevo usuario (solo para admins)
  async createUser(email: string, password: string, role: 'admin' | 'user' = 'user', createdByUserId: string): Promise<string> {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Crear perfil en Firestore
      await this.createUserProfile(newUser.uid, email, role, createdByUserId);

      return newUser.uid;
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let mensajeError = 'Error al crear el usuario';
      switch (error.code) {
        case 'auth/email-already-in-use':
          mensajeError = 'Ya existe un usuario con este correo electrónico';
          break;
        case 'auth/invalid-email':
          mensajeError = 'El correo electrónico no es válido';
          break;
        case 'auth/weak-password':
          mensajeError = 'La contraseña debe tener al menos 6 caracteres';
          break;
        default:
          mensajeError = 'Error al crear el usuario: ' + error.message;
      }
      
      throw new Error(mensajeError);
    }
  }

  // Obtener todos los usuarios (solo para admins)
  async getAllUsers(): Promise<User[]> {
    try {
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), orderBy('createdAt', 'desc'))
      );

      return usersSnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Obtener perfil de usuario
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const userQuery = query(
        collection(db, 'users'), 
        where('id', '==', userId)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        return {
          ...userData,
          createdAt: userData.createdAt?.toDate() || new Date()
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Activar/desactivar usuario
  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      const userQuery = query(
        collection(db, 'users'), 
        where('id', '==', userId)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDocId = userSnapshot.docs[0].id;
        await updateDoc(doc(db, 'users', userDocId), {
          isActive,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error('Error al actualizar el estado del usuario');
    }
  }

  // Cambiar rol de usuario
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    try {
      const userQuery = query(
        collection(db, 'users'), 
        where('id', '==', userId)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDocId = userSnapshot.docs[0].id;
        await updateDoc(doc(db, 'users', userDocId), {
          role,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error('Error al actualizar el rol del usuario');
    }
  }
}