import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      let mensajeError = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          mensajeError = 'No existe una cuenta con este correo electrónico';
          break;
        case 'auth/wrong-password':
          mensajeError = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          mensajeError = 'El correo electrónico no es válido';
          break;
        case 'auth/user-disabled':
          mensajeError = 'Esta cuenta ha sido desactivada';
          break;
        case 'auth/too-many-requests':
          mensajeError = 'Demasiados intentos fallidos. Intenta más tarde';
          break;
        case 'auth/network-request-failed':
          mensajeError = 'Error de conexión. Verifica tu internet';
          break;
        default:
          mensajeError = 'Error al iniciar sesión. Verifica tus credenciales';
      }
      
      throw new Error(mensajeError);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      let mensajeError = 'Error al crear la cuenta';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          mensajeError = 'Ya existe una cuenta con este correo electrónico';
          break;
        case 'auth/invalid-email':
          mensajeError = 'El correo electrónico no es válido';
          break;
        case 'auth/operation-not-allowed':
          mensajeError = 'El registro con email/contraseña no está habilitado';
          break;
        case 'auth/weak-password':
          mensajeError = 'La contraseña debe tener al menos 6 caracteres';
          break;
        case 'auth/network-request-failed':
          mensajeError = 'Error de conexión. Verifica tu internet';
          break;
        default:
          mensajeError = 'Error al crear la cuenta. Intenta nuevamente';
      }
      
      throw new Error(mensajeError);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}