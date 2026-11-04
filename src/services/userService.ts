import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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

  // Compatibilidad con perfiles creados antes de la migración a IDs de documento = UID.
  // Si encuentra un perfil "legacy" (ID de documento aleatorio) lo reescribe en la
  // ubicación correcta (users/{uid}) para que las reglas de seguridad basadas en UID funcionen.
  private async getOrMigrateUserDoc(userId: string): Promise<User | null> {
    const directSnap = await getDoc(doc(db, 'users', userId));
    if (directSnap.exists()) {
      return directSnap.data() as User;
    }

    const legacySnapshot = await getDocs(
      query(collection(db, 'users'), where('id', '==', userId), limit(1))
    );

    if (legacySnapshot.empty) {
      return null;
    }

    const legacyDoc = legacySnapshot.docs[0];
    const legacyData = legacyDoc.data() as User;

    try {
      await setDoc(doc(db, 'users', userId), legacyData);
    } catch (error) {
      console.error('Error migrating legacy user profile:', error);
    }

    return legacyData;
  }

  // Verificar si el usuario actual es administrador
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const userData = await this.getOrMigrateUserDoc(userId);
      return Boolean(userData && userData.role === 'admin' && userData.isActive);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Indica si el sistema ya tiene al menos un usuario configurado.
  // Se usa para permitir la configuración del primer administrador una única vez.
  async hasAnyUser(): Promise<boolean> {
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), limit(1)));
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking existing users:', error);
      return true;
    }
  }

  // Crear perfil de usuario en Firestore (el ID del documento es el UID de Firebase Auth)
  async createUserProfile(userId: string, email: string, role: 'admin' | 'user' = 'user', createdBy?: string): Promise<void> {
    try {
      await setDoc(doc(db, 'users', userId), {
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

  // Normaliza perfiles creados con la antigua convención (ID de documento aleatorio)
  // reescribiéndolos en users/{uid}. Se ejecuta de forma perezosa desde el panel de admin.
  async migrateLegacyUserDocs(): Promise<void> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));

      for (const userDoc of usersSnapshot.docs) {
        const data = userDoc.data();
        const uid = data.id;
        if (!uid || userDoc.id === uid) continue;

        try {
          await setDoc(doc(db, 'users', uid), data, { merge: true });
          await deleteDoc(doc(db, 'users', userDoc.id));
        } catch (error) {
          console.error('Error migrating legacy user doc:', userDoc.id, error);
        }
      }
    } catch (error) {
      console.error('Error listing users for migration:', error);
    }
  }

  // Obtener todos los usuarios (solo para admins)
  async getAllUsers(): Promise<User[]> {
    try {
      await this.migrateLegacyUserDocs();

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
      const userData = await this.getOrMigrateUserDoc(userId);
      if (!userData) return null;
      const createdAt = userData.createdAt as unknown as { toDate?: () => Date };
      return {
        ...userData,
        createdAt: createdAt?.toDate ? createdAt.toDate() : (userData.createdAt as unknown as Date) || new Date()
      } as User;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Activar/desactivar usuario
  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isActive,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error('Error al actualizar el estado del usuario');
    }
  }

  // Cambiar rol de usuario
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error('Error al actualizar el rol del usuario');
    }
  }
}
